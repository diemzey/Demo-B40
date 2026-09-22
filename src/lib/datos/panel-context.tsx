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
  reporte: DatosReporte;
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

/** Reporte ejecutivo (pestaña Reportes), cargado junto al panel en el layout. */
export function useReporte(): DatosReporte {
  const reporte = useContext(ReporteContext);
  if (!reporte) {
    throw new Error("useReporte() debe usarse dentro de <PanelProvider> (src/app/dashboard/layout.tsx).");
  }
  return reporte;
}
