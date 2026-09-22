import type { JornadaPersona, JornadaResumen } from "@/components/ui/jornada-artefacto";

/** Tope legal ordinario a partir de 2030 (h/semana). */
export const TOPE_2030 = 40;

/** Nombre de la cookie con la sucursal elegida en el panel (uuid de `sucursales`). */
export const COOKIE_SUCURSAL = "j40_sucursal";
/** Cookie con la semana elegida en el panel (lunes `YYYY-MM-DD`). */
export const COOKIE_SEMANA = "j40_semana";

/** Empresa del usuario con sus parámetros de programación (`empresas`). */
export type EmpresaPanel = {
  id: string;
  nombre: string;
  /** `empresas.tope_objetivo`: tope (h/semana) al que se programan las propuestas. */
  topeObjetivo: number;
  /** `empresas.costo_hora_default`: costo por hora (MXN) para colaboradores sin tarifa. */
  costoHoraDefault: number;
};

export type SucursalPanel = {
  id: string;
  nombre: string;
  ciudad: string | null;
  hub: string;
  /** Colaboradores con horas en su semana más reciente. */
  personas: number;
  horasAlDoble: number;
  fueraDeNorma: number;
};

export type SemanaPanel = {
  /** Lunes de la semana ISO, `YYYY-MM-DD`. */
  inicio: string;
  /** Domingo, `YYYY-MM-DD`. */
  fin: string;
  /** Número de semana ISO (1–53). */
  iso: number;
  /** Año calendario del lunes (el mismo que usa `tope_semanal` en la base). */
  anio: number;
};

export type SemanaHistorial = {
  /** Lunes de la semana, `YYYY-MM-DD`. */
  inicio: string;
  iso: number;
  /**
   * Horas arriba del tope legal del año de la semana (`v_resumen_sucursal_semana`).
   * Ojo: no es el tope de la propuesta; para comparar semanas entre sí usa
   * `costoBaseline`/`costoPropuesta`, que salen del motor con un mismo tope.
   */
  horasAlDoble: number;
  fueraDeNorma: number;
  colaboradores: number;
  /** `true` cuando la semana ya tiene una propuesta publicada (`v_ahorro_escenario`). */
  programada: boolean;
  /** Ahorro semanal de la propuesta publicada (MXN); ausente si no está programada. */
  ahorroMxn?: number;
  /** Costo laboral de la semana como está hoy (MXN, `v_ahorro_escenario`); sólo si está programada. */
  costoBaseline?: number;
  /** Costo laboral con la propuesta (MXN); sólo si está programada. */
  costoPropuesta?: number;
  /** Tope (h/semana) con el que se programó; sólo si está programada. */
  tope?: number;
  /** Cobertura pico de la propuesta (0–100); null sin intervalos pico; ausente si no está programada. */
  coberturaPicoPropuestaPct?: number | null;
};

/** Un intervalo de 30 min de `cobertura_intervalo`, con los dos escenarios unidos por `inicio`. */
export type CoberturaPanel = {
  /** Inicio del intervalo (ISO 8601 con zona). */
  inicio: string;
  /** Personas requeridas por la demanda. */
  requerido: number;
  /** Personas asignadas hoy (baseline). */
  hoy: number;
  /** Personas asignadas con la propuesta. */
  propuesta: number;
  esPico: boolean;
};

/**
 * Propuesta publicada de la sucursal-semana mostrada: una fila de
 * `v_ahorro_escenario` (último baseline vs última propuesta publicados) con
 * el detalle de `resumen_escenario` del baseline y de la propuesta. Ninguna
 * cifra se recalcula en el panel: todo sale de Postgres.
 */
export type ProgramacionPanel = {
  propuestaId: string;
  baselineId: string;
  /** `escenarios.tope_semanal` de la propuesta (h/semana). */
  tope: number;
  costoBaseline: number;
  costoPropuesta: number;
  ahorroMxn: number;
  /** Porcentaje 0–100 sobre el costo baseline. */
  ahorroPct: number;
  /** Costo de las horas al doble en el baseline (MXN). */
  costoDoblesBaseline: number;
  horasDoblesBaseline: number;
  costoSobrestaffingBaseline: number;
  costoSobrestaffingPropuesta: number;
  /** null cuando la semana no tiene intervalos pico. */
  coberturaPicoBaselinePct: number | null;
  coberturaPicoPropuestaPct: number | null;
  /** Horas-persona que faltan en intervalos pico con la propuesta. */
  deficitPicoHoras: number;
  /** `escenarios.publicado_en` de la propuesta (ISO 8601); null si no consta. */
  publicadoEn: string | null;
  /**
   * Cobertura por intervalo de 30 min de toda la semana (7 × 48), baseline y
   * propuesta unidos por `inicio`. Vacío si el escenario no la materializó.
   */
  cobertura: CoberturaPanel[];
};

/**
 * Todo lo que necesita el panel para una sucursal y una semana. Es un objeto
 * plano (serializable) para poder pasarlo de servidor a cliente.
 */
