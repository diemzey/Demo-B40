/**
 * Reglas duras (docs/arquitectura.md §3.2 / §6) y utilidades comunes:
 * horas de una asignación, tarifa vigente y validador independiente que
 * re-verifica cada regla sobre un conjunto de asignaciones. El validador
 * es el "self-check" del optimizador y también sirve para diagnosticar el
 * baseline (que por diseño puede violar el tope).
 */

import type {
  Asignacion,
  Catalogo,
  Empleado,
  ReglasLaborales,
  Sucursal,
  Tabulador,
} from './tipos';
import { MS_HORA, MS_MIN, hhmmAMin, isoAMs, isodow, msAFecha, msAMinDia, redondear } from './tiempo';

/**
 * Convención de horas de una asignación: duración menos descanso
 * (igual que `horarios.horas` en 0002_esquema_base.sql; la columna generada
 * `asignaciones.horas` debe seguir la misma convención para que el cómputo
 * local coincida al peso con `resumir_escenario`). Redondeo a 2 decimales
 * como `numeric(4,2)`.
 */
export const HORAS_NETAS = true;

export function horasAsignacion(a: { inicio: string; fin: string; descanso_min: number }): number {
  const bruto = (isoAMs(a.fin) - isoAMs(a.inicio)) / MS_HORA;
  const neto = HORAS_NETAS ? bruto - a.descanso_min / 60 : bruto;
  return redondear(neto, 2);
}

export function horasDeDuracion(duracionMin: number, descansoMin: number): number {
  return redondear((HORAS_NETAS ? duracionMin - descansoMin : duracionMin) / 60, 2);
}

export function esDomingo(a: { inicio: string }): boolean {
  return isodow(isoAMs(a.inicio)) === 7;
}

/** Tabulador vigente a la fecha para un puesto (`order by vigente_desde desc limit 1`). */
export function tabuladorVigente(
  tabuladores: Tabulador[],
  puestoClave: string,
  fecha: string,
): Tabulador | undefined {
  let mejor: Tabulador | undefined;
  for (const t of tabuladores) {
    if (t.puesto_clave !== puestoClave || t.vigente_desde > fecha) continue;
    if (!mejor || t.vigente_desde > mejor.vigente_desde) mejor = t;
  }
  return mejor;
}

export interface TarifaEmpleado {
  salario_hora: number;
  prima_dominical_pct: number;
}

/** Mapa clave_externa → tarifa vigente (tabulador del puesto a la fecha). */
export function tarifasPorEmpleado(
  catalogo: Catalogo,
  empleados: Empleado[],
  fecha: string,
): Map<string, TarifaEmpleado> {
  const m = new Map<string, TarifaEmpleado>();
  for (const e of empleados) {
    const t = tabuladorVigente(catalogo.tabuladores, e.puesto_clave, fecha);
    if (!t) throw new Error(`Sin tabulador vigente para puesto ${e.puesto_clave} al ${fecha}`);
    m.set(e.clave_externa, {
      salario_hora: t.salario_hora,
      prima_dominical_pct: t.prima_dominical_pct ?? catalogo.reglas_laborales.prima_dominical_pct,
    });
  }
  return m;
}

export interface Violacion {
  regla:
    | 'traslape'
    | 'un_turno_por_dia'
    | 'max_horas_dia'
    | 'tope_semanal'
    | 'max_horas_semana'
    | 'max_dias_semana'
    | 'descanso_entre_turnos'
    | 'disponibilidad'
    | 'habilidad'
    | 'horario_tienda'
    | 'empleado_desconocido';
  clave_externa: string;
  detalle: string;
}

export interface OpcionesValidacion {
  tope_semanal?: number;
  /** Si true, exige que el turno caiga dentro del horario de la sucursal. */
  exigirHorarioTienda?: boolean;
}

/**
 * Valida todas las reglas duras (a)–(f) de §6 sobre asignaciones de UNA
 * tienda-semana. Devuelve la lista de violaciones (vacía = válido).
 */
