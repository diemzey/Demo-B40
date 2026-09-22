/**
 * Baseline: asignaciones del escenario "realidad vigente" a partir de
 * `turnos_vigentes/<sucursal>.json` (equivalente local de
 * `materializar_baseline(sucursal, semana)` sobre `horarios`).
 * La habilidad cubierta viene en la fila; la plantilla se resuelve por
 * (hora_inicio, duración) cuando coincide con alguna del catálogo.
 */

import type { Asignacion, PlantillaTurno, TurnoVigente } from './tipos';
import { MS_MIN, fechaAMs, fechaHoraAMs, hhmmAMin, msAIso, sumarDias } from './tiempo';

export function construirBaseline(
  turnos: TurnoVigente[],
  semana: string,
  plantillas: PlantillaTurno[] = [],
): Asignacion[] {
  const ini = fechaAMs(semana);
  const fin = fechaAMs(sumarDias(semana, 7));
  const idx = new Map<string, string>();
  for (const p of plantillas) idx.set(`${hhmmAMin(p.hora_inicio)}:${p.duracion_min}`, p.clave);

  const salida: Asignacion[] = [];
  for (const t of turnos) {
    const msIni = fechaHoraAMs(t.fecha, t.hora_inicio);
    if (msIni < ini || msIni >= fin) continue;
    let msFin = fechaHoraAMs(t.fecha, t.hora_fin);
    if (msFin <= msIni) msFin += 24 * 60 * MS_MIN; // cruza medianoche
    const dur = (msFin - msIni) / MS_MIN;
    salida.push({
      clave_externa: t.clave_externa,
      inicio: msAIso(msIni),
      fin: msAIso(msFin),
      descanso_min: t.descanso_min ?? 0,
      habilidad_clave: t.habilidad_clave,
      plantilla_clave: idx.get(`${hhmmAMin(t.hora_inicio)}:${dur}`) ?? null,
    });
  }
  salida.sort((a, b) => (a.inicio < b.inicio ? -1 : a.inicio > b.inicio ? 1 : a.clave_externa < b.clave_externa ? -1 : 1));
  return salida;
}
