/**
 * Evaluación pura de un escenario: espejo exacto de `resumir_escenario`
 * (docs/arquitectura.md §7). Debe coincidir al peso con lo que calcula
 * Postgres; por eso no contiene ninguna heurística ni parámetro de ajuste.
 *
 *  1. Por empleado-semana: horas = Σ asignaciones.horas;
 *     regulares = min(horas, tope); dobles = min(max(horas − tope, 0), horas_dobles_max);
 *     triples = max(horas − tope − horas_dobles_max, 0); horas_domingo = Σ horas con es_domingo.
 *  2. costo_empleado = tarifa × (regulares + factor_doble·dobles + factor_triple·triples)
 *                    + tarifa × prima_dominical_pct/100 × horas_domingo.
 *  3. sobrestaffing = Σ_i max(asignado_total − requerido_total, 0) × 0.5 h,
 *     valuado a la tarifa media ponderada por horas del escenario.
 *  4. costo_total = Σ costo_empleado + costo_sobrestaffing.
 *
 * Cobertura de un intervalo = número de asignaciones cuyo [inicio, fin)
 * contiene el inicio del intervalo (el descanso no se descuenta).
 */

import type {
  Asignacion,
  CoberturaIntervalo,
  DemandaFila,
  Evaluacion,
  EvaluacionEmpleado,
  ReglasLaborales,
} from './tipos';
import { esDomingo, horasAsignacion, type TarifaEmpleado } from './reglas';
import { isoAMs, msAFecha, redondear } from './tiempo';

export interface EntradaEvaluacion {
  reglas: ReglasLaborales;
  /** clave_externa → tarifa vigente. */
  tarifas: Map<string, TarifaEmpleado>;
  asignaciones: Asignacion[];
  demanda: DemandaFila[];
  /** Tope del escenario (default reglas.tope_semanal). */
  tope_semanal?: number;
}

/** Cobertura por intervalo y por habilidad (usa el inicio del intervalo). */
export function calcularCobertura(
  asignaciones: Asignacion[],
  demanda: DemandaFila[],
): { total: number[]; porHabilidad: Map<string, number[]> } {
  const n = demanda.length;
  const inicios = demanda.map((d) => isoAMs(d.inicio));
  const total = new Array<number>(n).fill(0);
  const porHabilidad = new Map<string, number[]>();
  // demanda viene ordenada por inicio; búsqueda binaria del primer intervalo ≥ inicio.
  const primerIdx = (ms: number): number => {
    let lo = 0;
    let hi = n;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (inicios[mid] < ms) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  };
  for (const a of asignaciones) {
    const ini = isoAMs(a.inicio);
    const fin = isoAMs(a.fin);
    let arr = porHabilidad.get(a.habilidad_clave);
    if (!arr) {
      arr = new Array<number>(n).fill(0);
      porHabilidad.set(a.habilidad_clave, arr);
    }
    for (let i = primerIdx(ini); i < n && inicios[i] < fin; i++) {
      total[i] += 1;
      arr[i] += 1;
    }
  }
  return { total, porHabilidad };
}

