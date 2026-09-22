/**
 * Motor de optimización: heurística determinista de docs/arquitectura.md §6.
 *
 * Objetivo (formulación MILP): min Σ costo(e,p,d)·x + M·Σ u[i,h] + λ·Σ o[i]
 *   costo = horas × tarifa del puesto (+ prima dominical si d es domingo)
 *   u[i,h] = déficit por intervalo y habilidad (M ≫ λ: cubrir domina)
 *   o[i]   = exceso total por intervalo, valuado como en resumir_escenario
 *            (λ = tarifa media ponderada × 0.5 h por intervalo excedido).
 *
 * Reglas duras (nunca se violan): 1 turno por empleado-día; Σ horas ≤ tope
 * y ≤ max_horas_semana; horas por día ≤ max_horas_dia; ≤ max_dias_semana
 * días; ≥ descanso_entre_turnos_horas entre turnos; ventanas de
 * disponibilidad; habilidad del rol cubierto en las del empleado; sin traslapes.
 *
 * Fases:
 *   1. Construcción voraz: mientras exista déficit, elegir la (día, plantilla,
 *      habilidad) con mayor score = (déficit ponderado cubierto − 0.1·exceso)
 *      / (horas + K) (picos pesan PESO_PICO) y asignarla al empleado elegible
 *      más barato (tarifa, +prima en domingo), prefiriendo puesto = habilidad,
 *      continuidad (misma plantilla que el día anterior) y menos horas
 *      acumuladas. K controla el recurso escaso: K = 0 favorece turnos cortos
 *      (escasean horas), K = ∞ favorece turnos que cubren más déficit
 *      (escasean empleados-día por la regla de 1 turno/día). Se ejecuta con
 *      varios K (multi-arranque determinista) y se conserva la mejor solución
 *      por objetivo. La mitad de los arranques usa "reserva": primero se
 *      cubren los picos día por día (días de mayor requerimiento pico
 *      primero) y al elegir empleado se penaliza consumir el último día u
 *      hora útil de alguien que aún podría cubrir un pico pendiente otro día.
 *   2. Búsqueda local, hasta no mejorar o agotar el presupuesto de tiempo:
 *      a) eliminar turnos cuya retirada no crea ningún déficit;
 *      b) mover cada turno a otra (plantilla, empleado, habilidad) del mismo
 *         día, o a otro (día, plantilla, habilidad) del mismo empleado, si
 *         reduce M·déficit + costo + λ·sobrestaffing;
 *      c) re-ejecutar la construcción voraz por si la reorganización liberó
 *         capacidad para déficit pendiente.
 *   3. El déficit que queda sin empleados elegibles se reporta como
 *      `vacantes` (horas-turno sin cubrir).
 *
 * Al final se re-validan todas las reglas duras con `validarReglasDuras`
 * (código independiente del estado incremental) y se lanza error si algo falla.
 */

import type {
  Asignacion,
  Catalogo,
  DemandaFila,
  Empleado,
  PlantillaTurno,
  ReglasLaborales,
  ResultadoOptimizacion,
  Sucursal,
} from './tipos';
import {
  horasDeDuracion,
  tarifasPorEmpleado,
  validarReglasDuras,
  type TarifaEmpleado,
} from './reglas';
import { MS_DIA, MS_MIN, fechaAMs, hhmmAMin, isoAMs, msAIso, msAMinDia } from './tiempo';

export interface EntradaOptimizacion {
  sucursal: Sucursal;
  semana: string;
  empleados: Empleado[];
  plantillas: PlantillaTurno[];
  reglas: ReglasLaborales;
  demanda: DemandaFila[];
  catalogo: Catalogo;
  /** Tope del escenario (default reglas.tope_semanal). */
  tope_semanal?: number;
  /** Presupuesto de tiempo en ms para la búsqueda local (default 3000). */
  presupuesto_ms?: number;
  /** Tarifas ya resueltas (opcional; si no, se calculan del catálogo). */
  tarifas?: Map<string, TarifaEmpleado>;
}

