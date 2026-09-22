/**
 * Contrato de los archivos JSON que produce `generar.ts` y consumen
 * `cargar.ts` y el motor (`scripts/motor`). Las formas son el acuerdo entre
 * componentes: cambiarlas implica cambiar a todos los consumidores.
 *
 * Todas las horas son locales de America/Mexico_City (UTC-06:00, sin horario
 * de verano); los timestamps llevan desfase explícito.
 */

export type Hub = { clave: string; nombre: string; ciudad: string; estado: string };

export type Sucursal = {
  clave: string;
  nombre: string;
  hub_clave: string;
  ciudad: string;
  /** `HH:MM` local. */
  apertura: string;
  cierre: string;
  /** Tamaño de plantilla de la tienda. */
  fte: number;
};

export type PuestoCatalogo = { clave: string; nombre: string; habilidad_clave: string };

export type Habilidad = { clave: string; nombre: string };

export type Tabulador = {
  puesto_clave: string;
  vigente_desde: string;
  salario_hora: number;
  prima_dominical_pct: number;
};

export type PlantillaTurno = {
  clave: string;
  /** `HH:MM` local. */
  hora_inicio: string;
  /** Minutos de presencia (incluye el descanso). */
  duracion_min: number;
  descanso_min: number;
};

export type ReglasLaborales = {
  vigente_desde: string;
  tope_semanal: number;
  max_horas_dia: number;
  horas_dobles_max: number;
  factor_doble: number;
  factor_triple: number;
  prima_dominical_pct: number;
  descanso_entre_turnos_horas: number;
  max_dias_semana: number;
};

export type ParametrosDemanda = {
  clientes_por_colaborador_30min: number;
  conversion: number;
  transacciones_por_cajero_30min: number;
  minimo_apertura: { caja: number; piso: number; almacen: number; supervision: number };
};

export type Catalogo = {
  empresa: { nombre: string };
  hubs: Hub[];
  sucursales: Sucursal[];
  puestos: PuestoCatalogo[];
  habilidades: Habilidad[];
  tabuladores: Tabulador[];
  plantillas_turno: PlantillaTurno[];
  reglas_laborales: ReglasLaborales;
  parametros_demanda: ParametrosDemanda;
};

/** Ventana semanal de disponibilidad; `dia_semana` ISO (1 = lunes … 7 = domingo). */
export type Disponibilidad = { dia_semana: number; hora_inicio: string; hora_fin: string };

export type Empleado = {
  clave_externa: string;
  sucursal_clave: string;
  nombre: string;
  apellido: string;
  puesto_clave: string;
  tipo_contrato: "tiempo_completo" | "medio_tiempo";
  /** Horas semanales del contrato actual (48 tiempo completo, 24 medio tiempo). */
  jornada_contratada: number;
  /** Máximo que el optimizador puede asignar por semana (40 TC, 24 MT). */
  max_horas_semana: number;
  habilidades: string[];
  /** Vacío = disponible todo el horario de tienda. */
  disponibilidad: Disponibilidad[];
};

/** Una fila por intervalo de 30 min mientras la tienda está abierta. */
export type FilaTrafico = {
  /** ISO con desfase, p. ej. `2026-07-06T09:00:00-06:00`. */
  inicio: string;
  trafico: number;
  /** MXN. */
  ventas: number;
};

/** Turno del horario rígido vigente (baseline). */
export type Turno = {
  clave_externa: string;
  /** `YYYY-MM-DD` local. */
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  descanso_min: number;
  /** Habilidad principal del puesto (rol que cubre). */
  habilidad_clave: string;
};
