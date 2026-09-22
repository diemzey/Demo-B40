"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { DatosPanel, DatosReporte } from "@/lib/datos/tipos";

/**
 * Lleva los `DatosPanel` (y el `DatosReporte`) cargados en el servidor
 * (layout del panel) a las pestañas cliente del shell. Sólo transporta datos
 * ya serializados.
 */
const PanelContext = createContext<DatosPanel | null>(null);
const ReporteContext = createContext<DatosReporte | null>(null);

export function PanelProvider({
  datos,
  reporte,
  children,
}: {
  datos: DatosPanel;
  /** null: se carga cuando se abre la pestaña Reportes (`cargarReporte`). */
  reporte: DatosReporte | null;
  children: ReactNode;
}) {
  return (
    <PanelContext.Provider value={datos}>
      <ReporteContext.Provider value={reporte}>{children}</ReporteContext.Provider>
    </PanelContext.Provider>
  );
}

export function usePanel(): DatosPanel {
  const datos = useContext(PanelContext);
  if (!datos) {
    throw new Error("usePanel() debe usarse dentro de <PanelProvider> (src/app/dashboard/layout.tsx).");
  }
  return datos;
}

/**
 * Reporte ejecutivo (pestaña Reportes). Es null hasta que la pestaña lo pide
 * con `cargarReporte()`: `reporte_ejecutivo()` recorre todas las
 * sucursal-semanas de la empresa y no debe pagarse en cada render del panel.
 */
export function useReporte(): DatosReporte | null {
  return useContext(ReporteContext);
}