const PESO_PICO = 50; // peso de un intervalo pico frente a uno normal en la fase voraz
const M_DEFICIT = 1e7; // penalización por intervalo-habilidad en déficit (M ≫ λ)
const EPS = 1e-6;
/**
 * Configuraciones del multi-arranque: K = horas "virtuales" sumadas al
 * denominador del score voraz; reservar = fase previa por días de mayor
 * requerimiento pico + penalización por consumir el último día/hora útil de un
 * empleado que aún podría cubrir un pico pendiente en otro día.
 */
const ARRANQUES: Array<{ K: number; reservar: boolean }> = [
  { K: 0, reservar: false }, { K: 4, reservar: false }, { K: 8, reservar: false }, { K: 1e9, reservar: false },
  { K: 0, reservar: true }, { K: 4, reservar: true }, { K: 8, reservar: true }, { K: 1e9, reservar: true },
];

interface Plantilla {
  idx: number;
  clave: string;
  inicioMin: number; // minutos desde medianoche
  duracionMin: number;
  descansoMin: number;
  horas: number;
  slots: number[]; // índices de intervalo dentro del día (0..S-1) que cubre
}

interface Emp {
  idx: number;
  clave: string;
  tarifa: number;
  primaPct: number;
  maxHoras: number;
  habilidades: Set<string>;
  habilidadPuesto: string;
  /** dow (1..7) → ventanas [ini, fin] en minutos; undefined = sin restricción. */
  ventanas: Map<number, Array<[number, number]>> | null;
}

interface Turno {
  e: number;
  d: number;
  p: number;
  h: number;
}

