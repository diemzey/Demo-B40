/**
 * Resumen por tienda-semana y totales (resumen.json) a partir de los
 * resultados del pipeline. Los importes son MXN.
 */

import type { ResultadoTiendaSemana } from './pipeline';
import { redondear } from './tiempo';

export interface FilaResumen {
  sucursal_clave: string;
  sucursal_nombre: string;
  semana_iso: string;
  costo_baseline: number;
  costo_propuesta: number;
  ahorro_mxn: number;
  ahorro_pct: number;
  baseline: DesgloseEscenario;
  propuesta: DesgloseEscenario;
  vacantes_horas: number;
  vacantes_pico_horas: number;
  /** Empleados-día que faltan estructuralmente (cota inferior; 0 = la plantilla alcanza). */
  empleados_dia_faltantes: number;
  /** Días con faltantes > 0 según la cota (día, habilidades, intervalos, necesarios vs disponibles). */
  cota_dias: Array<{ fecha: string; habilidades: string[]; intervalos: string[]; necesarios: number; disponibles: number; faltantes: number }>;
  horas_requeridas: number;
  horas_capacidad: number;
  violaciones_baseline: number;
  ms_optimizacion: number;
  ms_total: number;
}

export interface DesgloseEscenario {
  horas_totales: number;
  horas_regulares: number;
  horas_dobles: number;
  horas_triples: number;
  horas_domingo: number;
  costo_regular: number;
  costo_dobles: number;
  costo_triples: number;
  costo_prima_dominical: number;
  horas_sobrestaffing: number;
  costo_sobrestaffing: number;
  costo_total: number;
  intervalos_pico: number;
  intervalos_pico_cubiertos: number;
  cobertura_pico_pct: number;
  deficit_pico_horas: number;
  deficit_total_horas: number;
  turnos: number;
  empleados_con_turno: number;
}

export interface Resumen {
  generado_en: string;
  semanas: string[];
  tiendas: number;
  tienda_semanas: number;
  totales: {
    costo_baseline: number;
    costo_propuesta: number;
    ahorro_mxn: number;
    ahorro_pct: number;
    baseline: DesgloseEscenario;
    propuesta: DesgloseEscenario;
    vacantes_horas: number;
    vacantes_pico_horas: number;
    tienda_semanas_con_deficit_pico: number;
    tienda_semanas_con_deficit_pico_sin_cota: number;
    tienda_semanas_infactibles_estructuralmente: number;
    empleados_dia_faltantes: number;
    deficit_pico_horas_sin_cota: number;
    tienda_semanas_bajo_8pct: number;
  };
  distribucion_ahorro_pct: { min: number; p25: number; mediana: number; p75: number; max: number };
  peores_5: Array<{ sucursal_clave: string; semana_iso: string; ahorro_pct: number; ahorro_mxn: number; motivo: string }>;
  tiempo: { ms_total: number; ms_promedio_tienda_semana: number; ms_max_tienda_semana: number; ms_optimizacion_promedio: number };
  filas: FilaResumen[];
}

function desglose(ev: ResultadoTiendaSemana['baseline']['evaluacion']): DesgloseEscenario {
  return {
    horas_totales: ev.horas_totales,
    horas_regulares: ev.horas_regulares,
    horas_dobles: ev.horas_dobles,
    horas_triples: ev.horas_triples,
    horas_domingo: ev.horas_domingo,
    costo_regular: ev.costo_regular,
    costo_dobles: ev.costo_dobles,
    costo_triples: ev.costo_triples,
    costo_prima_dominical: ev.costo_prima_dominical,
    horas_sobrestaffing: ev.horas_sobrestaffing,
    costo_sobrestaffing: ev.costo_sobrestaffing,
    costo_total: ev.costo_total,
    intervalos_pico: ev.intervalos_pico,
    intervalos_pico_cubiertos: ev.intervalos_pico_cubiertos,
    cobertura_pico_pct: ev.cobertura_pico_pct,
    deficit_pico_horas: ev.deficit_pico_horas,
    deficit_total_horas: ev.deficit_total_horas,
    turnos: ev.turnos,
    empleados_con_turno: ev.empleados_con_turno,
  };
}

function sumarDesglose(lista: DesgloseEscenario[]): DesgloseEscenario {
  const out: DesgloseEscenario = {
    horas_totales: 0, horas_regulares: 0, horas_dobles: 0, horas_triples: 0, horas_domingo: 0,
    costo_regular: 0, costo_dobles: 0, costo_triples: 0, costo_prima_dominical: 0,
    horas_sobrestaffing: 0, costo_sobrestaffing: 0, costo_total: 0,
    intervalos_pico: 0, intervalos_pico_cubiertos: 0, cobertura_pico_pct: 0, deficit_pico_horas: 0,
    deficit_total_horas: 0, turnos: 0, empleados_con_turno: 0,
  };
  for (const d of lista) {
    for (const k of Object.keys(out) as (keyof DesgloseEscenario)[]) out[k] += d[k];
  }
  for (const k of Object.keys(out) as (keyof DesgloseEscenario)[]) out[k] = redondear(out[k]);
  // La cobertura pico agregada no es una suma: se recalcula ponderada por intervalos pico.
  const pesos = lista.reduce((s, d) => s + d.intervalos_pico, 0);
  out.cobertura_pico_pct = pesos > 0 ? redondear(lista.reduce((s, d) => s + d.cobertura_pico_pct * d.intervalos_pico, 0) / pesos) : 100;
  return out;
}