export type DatosPanel = {
  origen: "supabase" | "demo";
  /**
   * `sin-datos`: hay sesión de Supabase pero la empresa aún no tiene
   * sucursales u horarios importados. Va junto con `sinDatos: true`.
   */
  aviso: "sin-datos" | null;
  /**
   * `true` cuando hay sesión de Supabase pero no hay nada que mostrar (sin
   * empresa, sin sucursales o sin semanas importadas): el layout del panel
   * muestra la pantalla de onboarding (subir el primer CSV) en lugar del
   * shell, y `personas`/`sucursales`/`semanas` vienen vacíos. Siempre `false`
   * en modo demo (sin Supabase).
   */
  sinDatos: boolean;
  /** Supabase configurado pero sin usuario en la petición: el layout redirige a /login. */
  sinSesion?: boolean;
  empresa: EmpresaPanel | null;
  sucursales: SucursalPanel[];
  /** Sucursal seleccionada. */
  sucursal: { id: string; nombre: string } | null;
  semana: SemanaPanel | null;
  /**
   * Tope con el que se calculan `antes`, `despues` y la columna reacomodada:
   * el de la propuesta publicada si la hay; si no, el objetivo de la reforma
   * (40 h, `TOPE_2030`), que es lo que el producto optimiza. En demo, 46 h.
   */
  tope: number;
  /** Tope legal del año de la semana (`topes_semanales`), sólo informativo. */
  topeLegal: number;
  /** Año al que corresponde `topeLegal` (en demo, 2027). */
  topeAnio: number;
  /** Tope legal del año anterior, para el delta de la tarjeta; null si no se conoce. */
  topeAnterior: number | null;
  tope2030: number;
  personas: JornadaPersona[];
  antes: JornadaResumen;
  despues: JornadaResumen;
  antes2030: JornadaResumen;
  /** Historial de la sucursal, ascendente por semana. */
  semanas: SemanaHistorial[];
  /** Propuesta publicada para la sucursal-semana mostrada; null si aún no se programó. */
  programacion: ProgramacionPanel | null;
};

/* ---------- Reporte ejecutivo (Postgres: resumen_escenario → v_ahorro_escenario → reporte_ejecutivo) ---------- */

/** Una fila de `reporte_ejecutivo()`: la empresa agregada por semana ISO. */
export type FilaReporte = {
  /** Lunes de la semana ISO, `YYYY-MM-DD`. */
  semanaIso: string;
  /** Sucursales con baseline y propuesta publicados esa semana. */
  tiendas: number;
  costoBaseline: number;
  costoPropuesta: number;
  ahorroMxn: number;
  /** Porcentaje 0–100 sobre el costo baseline. */
  ahorroPct: number;
  ahorroDobles: number;
  ahorroTriples: number;
  ahorroPrima: number;
  ahorroSobrestaffing: number;
  horasBaseline: number;
  horasPropuesta: number;
  /** Promedio por tienda del % de intervalos pico cubiertos (0–100). */
  coberturaPicoBaselinePct: number;
  coberturaPicoPropuestaPct: number;
  tiendasConSubdotacionPico: number;
  /** Horas-persona que faltan en intervalos pico con la propuesta. */
  deficitPicoHoras: number;
};

/**
 * Suma de todas las semanas de `reporte_ejecutivo()`. `tiendas` y
 * `tiendasConSubdotacionPico` cuentan sucursales distintas (no tienda-semanas);
 * `ahorroPct` = ahorro / costo baseline y las coberturas son promedio ponderado
 * por tiendas.
 */
export type TotalReporte = Omit<FilaReporte, "semanaIso"> & {
  /** Número de semanas agregadas. */
  semanas: number;
  /** Lunes de la primera y última semana; null sin datos. */
  desde: string | null;
  hasta: string | null;
};

/** Una fila de `v_ahorro_escenario` con el nombre de la sucursal. */
export type SucursalReporte = {
  sucursalId: string;
  nombre: string;
  semanaIso: string;
  costoBaseline: number;
  costoPropuesta: number;
  ahorroMxn: number;
  ahorroPct: number;
  /** null cuando la semana no tiene intervalos pico. */
  coberturaPicoPropuestaPct: number | null;
  deficitPicoHoras: number;
};

/** Datos de la pestaña Reportes. Objeto plano (serializable) para pasar de servidor a cliente. */
export type DatosReporte = {
  origen: "supabase" | "demo";
  /** `sin-datos`: hay sesión pero la empresa aún no tiene escenarios publicados. */
  aviso: "sin-datos" | null;
  empresa: { id: string; nombre: string } | null;
  /** Tope semanal de las propuestas (el más frecuente en `v_ahorro_escenario`). */
  tope: number;
  /** Filas de `reporte_ejecutivo()`, ascendentes por semana. */
  semanas: FilaReporte[];
  total: TotalReporte;
  /** Todas las tienda-semanas de `v_ahorro_escenario`, de menor a mayor ahorro %. */
  porSucursal: SucursalReporte[];
  /** Las 5 tienda-semanas con mayor ahorro %. */
  mejores: SucursalReporte[];
};