export function evaluar(entrada: EntradaEvaluacion): Evaluacion {
  const { reglas, tarifas, asignaciones, demanda } = entrada;
  const tope = entrada.tope_semanal ?? reglas.tope_semanal;

  // ---- 1 y 2: horas y costo por empleado -------------------------------
  const porEmp = new Map<string, { horas: number; domingo: number; dias: Set<string> }>();
  for (const a of asignaciones) {
    const h = horasAsignacion(a);
    const r = porEmp.get(a.clave_externa) ?? { horas: 0, domingo: 0, dias: new Set<string>() };
    r.horas += h;
    if (esDomingo(a)) r.domingo += h;
    r.dias.add(msAFecha(isoAMs(a.inicio)));
    porEmp.set(a.clave_externa, r);
  }

  const por_empleado: EvaluacionEmpleado[] = [];
  let horas_totales = 0;
  let horas_regulares = 0;
  let horas_dobles = 0;
  let horas_triples = 0;
  let horas_domingo = 0;
  let costo_regular = 0;
  let costo_dobles = 0;
  let costo_triples = 0;
  let costo_prima_dominical = 0;
  let sumaTarifaHoras = 0;

  for (const [clave, r] of [...porEmp.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
    const t = tarifas.get(clave);
    if (!t) throw new Error(`Sin tarifa para empleado ${clave}`);
    const horas = redondear(r.horas, 2);
    const regulares = Math.min(horas, tope);
    const dobles = Math.min(Math.max(horas - tope, 0), reglas.horas_dobles_max);
    const triples = Math.max(horas - tope - reglas.horas_dobles_max, 0);
    const domingo = redondear(r.domingo, 2);
    // Cada componente se redondea a centavos por empleado, igual que
    // v_costo_empleado_semana (round(…, 2) por columna) para coincidir al peso.
    const cReg = redondear(t.salario_hora * regulares);
    const cDob = redondear(t.salario_hora * reglas.factor_doble * dobles);
    const cTri = redondear(t.salario_hora * reglas.factor_triple * triples);
    // Prima dominical: porcentaje de reglas_laborales (como v_costo_empleado_semana), no del tabulador.
    const cPri = redondear((t.salario_hora * (reglas.prima_dominical_pct / 100)) * domingo);
    const costo = cReg + cDob + cTri + cPri;
    por_empleado.push({
      clave_externa: clave,
      tarifa: t.salario_hora,
      horas,
      regulares: redondear(regulares),
      dobles: redondear(dobles),
      triples: redondear(triples),
      horas_domingo: domingo,
      dias_trabajados: r.dias.size,
      costo: redondear(costo),
    });
    horas_totales += horas;
    horas_regulares += regulares;
    horas_dobles += dobles;
    horas_triples += triples;
    horas_domingo += domingo;
    costo_regular += cReg;
    costo_dobles += cDob;
    costo_triples += cTri;
    costo_prima_dominical += cPri;
    sumaTarifaHoras += t.salario_hora * horas;
  }
  const tarifaMedia = horas_totales > 0 ? sumaTarifaHoras / horas_totales : 0;

  // ---- 3: cobertura y sobrestaffing -------------------------------------
  const cob = calcularCobertura(asignaciones, demanda);
  const cobCaja = cob.porHabilidad.get('caja') ?? new Array<number>(demanda.length).fill(0);
  const cobertura: CoberturaIntervalo[] = [];
  let sobreIntervalos = 0;
  let deficitIntervalos = 0;
  let intervalos_pico = 0;
  let intervalos_pico_cubiertos = 0;
  let picoReq = 0;
  let picoMin = 0;
  let picoDeficit = 0;
  const habilidades = new Set<string>();
  for (const d of demanda) for (const h of Object.keys(d.requerido_por_habilidad)) habilidades.add(h);
  for (const h of cob.porHabilidad.keys()) habilidades.add(h);
  const porHab: Evaluacion['por_habilidad'] = {};
  for (const h of habilidades) {
    porHab[h] = { requerido_horas: 0, asignado_horas: 0, deficit_horas: 0, deficit_pico_horas: 0, sobrestaffing_horas: 0 };
  }

  demanda.forEach((d, i) => {
    const asig = cob.total[i];
    const req = d.requerido_total;
    sobreIntervalos += Math.max(asig - req, 0);
    deficitIntervalos += Math.max(req - asig, 0);
    if (d.es_pico) {
      intervalos_pico += 1;
      if (asig >= req) intervalos_pico_cubiertos += 1;
      picoReq += req;
      picoMin += Math.min(asig, req);
      picoDeficit += Math.max(req - asig, 0);
    }
    for (const h of habilidades) {
      const rh = d.requerido_por_habilidad[h] ?? 0;
      const ah = cob.porHabilidad.get(h)?.[i] ?? 0;
      const ph = porHab[h];
      ph.requerido_horas += rh * 0.5;
      ph.asignado_horas += ah * 0.5;
      ph.deficit_horas += Math.max(rh - ah, 0) * 0.5;
      ph.sobrestaffing_horas += Math.max(ah - rh, 0) * 0.5;
      if (d.es_pico) ph.deficit_pico_horas += Math.max(rh - ah, 0) * 0.5;
    }
    cobertura.push({
      inicio: d.inicio,
      requerido_total: req,
      asignado_total: asig,
      requerido_caja: d.requerido_caja,
      asignado_caja: cobCaja[i],
      es_pico: d.es_pico,
    });
  });
  for (const h of habilidades) {
    const ph = porHab[h];
    ph.requerido_horas = redondear(ph.requerido_horas);
    ph.asignado_horas = redondear(ph.asignado_horas);
    ph.deficit_horas = redondear(ph.deficit_horas);
    ph.deficit_pico_horas = redondear(ph.deficit_pico_horas);
    ph.sobrestaffing_horas = redondear(ph.sobrestaffing_horas);
  }

  const horas_sobrestaffing = sobreIntervalos * 0.5;
  // resumir_escenario: round(horas_sobre × tarifa_ponderada, 2); costo_total = Σ costo empleados + ese redondeo.
  const costo_sobrestaffing = redondear(horas_sobrestaffing * tarifaMedia);
  const costo_total = redondear(costo_regular + costo_dobles + costo_triples + costo_prima_dominical) + costo_sobrestaffing;

  return {
    tope_semanal: tope,
    horas_totales: redondear(horas_totales),
    horas_regulares: redondear(horas_regulares),
    horas_dobles: redondear(horas_dobles),
    horas_triples: redondear(horas_triples),
    horas_domingo: redondear(horas_domingo),
    costo_regular: redondear(costo_regular),
    costo_dobles: redondear(costo_dobles),
    costo_triples: redondear(costo_triples),
    costo_prima_dominical: redondear(costo_prima_dominical),
    horas_sobrestaffing: redondear(horas_sobrestaffing),
    tarifa_media_ponderada: redondear(tarifaMedia, 4),
    costo_sobrestaffing: redondear(costo_sobrestaffing),
    costo_total: redondear(costo_total),
    intervalos_pico,
    intervalos_pico_cubiertos,
    intervalos_pico_cubiertos_pct: intervalos_pico > 0 ? redondear((100 * intervalos_pico_cubiertos) / intervalos_pico) : 100,
    cobertura_pico_pct: picoReq > 0 ? redondear((100 * picoMin) / picoReq) : 100,
    deficit_pico_horas: redondear(picoDeficit * 0.5),
    deficit_total_horas: redondear(deficitIntervalos * 0.5),
    empleados_con_turno: porEmp.size,
    turnos: asignaciones.length,
    por_habilidad: porHab,
    por_empleado,
    cobertura,
  };
}
