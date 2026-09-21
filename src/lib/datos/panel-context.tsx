"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { DatosPanel } from "@/lib/datos/tipos";

/**
 * Lleva los `DatosPanel` cargados en el servidor (layout del panel) a las
 * pestañas cliente del shell. Sólo transporta datos ya serializados.
 */
const PanelContext = createContext<DatosPanel | null>(null);

export function PanelProvider({ datos, children }: { datos: DatosPanel; children: ReactNode }) {
  return <PanelContext.Provider value={datos}>{children}</PanelContext.Provider>;
}

export function usePanel(): DatosPanel {
  const datos = useContext(PanelContext);
  if (!datos) {
    throw new Error("usePanel() debe usarse dentro de <PanelProvider> (src/app/dashboard/layout.tsx).");
  }
  return datos;
}
