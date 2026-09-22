/**
 * Tipos compartidos del motor (scripts/motor).
 *
 * Las formas de entrada replican el contrato de `scripts/sintetico/salida/`
 * (catalogo.json, empleados.json, trafico/<sucursal>.json,
 * turnos_vigentes/<sucursal>.json). Las formas de salida replican las
 * tablas `demanda_intervalo`, `asignaciones` y `resumen_escenario` de
 * docs/arquitectura.md §3.1 y §7.
 */

// ---------------------------------------------------------------------------
// Catálogo (catalogo.json)
// ---------------------------------------------------------------------------

export interface Hub {
  clave: string;
  nombre: string;
  ciudad: string;
  estado: string;
}

export interface Sucursal {
  clave: string;
  nombre: string;
  hub_clave: string;
  ciudad: string;
  /** "HH:MM" */
  apertura: string;
  /** "HH:MM" */
  cierre: string;
  fte: number;
}

export interface Puesto {
  clave: string;
  nombre: string;
  habilidad_clave: string;
}

export interface Habilidad {
  clave: string;
  nombre: string;
}

export interface Tabulador {
  puesto_clave: string;
  /** "YYYY-MM-DD" */
  vigente_desde: string;
  salario_hora: number;
  prima_dominical_pct: number;
}

export interface PlantillaTurno {
  clave: string;
  /** "HH:MM" */
  hora_inicio: string;
  duracion_min: number;
  descanso_min: number;
}

export interface ReglasLaborales {
  vigente_desde: string;
  tope_semanal: number;
  max_horas_dia: number;
  horas_dobles_max: number;
  factor_doble: number;
  factor_triple: number;
  prima_dominical_pct: number;
  descanso_entre_turnos_horas: number;
  max_dias_semana: number;
}

export interface ParametrosDemanda {
  clientes_por_colaborador_30min: number;
  conversion: number;
  transacciones_por_cajero_30min: number;
  minimo_apertura: Record<string, number>; // { caja, piso, almacen, supervision }
}

export interface Catalogo {
  empresa: { nombre: string };
  hubs: Hub[];
  sucursales: Sucursal[];
  puestos: Puesto[];
  habilidades: Habilidad[];
  tabuladores: Tabulador[];
  plantillas_turno: PlantillaTurno[];
  reglas_laborales: ReglasLaborales;
  parametros_demanda: ParametrosDemanda;
}

// ---------------------------------------------------------------------------
// Empleados (empleados.json)
// ---------------------------------------------------------------------------

export interface VentanaDisponibilidad {
  /** 1 = lunes … 7 = domingo */
  dia_semana: number;
  /** "HH:MM" */
  hora_inicio: string;
  /** "HH:MM" */
  hora_fin: string;
}

export interface Empleado {
  clave_externa: string;
  sucursal_clave: string;
  nombre: string;
  apellido: string;
  puesto_clave: string;
  tipo_contrato: 'tiempo_completo' | 'medio_tiempo';
  jornada_contratada: number;
  max_horas_semana: number;
  habilidades: string[];
  /** Sin ventanas = disponible todo el horario de tienda. */
  disponibilidad: VentanaDisponibilidad[];
}

// ---------------------------------------------------------------------------
// Tráfico observado (trafico/<sucursal>.json) y turnos vigentes
// ---------------------------------------------------------------------------

export interface TraficoFila {
  /** ISO con offset -06:00, pasos de 30 min dentro del horario de tienda. */
  inicio: string;
  trafico: number;
  ventas: number;
}

export interface TurnoVigente {
  clave_externa: string;
  /** "YYYY-MM-DD" */
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  descanso_min: number;
  habilidad_clave: string;
}

// ---------------------------------------------------------------------------
// Salidas del motor
// ---------------------------------------------------------------------------

/** Un intervalo pronosticado (168 por tienda-semana). */
export interface IntervaloPronostico {
  inicio: string;
  fin: string;
  trafico: number;
  ventas: number;
}

/** Fila con la forma de `demanda_intervalo` + requerimiento por habilidad. */
export interface DemandaFila {
  inicio: string;
  fin: string;
  trafico: number;
  ventas: number;
  requerido_total: number;
  requerido_caja: number;
  es_pico: boolean;
  requerido_por_habilidad: Record<string, number>;
}

/** Fila con la forma de `asignaciones` (claves en lugar de uuids). */
export interface Asignacion {
  clave_externa: string;
  inicio: string;
  fin: string;
  descanso_min: number;
  habilidad_clave: string;
  plantilla_clave: string | null;
}

/** Espejo de `resumen_escenario` (§7) más detalle por habilidad. */
export interface Evaluacion {
  tope_semanal: number;
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
  tarifa_media_ponderada: number;
  costo_sobrestaffing: number;
  costo_total: number;
  intervalos_pico: number;
  intervalos_pico_cubiertos: number;
  /** intervalos_pico_cubiertos / intervalos_pico × 100 (definición de v_ahorro_escenario). */
  intervalos_pico_cubiertos_pct: number;
  /** Σ min(asignado, requerido) / Σ requerido sobre intervalos pico (0–100, §5). */
  cobertura_pico_pct: number;
  deficit_pico_horas: number;
  /** Σ max(requerido − asignado, 0) × 0.5 sobre todos los intervalos. */
  deficit_total_horas: number;
  empleados_con_turno: number;
  turnos: number;
  por_habilidad: Record<
    string,
    {
      requerido_horas: number;
      asignado_horas: number;
      deficit_horas: number;
      deficit_pico_horas: number;
      sobrestaffing_horas: number;
    }
  >;
  por_empleado: EvaluacionEmpleado[];
  /** Cobertura por intervalo (espejo de `cobertura_intervalo`). */
  cobertura: CoberturaIntervalo[];
}

export interface EvaluacionEmpleado {
  clave_externa: string;
  tarifa: number;
  horas: number;
  regulares: number;
  dobles: number;
  triples: number;
  horas_domingo: number;
  dias_trabajados: number;
  costo: number;
}

export interface CoberturaIntervalo {
  inicio: string;
  requerido_total: number;
  asignado_total: number;
  requerido_caja: number;
  asignado_caja: number;
  es_pico: boolean;
}

export interface ResultadoOptimizacion {
  asignaciones: Asignacion[];
  /** Horas-turno sin cubrir por falta de empleados elegibles (por habilidad). */
  vacantes_horas: number;
  vacantes_por_habilidad: Record<string, number>;
  vacantes_pico_horas: number;
  iteraciones_greedy: number;
  iteraciones_busqueda_local: number;
  mejoras_busqueda_local: number;
  ms: number;
}
