"use server";

import { obtenerReporte } from "@/lib/datos/reportes";
import type { DatosReporte } from "@/lib/datos/tipos";

/**
 * Acción de servidor para la pestaña Reportes: el reporte ejecutivo recorre
 * todas las sucursal-semanas de la empresa (`reporte_ejecutivo()`), así que
 * se pide sólo cuando la persona abre la pestaña, no en cada render del panel.
 */
export async function cargarReporte(): Promise<DatosReporte> {
  return obtenerReporte();
}
