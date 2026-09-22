/**
 * Pronóstico de demanda (docs/arquitectura.md §5).
 *
 * Media estacional por (día ISO, intervalo de 30 min) sobre las 8 semanas
 * previas a la semana objetivo, × 1.15 si la semana objetivo contiene el
 * día 15 o el último día de un mes (factor de quincena). El resultado son
 * los 168 intervalos (7 días × 24 intervalos de 30 min para 09:00–21:00;
 * parametrizable con apertura/cierre) de la semana objetivo.
 *
 * "Rolling": el llamador incluye en `historia` los reales de semanas
 * objetivo anteriores; aquí sólo se filtra por `inicio < semanaObjetivo`.
 */

import type { IntervaloPronostico, TraficoFila } from './tipos';
import {
  MS_DIA,
  MS_INTERVALO,
  MS_MIN,
  esLunes,
  fechaAMs,
  hhmmAMin,
  isoAMs,
  isodow,
  msAIso,
  msAMinDia,
  sumarDias,
  ultimoDiaMes,
} from './tiempo';

export const SEMANAS_HISTORIA = 8;
export const FACTOR_QUINCENA = 1.15;
export const METODO_PRONOSTICO = 'media_estacional_8s_quincena';

export interface OpcionesPronostico {
  /** "HH:MM" apertura de tienda (default 09:00). */
  apertura?: string;
  /** "HH:MM" cierre de tienda (default 21:00). */
  cierre?: string;
  semanasHistoria?: number;
  factorQuincena?: number;
}

/** true si la semana (lunes `semana`) contiene día 15 o último día de mes. */
export function esSemanaQuincena(semana: string): boolean {
  for (let d = 0; d < 7; d++) {
    const fecha = sumarDias(semana, d);
    const dia = Number(fecha.slice(8, 10));
    if (dia === 15 || dia === ultimoDiaMes(fecha)) return true;
  }
  return false;
}

export function pronosticar(
  historia: TraficoFila[],
  semanaObjetivo: string,
  opciones: OpcionesPronostico = {},
): IntervaloPronostico[] {
  if (!esLunes(semanaObjetivo)) {
    throw new Error(`La semana objetivo debe ser lunes (semana ISO): ${semanaObjetivo}`);
  }
  const apertura = hhmmAMin(opciones.apertura ?? '09:00');
  const cierre = hhmmAMin(opciones.cierre ?? '21:00');
  const nSem = opciones.semanasHistoria ?? SEMANAS_HISTORIA;
  const factorQ = opciones.factorQuincena ?? FACTOR_QUINCENA;

  const inicioSemana = fechaAMs(semanaObjetivo);
  const inicioHistoria = inicioSemana - nSem * 7 * MS_DIA;

  // Acumula por (isodow, minuto del día).
  const acum = new Map<string, { trafico: number; ventas: number; n: number }>();
  for (const fila of historia) {
    const ms = isoAMs(fila.inicio);
    if (ms < inicioHistoria || ms >= inicioSemana) continue;
    const clave = `${isodow(ms)}:${msAMinDia(ms)}`;
    const a = acum.get(clave) ?? { trafico: 0, ventas: 0, n: 0 };
    a.trafico += fila.trafico;
    a.ventas += fila.ventas;
    a.n += 1;
    acum.set(clave, a);
  }

  const factor = esSemanaQuincena(semanaObjetivo) ? factorQ : 1;
  const salida: IntervaloPronostico[] = [];
  for (let d = 0; d < 7; d++) {
    const dow = d + 1;
    for (let min = apertura; min < cierre; min += MS_INTERVALO / MS_MIN) {
      const ms = inicioSemana + d * MS_DIA + min * MS_MIN;
      const a = acum.get(`${dow}:${min}`);
      const trafico = a ? Math.round((a.trafico / a.n) * factor) : 0;
      const ventas = a ? Math.round((a.ventas / a.n) * factor * 100) / 100 : 0;
      salida.push({ inicio: msAIso(ms), fin: msAIso(ms + MS_INTERVALO), trafico, ventas });
    }
  }
  return salida;
}
