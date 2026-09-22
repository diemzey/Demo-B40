/**
 * Pipeline por tienda-semana: pronóstico → requerimiento → baseline →
 * optimización → evaluación de ambos escenarios. Sin E/S: index.ts lee y
 * escribe archivos; cargar.ts sube a Supabase.
 */

import type {
  Asignacion,
  Catalogo,
  DemandaFila,
  Empleado,
  Evaluacion,
  IntervaloPronostico,
  ResultadoOptimizacion,
  Sucursal,
  TraficoFila,
  TurnoVigente,
} from './tipos';
import { pronosticar, METODO_PRONOSTICO, SEMANAS_HISTORIA, FACTOR_QUINCENA, esSemanaQuincena } from './pronostico';
import { requerimiento } from './requerimiento';
import { construirBaseline } from './baseline';
import { optimizar } from './optimizar';
import { evaluar } from './evaluar';
import { tarifasPorEmpleado, validarReglasDuras, type Violacion } from './reglas';
import { cotaCapacidad, type CotaCapacidad } from './capacidad';
import { redondear } from './tiempo';

export interface ResultadoTiendaSemana {
  sucursal_clave: string;
  sucursal_nombre: string;
  semana_iso: string;
  pronostico: {
    metodo: string;
    parametros: Record<string, unknown>;
    intervalos: IntervaloPronostico[];
  };
  demanda: DemandaFila[];
  baseline: {
    asignaciones: Asignacion[];
    evaluacion: Evaluacion;
    violaciones: Violacion[];
  };
  propuesta: {
    asignaciones: Asignacion[];
    evaluacion: Evaluacion;
    vacantes_horas: number;
    vacantes_pico_horas: number;
    vacantes_por_habilidad: Record<string, number>;
    iteraciones_greedy: number;
    iteraciones_busqueda_local: number;
    mejoras_busqueda_local: number;
  };
  ahorro: {
    ahorro_mxn: number;
    ahorro_pct: number;
  };
  capacidad: CotaCapacidad;
  ms: { pronostico: number; optimizacion: number; evaluacion: number; total: number };
}

export interface EntradaTiendaSemana {
  catalogo: Catalogo;
  sucursal: Sucursal;
  semana: string;
  empleados: Empleado[]; // sólo los de la sucursal
  trafico: TraficoFila[];
  turnos: TurnoVigente[];
  presupuesto_ms?: number;
}

export function procesarTiendaSemana(entrada: EntradaTiendaSemana): ResultadoTiendaSemana {
  const t0 = Date.now();
  const { catalogo, sucursal, semana, empleados } = entrada;
  const reglas = catalogo.reglas_laborales;
  const tarifas = tarifasPorEmpleado(catalogo, empleados, semana);

  const intervalos = pronosticar(entrada.trafico, semana, { apertura: sucursal.apertura, cierre: sucursal.cierre });
  const demanda = requerimiento(intervalos, catalogo.parametros_demanda);
  const t1 = Date.now();

  const baseAsig = construirBaseline(entrada.turnos, semana, catalogo.plantillas_turno);
  const baseViol = validarReglasDuras(baseAsig, empleados, reglas, sucursal);

  const opt: ResultadoOptimizacion = optimizar({
    sucursal,
    semana,
    empleados,
    plantillas: catalogo.plantillas_turno,
    reglas,
    demanda,
    catalogo,
    tarifas,
    presupuesto_ms: entrada.presupuesto_ms,
  });
  const t2 = Date.now();

  const evBase = evaluar({ reglas, tarifas, asignaciones: baseAsig, demanda });
  const evProp = evaluar({ reglas, tarifas, asignaciones: opt.asignaciones, demanda });
  const t3 = Date.now();

  const capacidad = cotaCapacidad(demanda, empleados, catalogo.plantillas_turno, sucursal, semana, reglas.tope_semanal);
  const ahorro_mxn = redondear(evBase.costo_total - evProp.costo_total);
  const ahorro_pct = evBase.costo_total > 0 ? redondear((100 * ahorro_mxn) / evBase.costo_total) : 0;

  return {
    sucursal_clave: sucursal.clave,
    sucursal_nombre: sucursal.nombre,
    semana_iso: semana,
    pronostico: {
      metodo: METODO_PRONOSTICO,
      parametros: {
        semanas_historia: SEMANAS_HISTORIA,
        factor_quincena: FACTOR_QUINCENA,
        es_quincena: esSemanaQuincena(semana),
        ...catalogo.parametros_demanda,
      },
      intervalos,
    },
    demanda,
    baseline: { asignaciones: baseAsig, evaluacion: evBase, violaciones: baseViol },
    propuesta: {
      asignaciones: opt.asignaciones,
      evaluacion: evProp,
      vacantes_horas: opt.vacantes_horas,
      vacantes_pico_horas: opt.vacantes_pico_horas,
      vacantes_por_habilidad: opt.vacantes_por_habilidad,
      iteraciones_greedy: opt.iteraciones_greedy,
      iteraciones_busqueda_local: opt.iteraciones_busqueda_local,
      mejoras_busqueda_local: opt.mejoras_busqueda_local,
    },
    ahorro: { ahorro_mxn, ahorro_pct },
    capacidad,
    ms: { pronostico: t1 - t0, optimizacion: t2 - t1, evaluacion: t3 - t2, total: Date.now() - t0 },
  };
}
