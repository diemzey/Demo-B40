import { PLANTILLA_COAPA, resumenDe } from "@/components/demo/plantilla-coapa";
import { TOPE_2027 } from "@/components/dashboard/colaboradores-table";

export type EstadoSemana = "Diagnosticada" | "Reacomodada" | "Pendiente";

export type Semana = {
  semana: number;
  /** Rango de fechas legible (es-MX). */
  fechas: string;
  horasAlDoble: number;
  fueraDeNorma: number;
  estado: EstadoSemana;
  /** Cifra real derivada de la plantilla; las demás son de muestra. */
  real: boolean;
};

export const SEMANA_ACTUAL = 31;

const real = resumenDe(PLANTILLA_COAPA, "hoy", TOPE_2027);

/**
 * Semanas 24–30: datos de muestra con variación suave; la 31 (actual) se
 * calcula de la plantilla de Coapa. Mismo origen para el panel y la pestaña.
 */
export const SEMANAS: Semana[] = [
  { semana: 24, fechas: "9–15 jun", horasAlDoble: 101.5, fueraDeNorma: 22, estado: "Reacomodada", real: false },
  { semana: 25, fechas: "16–22 jun", horasAlDoble: 108, fueraDeNorma: 24, estado: "Reacomodada", real: false },
  { semana: 26, fechas: "23–29 jun", horasAlDoble: 97.5, fueraDeNorma: 21, estado: "Reacomodada", real: false },
  { semana: 27, fechas: "30 jun – 6 jul", horasAlDoble: 114.5, fueraDeNorma: 26, estado: "Reacomodada", real: false },
  { semana: 28, fechas: "7–13 jul", horasAlDoble: 110.5, fueraDeNorma: 25, estado: "Reacomodada", real: false },
  { semana: 29, fechas: "14–20 jul", horasAlDoble: 119, fueraDeNorma: 27, estado: "Reacomodada", real: false },
  { semana: 30, fechas: "21–27 jul", horasAlDoble: 116.5, fueraDeNorma: 26, estado: "Pendiente", real: false },
  {
    semana: SEMANA_ACTUAL,
    fechas: "28 jul – 3 ago",
    horasAlDoble: real.horasAlDoble,
    fueraDeNorma: real.fueraDeNorma,
    estado: "Diagnosticada",
    real: true,
  },
];
