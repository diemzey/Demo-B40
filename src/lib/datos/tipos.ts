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
   * sucursales u horarios, así que se muestran datos de muestra.
   */
  aviso: "sin-datos" | null;
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
