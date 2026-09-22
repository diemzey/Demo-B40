/**
 * Cota inferior estructural de capacidad por día (explica las vacantes).
 *
 * Regla: 1 turno por empleado-día. Dos intervalos i < j del mismo día son
 * "co-cubribles" si alguna plantilla cubre ambos. Un conjunto de intervalos
 * sin ningún par co-cubrible exige un empleado distinto por cada persona
 * requerida en cada uno de ellos. Como las plantillas son contiguas, basta
 * verificar pares consecutivos del conjunto (si una plantilla cubre i y k,
 * cubre todo lo intermedio), así que el conjunto de peso máximo se obtiene
 * con programación dinámica exacta sobre los intervalos ordenados.
 *
 * Se evalúa para cada subconjunto de habilidades S: los empleados que tienen
 * alguna habilidad de S (y disponibilidad ese día) deben ser ≥ el conjunto de
 * peso máximo con pesos Σ_{h∈S} requerido[h]. El máximo sobre S y sobre los
 * días es una cota inferior válida de empleados-día faltantes: ningún
 * algoritmo la puede cubrir sin romper reglas o cambiar plantillas/plantilla.
 */

import type { DemandaFila, Empleado, PlantillaTurno, Sucursal } from './tipos';
import { MS_DIA, MS_MIN, fechaAMs, hhmmAMin, isoAMs, msAMinDia } from './tiempo';

export interface CotaDia {
  fecha: string;
  dia_semana: number;
  /** Subconjunto de habilidades que da la cota más alta. */
  habilidades: string[];
  /** Empleados con alguna de esas habilidades y disponibilidad ese día. */
  empleados_disponibles: number;
  /** Empleados-día distintos que exige el conjunto de intervalos no co-cubribles. */
  empleados_necesarios: number;
  /** Intervalos ("HH:MM") del conjunto de peso máximo. */
  intervalos: string[];
  /** max(necesarios − disponibles, 0). */
  faltantes: number;
}

export interface CotaCapacidad {
  por_dia: CotaDia[];
  /** Σ faltantes de la semana (empleados-día). */
  empleados_dia_faltantes: number;
  /** Horas de la semana requeridas (Σ requerido_total × 0.5) vs capacidad Σ min(tope, max_horas_semana). */
  horas_requeridas: number;
  horas_capacidad: number;
}

/** Conjunto de intervalos de peso máximo sin pares co-cubribles (DP exacta). */
export function conjuntoMaximo(pesos: number[], coCubrible: (i: number, j: number) => boolean): { valor: number; indices: number[] } {
  const n = pesos.length;
  const best = new Array<number>(n).fill(0);
  const prev = new Array<number>(n).fill(-1);
  for (let j = 0; j < n; j++) {
    best[j] = pesos[j];
    for (let i = 0; i < j; i++) {
      if (coCubrible(i, j)) continue;
      if (best[i] + pesos[j] > best[j]) {
        best[j] = best[i] + pesos[j];
        prev[j] = i;
      }
    }
  }
  let mejor = 0;
  for (let j = 1; j < n; j++) if (best[j] > best[mejor]) mejor = j;
  const indices: number[] = [];
  for (let j = mejor; j >= 0; j = prev[j]) indices.push(j);
  indices.reverse();
  return { valor: n ? best[mejor] : 0, indices };
}

export function cotaCapacidad(
  demanda: DemandaFila[],
  empleados: Empleado[],
  plantillas: PlantillaTurno[],
  sucursal: Sucursal,
  semana: string,
  tope: number,
): CotaCapacidad {
  const apertura = hhmmAMin(sucursal.apertura);
  const cierre = hhmmAMin(sucursal.cierre);
  const S = Math.round((cierre - apertura) / 30);
  const inicioSemana = fechaAMs(semana);
  const pl = plantillas.map((p) => ({ a: hhmmAMin(p.hora_inicio), b: hhmmAMin(p.hora_inicio) + p.duracion_min }));
  const cubreSlot: boolean[][] = [];
  for (let s = 0; s < S; s++) {
    const min = apertura + s * 30;
    cubreSlot.push(pl.map((p) => p.a <= min && min < p.b));
  }
  const coCubrible = (i: number, j: number): boolean => cubreSlot[i].some((x, k) => x && cubreSlot[j][k]);

  const habilidades = [...new Set(demanda.flatMap((d) => Object.keys(d.requerido_por_habilidad)))].sort();
  const req: Map<string, number[]>[] = Array.from({ length: 7 }, () => new Map(habilidades.map((h) => [h, new Array<number>(S).fill(0)])));
  const iso: string[][] = Array.from({ length: 7 }, () => new Array<string>(S).fill(''));
  let horasReq = 0;
  for (const d of demanda) {
    const ms = isoAMs(d.inicio);
    const dia = Math.floor((ms - inicioSemana) / MS_DIA);
    const slot = Math.round((msAMinDia(ms) - apertura) / 30);
    if (dia < 0 || dia > 6 || slot < 0 || slot >= S) continue;
    for (const h of habilidades) req[dia].get(h)![slot] = d.requerido_por_habilidad[h] ?? 0;
    iso[dia][slot] = d.inicio.slice(11, 16);
    horasReq += d.requerido_total * 0.5;
  }

  // Subconjuntos no vacíos de habilidades.
  const subconjuntos: string[][] = [];
  for (let m = 1; m < 1 << habilidades.length; m++) subconjuntos.push(habilidades.filter((_, k) => m & (1 << k)));

  const por_dia: CotaDia[] = [];
  let faltantesTotal = 0;
  for (let d = 0; d < 7; d++) {
    const dow = d + 1;
    const disponiblesDia = empleados.filter((e) => e.disponibilidad.length === 0 || e.disponibilidad.some((w) => w.dia_semana === dow));
    let mejor: CotaDia | null = null;
    for (const sub of subconjuntos) {
      const pesos = new Array<number>(S).fill(0);
      for (const h of sub) {
        const r = req[d].get(h)!;
        for (let s = 0; s < S; s++) pesos[s] += r[s];
      }
      const { valor, indices } = conjuntoMaximo(pesos, coCubrible);
      const disponibles = disponiblesDia.filter((e) => e.habilidades.some((h) => sub.includes(h))).length;
      const faltantes = Math.max(valor - disponibles, 0);
      const cand: CotaDia = {
        fecha: '',
        dia_semana: dow,
        habilidades: sub,
        empleados_disponibles: disponibles,
        empleados_necesarios: valor,
        intervalos: indices.map((s) => iso[d][s]),
        faltantes,
      };
      // Máximo por faltantes; en empate, el que más se acerca (menos holgura) con menos habilidades.
      if (
        !mejor ||
        faltantes > mejor.faltantes ||
        (faltantes === mejor.faltantes && faltantes === 0 && disponibles - valor < mejor.empleados_disponibles - mejor.empleados_necesarios)
      ) {
        mejor = cand;
      }
    }
    mejor!.fecha = new Date(inicioSemana + d * MS_DIA + 12 * 60 * MS_MIN - 6 * 60 * MS_MIN).toISOString().slice(0, 10);
    faltantesTotal += mejor!.faltantes;
    por_dia.push(mejor!);
  }
  return {
    por_dia,
    empleados_dia_faltantes: faltantesTotal,
    horas_requeridas: horasReq,
    horas_capacidad: empleados.reduce((s, e) => s + Math.min(tope, e.max_horas_semana), 0),
  };
}