function percentil(vals: number[], p: number): number {
  if (vals.length === 0) return 0;
  const o = [...vals].sort((a, b) => a - b);
  const pos = (o.length - 1) * p;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return redondear(o[lo] + (o[hi] - o[lo]) * (pos - lo));
}

export function construirResumen(resultados: ResultadoTiendaSemana[], semanas: string[], msTotal: number): Resumen {
  const filas: FilaResumen[] = resultados.map((r) => ({
    sucursal_clave: r.sucursal_clave,
    sucursal_nombre: r.sucursal_nombre,
    semana_iso: r.semana_iso,
    costo_baseline: r.baseline.evaluacion.costo_total,
    costo_propuesta: r.propuesta.evaluacion.costo_total,
    ahorro_mxn: r.ahorro.ahorro_mxn,
    ahorro_pct: r.ahorro.ahorro_pct,
    baseline: desglose(r.baseline.evaluacion),
    propuesta: desglose(r.propuesta.evaluacion),
    vacantes_horas: r.propuesta.vacantes_horas,
    vacantes_pico_horas: r.propuesta.vacantes_pico_horas,
    empleados_dia_faltantes: r.capacidad.empleados_dia_faltantes,
    cota_dias: r.capacidad.por_dia
      .filter((d) => d.faltantes > 0)
      .map((d) => ({ fecha: d.fecha, habilidades: d.habilidades, intervalos: d.intervalos, necesarios: d.empleados_necesarios, disponibles: d.empleados_disponibles, faltantes: d.faltantes })),
    horas_requeridas: r.capacidad.horas_requeridas,
    horas_capacidad: r.capacidad.horas_capacidad,
    violaciones_baseline: r.baseline.violaciones.length,
    ms_optimizacion: r.ms.optimizacion,
    ms_total: r.ms.total,
  }));
  const base = sumarDesglose(filas.map((f) => f.baseline));
  const prop = sumarDesglose(filas.map((f) => f.propuesta));
  const ahorro = redondear(base.costo_total - prop.costo_total);
  const pcts = filas.map((f) => f.ahorro_pct);
  const peores = [...filas]
    .sort((a, b) => a.ahorro_pct - b.ahorro_pct)
    .slice(0, 5)
    .map((f) => ({
      sucursal_clave: f.sucursal_clave,
      semana_iso: f.semana_iso,
      ahorro_pct: f.ahorro_pct,
      ahorro_mxn: f.ahorro_mxn,
      motivo:
        f.empleados_dia_faltantes > 0
          ? `plantilla insuficiente: faltan ${f.empleados_dia_faltantes} empleados-día (vacantes ${f.vacantes_horas} h)`
          : f.vacantes_pico_horas > 0
          ? `vacantes pico ${f.vacantes_pico_horas} h`
          : f.baseline.horas_dobles + f.baseline.horas_triples === 0
            ? 'baseline sin horas extra'
            : f.propuesta.horas_sobrestaffing > f.baseline.horas_sobrestaffing
              ? 'propuesta con más sobrestaffing que baseline'
              : 'baseline ya eficiente',
    }));
  return {
    generado_en: new Date().toISOString(),
    semanas,
    tiendas: new Set(filas.map((f) => f.sucursal_clave)).size,
    tienda_semanas: filas.length,
    totales: {
      costo_baseline: base.costo_total,
      costo_propuesta: prop.costo_total,
      ahorro_mxn: ahorro,
      ahorro_pct: base.costo_total > 0 ? redondear((100 * ahorro) / base.costo_total) : 0,
      baseline: base,
      propuesta: prop,
      vacantes_horas: redondear(filas.reduce((s, f) => s + f.vacantes_horas, 0)),
      vacantes_pico_horas: redondear(filas.reduce((s, f) => s + f.vacantes_pico_horas, 0)),
      tienda_semanas_con_deficit_pico: filas.filter((f) => f.propuesta.deficit_pico_horas > 0).length,
      tienda_semanas_con_deficit_pico_sin_cota: filas.filter((f) => f.propuesta.deficit_pico_horas > 0 && f.empleados_dia_faltantes === 0).length,
      tienda_semanas_infactibles_estructuralmente: filas.filter((f) => f.empleados_dia_faltantes > 0).length,
      empleados_dia_faltantes: filas.reduce((s, f) => s + f.empleados_dia_faltantes, 0),
      deficit_pico_horas_sin_cota: redondear(filas.filter((f) => f.empleados_dia_faltantes === 0).reduce((s, f) => s + f.propuesta.deficit_pico_horas, 0)),
      tienda_semanas_bajo_8pct: filas.filter((f) => f.ahorro_pct < 8).length,
    },
    distribucion_ahorro_pct: {
      min: percentil(pcts, 0),
      p25: percentil(pcts, 0.25),
      mediana: percentil(pcts, 0.5),
      p75: percentil(pcts, 0.75),
      max: percentil(pcts, 1),
    },
    peores_5: peores,
    tiempo: {
      ms_total: msTotal,
      ms_promedio_tienda_semana: filas.length ? Math.round(filas.reduce((s, f) => s + f.ms_total, 0) / filas.length) : 0,
      ms_max_tienda_semana: filas.length ? Math.max(...filas.map((f) => f.ms_total)) : 0,
      ms_optimizacion_promedio: filas.length ? Math.round(filas.reduce((s, f) => s + f.ms_optimizacion, 0) / filas.length) : 0,
    },
    filas,
  };
}