export function validarReglasDuras(
  asignaciones: Asignacion[],
  empleados: Empleado[],
  reglas: ReglasLaborales,
  sucursal: Sucursal,
  opciones: OpcionesValidacion = {},
): Violacion[] {
  const tope = opciones.tope_semanal ?? reglas.tope_semanal;
  const v: Violacion[] = [];
  const porEmpleado = new Map<string, Empleado>(empleados.map((e) => [e.clave_externa, e]));
  const grupos = new Map<string, Asignacion[]>();
  for (const a of asignaciones) {
    const g = grupos.get(a.clave_externa) ?? [];
    g.push(a);
    grupos.set(a.clave_externa, g);
  }
  const apertura = hhmmAMin(sucursal.apertura);
  const cierre = hhmmAMin(sucursal.cierre);
  const descansoMs = reglas.descanso_entre_turnos_horas * MS_HORA;

  for (const [clave, lista] of grupos) {
    const emp = porEmpleado.get(clave);
    if (!emp) {
      v.push({ regla: 'empleado_desconocido', clave_externa: clave, detalle: 'no existe en empleados' });
      continue;
    }
    const ord = [...lista].sort((a, b) => isoAMs(a.inicio) - isoAMs(b.inicio));
    // Set para consultar la habilidad en O(1) en cada turno del colaborador.
    const habilidadesEmp = new Set(emp.habilidades);
    let horasSemana = 0;
    const horasDia = new Map<string, number>();
    const dias = new Set<string>();
    for (let i = 0; i < ord.length; i++) {
      const a = ord[i];
      const ini = isoAMs(a.inicio);
      const fin = isoAMs(a.fin);
      const fecha = msAFecha(ini);
      const h = horasAsignacion(a);
      horasSemana += h;
      horasDia.set(fecha, (horasDia.get(fecha) ?? 0) + h);
      if (dias.has(fecha)) {
        v.push({ regla: 'un_turno_por_dia', clave_externa: clave, detalle: `dos turnos el ${fecha}` });
      }
      dias.add(fecha);
      if (i > 0) {
        const prev = ord[i - 1];
        const finPrev = isoAMs(prev.fin);
        if (finPrev > ini) {
          v.push({ regla: 'traslape', clave_externa: clave, detalle: `${prev.inicio}–${prev.fin} con ${a.inicio}` });
        } else if (ini - finPrev < descansoMs) {
          v.push({
            regla: 'descanso_entre_turnos',
            clave_externa: clave,
            detalle: `${((ini - finPrev) / MS_HORA).toFixed(1)} h entre ${prev.fin} y ${a.inicio}`,
          });
        }
      }
      if (!habilidadesEmp.has(a.habilidad_clave)) {
        v.push({ regla: 'habilidad', clave_externa: clave, detalle: `no tiene ${a.habilidad_clave}` });
      }
      if (emp.disponibilidad.length > 0) {
        const dow = isodow(ini);
        const mi = msAMinDia(ini);
        const mf = mi + (fin - ini) / MS_MIN;
        const ok = emp.disponibilidad.some(
          (w) => w.dia_semana === dow && hhmmAMin(w.hora_inicio) <= mi && hhmmAMin(w.hora_fin) >= mf,
        );
        if (!ok) {
          v.push({ regla: 'disponibilidad', clave_externa: clave, detalle: `${a.inicio}–${a.fin} fuera de ventanas` });
        }
      }
      if (opciones.exigirHorarioTienda) {
        const mi = msAMinDia(ini);
        const mf = mi + (fin - ini) / MS_MIN;
        if (mi < apertura || mf > cierre) {
          v.push({ regla: 'horario_tienda', clave_externa: clave, detalle: `${a.inicio}–${a.fin}` });
        }
      }
    }
    for (const [fecha, h] of horasDia) {
      if (h > reglas.max_horas_dia + 1e-9) {
        v.push({ regla: 'max_horas_dia', clave_externa: clave, detalle: `${h} h el ${fecha}` });
      }
    }
    if (horasSemana > tope + 1e-9) {
      v.push({ regla: 'tope_semanal', clave_externa: clave, detalle: `${redondear(horasSemana)} h > ${tope}` });
    }
    if (horasSemana > emp.max_horas_semana + 1e-9) {
      v.push({ regla: 'max_horas_semana', clave_externa: clave, detalle: `${redondear(horasSemana)} h > ${emp.max_horas_semana}` });
    }
    if (dias.size > reglas.max_dias_semana) {
      v.push({ regla: 'max_dias_semana', clave_externa: clave, detalle: `${dias.size} días` });
    }
  }
  return v;
}
