import type { JornadaPersona, JornadaResumen } from "@/components/ui/jornada-artefacto";

/** Tope legal ordinario a partir de 2030 (h/semana). */
export const TOPE_2030 = 40;

/** Nombre de la cookie con la sucursal elegida en el panel (uuid de `sucursales`). */
export const COOKIE_SUCURSAL = "j40_sucursal";

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
  horasAlDoble: number;
  fueraDeNorma: number;
  colaboradores: number;
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
  empresa: { id: string; nombre: string } | null;
  sucursales: SucursalPanel[];
  /** Sucursal seleccionada. */
  sucursal: { id: string; nombre: string } | null;
  semana: SemanaPanel | null;
  /** Tope vigente para la semana mostrada. */
  tope: number;
  /** Año al que corresponde `tope` (en demo, 2027). */
  topeAnio: number;
  /** Tope del año anterior, para el delta de la tarjeta; null si no se conoce. */
  topeAnterior: number | null;
  tope2030: number;
  personas: JornadaPersona[];
  antes: JornadaResumen;
  despues: JornadaResumen;
  antes2030: JornadaResumen;
  /** Historial de la sucursal, ascendente por semana. */
  semanas: SemanaHistorial[];
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