export function optimizar(entrada: EntradaOptimizacion): ResultadoOptimizacion {
  const t0 = Date.now();
  const presupuesto = entrada.presupuesto_ms ?? 3000;
  const { reglas, demanda, sucursal } = entrada;
  const tope = Math.min(entrada.tope_semanal ?? reglas.tope_semanal, reglas.tope_semanal);
  const apertura = hhmmAMin(sucursal.apertura);
  const cierre = hhmmAMin(sucursal.cierre);
  const S = Math.round((cierre - apertura) / 30);
  const N = 7 * S;
  const inicioSemana = fechaAMs(entrada.semana);

  // ---- Demanda por habilidad --------------------------------------------
  const habilidades = [...new Set(demanda.flatMap((d) => Object.keys(d.requerido_por_habilidad)))].sort();
  const hIdx = new Map(habilidades.map((h, i) => [h, i]));
  const H = habilidades.length;
  const reqH: Int32Array[] = habilidades.map(() => new Int32Array(N));
  const reqTot = new Int32Array(N);
  const esPico = new Uint8Array(N);
  const pesoSlot = new Float64Array(N);
  for (const d of demanda) {
    const ms = isoAMs(d.inicio);
    const dia = Math.floor((ms - inicioSemana) / MS_DIA);
    const slot = Math.round((msAMinDia(ms) - apertura) / 30);
    if (dia < 0 || dia > 6 || slot < 0 || slot >= S) continue;
    const i = dia * S + slot;
    for (const [h, n] of Object.entries(d.requerido_por_habilidad)) reqH[hIdx.get(h)!][i] = n;
    reqTot[i] = d.requerido_total;
    esPico[i] = d.es_pico ? 1 : 0;
    pesoSlot[i] = d.es_pico ? PESO_PICO : 1;
  }

  // ---- Plantillas ---------------------------------------------------------
  const plantillas: Plantilla[] = [];
  for (const p of [...entrada.plantillas].sort((a, b) => (a.clave < b.clave ? -1 : 1))) {
    const inicioMin = hhmmAMin(p.hora_inicio);
    const horas = horasDeDuracion(p.duracion_min, p.descanso_min);
    if (horas <= 0 || horas > reglas.max_horas_dia + EPS) continue;
    const slots: number[] = [];
    for (let m = inicioMin; m < inicioMin + p.duracion_min; m += 30) {
      const s = Math.floor((m - apertura) / 30);
      if (s >= 0 && s < S && (m - apertura) % 30 === 0) slots.push(s);
    }
    if (slots.length === 0) continue;
    plantillas.push({ idx: plantillas.length, clave: p.clave, inicioMin, duracionMin: p.duracion_min, descansoMin: p.descanso_min, horas, slots });
  }
  if (plantillas.length === 0) throw new Error('Sin plantillas de turno utilizables');

  // ---- Empleados ----------------------------------------------------------
  const tarifas = entrada.tarifas ?? tarifasPorEmpleado(entrada.catalogo, entrada.empleados, entrada.semana);
  const puestoHab = new Map(entrada.catalogo.puestos.map((p) => [p.clave, p.habilidad_clave]));
  const emps: Emp[] = [];
  for (const e of [...entrada.empleados].sort((a, b) => (a.clave_externa < b.clave_externa ? -1 : 1))) {
    if (e.sucursal_clave !== sucursal.clave) continue;
    const t = tarifas.get(e.clave_externa)!;
    let ventanas: Emp['ventanas'] = null;
    if (e.disponibilidad.length > 0) {
      ventanas = new Map();
      for (const w of e.disponibilidad) {
        const arr = ventanas.get(w.dia_semana) ?? [];
        arr.push([hhmmAMin(w.hora_inicio), hhmmAMin(w.hora_fin)]);
        ventanas.set(w.dia_semana, arr);
      }
    }
    emps.push({
      idx: emps.length,
      clave: e.clave_externa,
      tarifa: t.salario_hora,
      primaPct: reglas.prima_dominical_pct, // como v_costo_empleado_semana (reglas, no tabulador)
      maxHoras: Math.min(tope, e.max_horas_semana),
      habilidades: new Set(e.habilidades),
      habilidadPuesto: puestoHab.get(e.puesto_clave) ?? '',
      ventanas,
    });
  }
  const E = emps.length;

  const minHorasPlantilla = Math.min(...plantillas.map((p) => p.horas));
  // Requerimiento pico total por día (orden de la fase previa por días).
  const picoPorDia = new Array<number>(7).fill(0);
  for (let i = 0; i < N; i++) if (esPico[i]) for (let h = 0; h < H; h++) picoPorDia[Math.floor(i / S)] += reqH[h][i];
  const diasPorPico = [0, 1, 2, 3, 4, 5, 6].sort((a, b) => picoPorDia[b] - picoPorDia[a] || a - b);

  const ejecutar = (K: number, reservar: boolean, presupuestoLocal: number): { objetivo: number; turnos: Turno[]; iterGreedy: number; iterLocal: number; mejoras: number } => {
  const tLocal0 = Date.now();
  // ---- Estado incremental -------------------------------------------------
  const covH: Int32Array[] = habilidades.map(() => new Int32Array(N));
  const covTot = new Int32Array(N);
  const turnoDia: (Turno | null)[][] = emps.map(() => new Array<Turno | null>(7).fill(null));
  const horasEmp = new Float64Array(E);
  const diasEmp = new Int32Array(E);
  const descansoMin = reglas.descanso_entre_turnos_horas * 60;

  const costoTurno = (e: number, d: number, p: number): number => {
    const emp = emps[e];
    const factor = d === 6 ? 1 + emp.primaPct / 100 : 1;
    return plantillas[p].horas * emp.tarifa * factor;
  };

  /** Reglas (a)–(f) para añadir la plantilla p el día d al empleado e cubriendo h. */
  const elegible = (e: number, d: number, p: number, h: number): boolean => {
    const emp = emps[e];
    const pl = plantillas[p];
    if (!emp.habilidades.has(habilidades[h])) return false;
    if (turnoDia[e][d]) return false; // (a) un turno por día, sin traslapes
    if (diasEmp[e] + 1 > reglas.max_dias_semana) return false; // (c)
    if (horasEmp[e] + pl.horas > emp.maxHoras + EPS) return false; // (b)
    if (pl.horas > reglas.max_horas_dia + EPS) return false;
    if (emp.ventanas) {
      // (e) disponibilidad
      const v = emp.ventanas.get(d + 1);
      if (!v) return false;
      const fin = pl.inicioMin + pl.duracionMin;
      if (!v.some(([a, b]) => a <= pl.inicioMin && b >= fin)) return false;
    }
    // (d) descanso con el día anterior y el siguiente
    const prev = d > 0 ? turnoDia[e][d - 1] : null;
    if (prev) {
      const finPrev = plantillas[prev.p].inicioMin + plantillas[prev.p].duracionMin;
      if (1440 - finPrev + pl.inicioMin < descansoMin) return false;
    }
    const next = d < 6 ? turnoDia[e][d + 1] : null;
    if (next) {
      const fin = pl.inicioMin + pl.duracionMin;
      if (1440 - fin + plantillas[next.p].inicioMin < descansoMin) return false;
    }
    return true;
  };

  const agregar = (t: Turno): void => {
    const pl = plantillas[t.p];
    turnoDia[t.e][t.d] = t;
    horasEmp[t.e] += pl.horas;
    diasEmp[t.e] += 1;
    const base = t.d * S;
    for (const s of pl.slots) {
      covH[t.h][base + s] += 1;
      covTot[base + s] += 1;
    }
  };
  const quitar = (t: Turno): void => {
    const pl = plantillas[t.p];
    turnoDia[t.e][t.d] = null;
    horasEmp[t.e] -= pl.horas;
    diasEmp[t.e] -= 1;
    const base = t.d * S;
    for (const s of pl.slots) {
      covH[t.h][base + s] -= 1;
      covTot[base + s] -= 1;
    }
  };

  /** Tarifa media ponderada por horas del estado actual (λ del sobrestaffing). */
  const tarifaMedia = (): number => {
    let sh = 0;
    let st = 0;
    for (let e = 0; e < E; e++) {
      sh += horasEmp[e];
      st += horasEmp[e] * emps[e].tarifa;
    }
    return sh > 0 ? st / sh : 0;
  };

  /**
   * Δ del objetivo al AÑADIR (d,p,h) sobre el estado actual, sin el costo del
   * empleado: −M·(déficit cubierto ponderado) + λ·(intervalos que pasan a exceso).
   */
  const deltaAgregar = (d: number, p: number, h: number, lambda: number): number => {
    const base = d * S;
    let delta = 0;
    for (const s of plantillas[p].slots) {
      const i = base + s;
      if (covH[h][i] < reqH[h][i]) delta -= M_DEFICIT * pesoSlot[i];
      if (covTot[i] >= reqTot[i]) delta += lambda;
    }
    return delta;
  };
  /** Δ del objetivo al QUITAR un turno presente (sin el costo del empleado). */
  const deltaQuitar = (t: Turno, lambda: number): number => {
    const base = t.d * S;
    let delta = 0;
    for (const s of plantillas[t.p].slots) {
      const i = base + s;
      if (covH[t.h][i] <= reqH[t.h][i]) delta += M_DEFICIT * pesoSlot[i];
      if (covTot[i] > reqTot[i]) delta -= lambda;
    }
    return delta;
  };

  /** pendientePico[d][h]: queda déficit pico de la habilidad h el día d. */
  const pendientesPico = (): boolean[][] => {
    const out: boolean[][] = [];
    for (let d = 0; d < 7; d++) {
      const fila = new Array<boolean>(H).fill(false);
      for (let s = 0; s < S; s++) {
        const i = d * S + s;
        if (!esPico[i]) continue;
        for (let h = 0; h < H; h++) if (covH[h][i] < reqH[h][i]) fila[h] = true;
      }
      out.push(fila);
    }
    return out;
  };

  /**
   * Penalización de reserva: 1 si dar este turno a e agota su último día (o
   * sus horas útiles) y e todavía podría cubrir un pico pendiente otro día.
   */
  const penalReserva = (e: number, d: number, p: number, pend: boolean[][]): number => {
    const emp = emps[e];
    const agota = diasEmp[e] + 1 >= reglas.max_dias_semana || horasEmp[e] + plantillas[p].horas + minHorasPlantilla > emp.maxHoras + EPS;
    if (!agota) return 0;
    for (let d2 = 0; d2 < 7; d2++) {
      if (d2 === d || turnoDia[e][d2]) continue;
      if (emp.ventanas && !emp.ventanas.has(d2 + 1)) continue;
      for (let h2 = 0; h2 < H; h2++) if (pend[d2][h2] && emp.habilidades.has(habilidades[h2])) return 1;
    }
    return 0;
  };

  const seleccionarEmpleado = (d: number, p: number, h: number): number => {
    let mejor = -1;
    let mejorClave: number[] | null = null;
    const pend = reservar ? pendientesPico() : null;
    for (let e = 0; e < E; e++) {
      if (!elegible(e, d, p, h)) continue;
      const emp = emps[e];
      const prev = d > 0 ? turnoDia[e][d - 1] : null;
      const next = d < 6 ? turnoDia[e][d + 1] : null;
      const continuidad = (prev && prev.p === p) || (next && next.p === p) ? 0 : 1;
      const clave = [
        pend ? penalReserva(e, d, p, pend) : 0,
        emp.habilidadPuesto === habilidades[h] ? 0 : 1,
        costoTurno(e, d, p),
        continuidad,
        horasEmp[e],
      ];
      let menor = !mejorClave;
      if (mejorClave) {
        for (let k = 0; k < clave.length; k++) {
          if (Math.abs(clave[k] - mejorClave[k]) <= EPS) continue;
          menor = clave[k] < mejorClave[k];
          break;
        }
      }
      if (menor) {
        mejor = e;
        mejorClave = clave;
      }
    }
    return mejor;
  };

  // ---- Fase 1: construcción voraz -----------------------------------------
  let iterGreedy = 0;
  /**
   * Construcción voraz. Con `soloPicoDia` sólo considera ese día y sólo
   * cuenta como ganancia el déficit en intervalos pico (fase de reserva).
   */
  const voraz = (soloPicoDia: number | null = null): number => {
    let agregados = 0;
    const bloqueados = new Set<number>(); // (d,p,h) sin empleado elegible
    const dias = soloPicoDia === null ? [0, 1, 2, 3, 4, 5, 6] : [soloPicoDia];
    for (;;) {
      let mejorScore = 0;
      let mejor: [number, number, number] | null = null;
      for (const d of dias) {
        const base = d * S;
        for (const pl of plantillas) {
          for (let h = 0; h < H; h++) {
            const clave = (d * plantillas.length + pl.idx) * H + h;
            if (bloqueados.has(clave)) continue;
            let ganancia = 0;
            let exceso = 0;
            for (const s of pl.slots) {
              const i = base + s;
              if (covH[h][i] < reqH[h][i]) {
                if (soloPicoDia === null || esPico[i]) ganancia += pesoSlot[i];
              } else exceso += 1;
            }
            if (ganancia <= 0) continue;
            const score = (ganancia - 0.1 * exceso) / (pl.horas + K);
            if (score > mejorScore + EPS) {
              mejorScore = score;
              mejor = [d, pl.idx, h];
            }
          }
        }
      }
      if (!mejor) break;
      const [d, p, h] = mejor;
      iterGreedy += 1;
      const e = seleccionarEmpleado(d, p, h);
      if (e < 0) {
        bloqueados.add((d * plantillas.length + p) * H + h);
        continue;
      }
      agregar({ e, d, p, h });
      agregados += 1;
    }
    return agregados;
  };

  if (reservar) {
    // Fase previa: picos de los días más exigentes primero (reserva empleados-día).
    for (const d of diasPorPico) voraz(d);
  }
  voraz();

  // ---- Fase 2: búsqueda local ---------------------------------------------
  let iterLocal = 0;
  let mejoras = 0;
  const hayTiempo = (): boolean => Date.now() - tLocal0 < presupuestoLocal;

  const listaTurnos = (): Turno[] => {
    const out: Turno[] = [];
    for (let e = 0; e < E; e++) for (let d = 0; d < 7; d++) if (turnoDia[e][d]) out.push(turnoDia[e][d]!);
    return out;
  };

  /** a) Eliminar turnos cuya retirada no crea déficit (más caros primero). */
  const pasoEliminar = (lambda: number): number => {
    let n = 0;
    const turnos = listaTurnos().sort((a, b) => costoTurno(b.e, b.d, b.p) - costoTurno(a.e, a.d, a.p) || a.e - b.e || a.d - b.d);
    for (const t of turnos) {
      iterLocal += 1;
      const delta = deltaQuitar(t, lambda) - costoTurno(t.e, t.d, t.p);
      if (delta < -EPS) {
        quitar(t);
        n += 1;
      }
    }
    return n;
  };

  /** b) Mover cada turno a la mejor (empleado, plantilla) del mismo día. */
  const pasoMover = (lambda: number): number => {
    let n = 0;
    for (const t of listaTurnos()) {
      if (!hayTiempo()) break;
      if (turnoDia[t.e][t.d] !== t) continue;
      iterLocal += 1;
      quitar(t);
      // Con t fuera, el Δ de poner (e',p') es deltaAgregar(e',p') + costo(e',p');
      // se acepta el mínimo si mejora estrictamente a volver a poner t tal cual.
      let mejor: Turno | null = null;
      let mejorVal = deltaAgregar(t.d, t.p, t.h, lambda) + costoTurno(t.e, t.d, t.p);
      for (const pl of plantillas) {
        for (let h2 = 0; h2 < H; h2++) {
          // Mismo día, cualquier empleado elegible (puede cambiar la habilidad cubierta).
          const dAgr = deltaAgregar(t.d, pl.idx, h2, lambda);
          if (dAgr < mejorVal - EPS) {
            for (let e = 0; e < E; e++) {
              const val = dAgr + costoTurno(e, t.d, pl.idx);
              if (val >= mejorVal - EPS) continue;
              if (!elegible(e, t.d, pl.idx, h2)) continue;
              mejorVal = val;
              mejor = { e, d: t.d, p: pl.idx, h: h2 };
            }
          }
          // Otro día, mismo empleado (mueve su día de descanso).
          if (!emps[t.e].habilidades.has(habilidades[h2])) continue;
          for (let d2 = 0; d2 < 7; d2++) {
            if (d2 === t.d) continue;
            const val = deltaAgregar(d2, pl.idx, h2, lambda) + costoTurno(t.e, d2, pl.idx);
            if (val >= mejorVal - EPS) continue;
            if (!elegible(t.e, d2, pl.idx, h2)) continue;
            mejorVal = val;
            mejor = { e: t.e, d: d2, p: pl.idx, h: h2 };
          }
        }
      }
      if (mejor) {
        agregar(mejor);
        mejoras += 1;
        n += 1;
      } else {
        agregar(t);
      }
    }
    return n;
  };

  for (let ronda = 0; ronda < 50 && hayTiempo(); ronda++) {
    const lambda = tarifaMedia() * 0.5;
    let cambios = 0;
    cambios += pasoEliminar(lambda);
    cambios += pasoMover(lambda);
    cambios += voraz();
    if (cambios === 0) break;
  }
  // Barrido final de eliminación (garantiza que ningún turno sea totalmente redundante).
  pasoEliminar(tarifaMedia() * 0.5);

  // ---- Objetivo de la solución: M·déficit ponderado + costo + λ·exceso ----
  let objetivo = 0;
  const lambdaFinal = tarifaMedia() * 0.5;
  for (let i = 0; i < N; i++) {
    for (let h = 0; h < H; h++) objetivo += M_DEFICIT * pesoSlot[i] * Math.max(reqH[h][i] - covH[h][i], 0);
    objetivo += lambdaFinal * Math.max(covTot[i] - reqTot[i], 0);
  }
  const turnos = listaTurnos();
  for (const t of turnos) objetivo += costoTurno(t.e, t.d, t.p);
  return { objetivo, turnos, iterGreedy, iterLocal, mejoras };
  };

  // ---- Multi-arranque determinista: mejor solución por objetivo ------------
  let mejorSol: ReturnType<typeof ejecutar> | null = null;
  let iterGreedyTotal = 0;
  let iterLocalTotal = 0;
  let mejorasTotal = 0;
  for (let k = 0; k < ARRANQUES.length; k++) {
    const restante = presupuesto - (Date.now() - t0);
    if (mejorSol && restante <= 0) break;
    const sol = ejecutar(ARRANQUES[k].K, ARRANQUES[k].reservar, Math.max(50, restante / (ARRANQUES.length - k)));
    iterGreedyTotal += sol.iterGreedy;
    iterLocalTotal += sol.iterLocal;
    mejorasTotal += sol.mejoras;
    if (!mejorSol || sol.objetivo < mejorSol.objetivo - EPS) mejorSol = sol;
  }
  if (!mejorSol) throw new Error('Sin solución');

  // ---- Vacantes (sobre la mejor solución) ---------------------------------
  const covFinal: Int32Array[] = habilidades.map(() => new Int32Array(N));
  for (const t of mejorSol.turnos) for (const s of plantillas[t.p].slots) covFinal[t.h][t.d * S + s] += 1;
  const vacantesPorHab: Record<string, number> = {};
  let vacantes = 0;
  let vacantesPico = 0;
  for (let h = 0; h < H; h++) {
    let v = 0;
    for (let i = 0; i < N; i++) {
      const def = Math.max(reqH[h][i] - covFinal[h][i], 0);
      v += def;
      if (esPico[i]) vacantesPico += def;
    }
    vacantesPorHab[habilidades[h]] = v * 0.5;
    vacantes += v * 0.5;
  }

  // ---- Salida --------------------------------------------------------------
  const asignaciones: Asignacion[] = [];
  for (const t of mejorSol.turnos) {
    const pl = plantillas[t.p];
    const ini = inicioSemana + t.d * MS_DIA + pl.inicioMin * MS_MIN;
    asignaciones.push({
      clave_externa: emps[t.e].clave,
      inicio: msAIso(ini),
      fin: msAIso(ini + pl.duracionMin * MS_MIN),
      descanso_min: pl.descansoMin,
      habilidad_clave: habilidades[t.h],
      plantilla_clave: pl.clave,
    });
  }
  asignaciones.sort((a, b) => (a.inicio < b.inicio ? -1 : a.inicio > b.inicio ? 1 : a.clave_externa < b.clave_externa ? -1 : 1));

  // ---- Self-check: re-validación independiente de todas las reglas duras ---
  const violaciones = validarReglasDuras(
    asignaciones,
    entrada.empleados.filter((e) => e.sucursal_clave === sucursal.clave),
    reglas,
    sucursal,
    { tope_semanal: tope },
  );
  if (violaciones.length > 0) {
    throw new Error(
      `El optimizador produjo ${violaciones.length} violaciones de reglas duras en ${sucursal.clave}/${entrada.semana}: ` +
        JSON.stringify(violaciones.slice(0, 5)),
    );
  }
  return {
    asignaciones,
    vacantes_horas: vacantes,
    vacantes_por_habilidad: vacantesPorHab,
    vacantes_pico_horas: vacantesPico * 0.5,
    iteraciones_greedy: iterGreedyTotal,
    iteraciones_busqueda_local: iterLocalTotal,
    mejoras_busqueda_local: mejorasTotal,
    ms: Date.now() - t0,
  };
}
