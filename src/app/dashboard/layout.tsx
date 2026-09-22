import { Suspense, type ReactNode } from "react";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { Onboarding } from "@/components/dashboard/onboarding";
import { obtenerDatosPanel } from "@/lib/datos/dashboard";
import { PanelProvider } from "@/lib/datos/panel-context";
import { obtenerReporte } from "@/lib/datos/reportes";
import DashboardLoading from "./loading";

// Los datos dependen de la sesión (cookies): siempre en tiempo de petición.
export const dynamic = "force-dynamic";

/**
 * El sitio aplica el tema oscuro con la clase `dark` (ver globals.css), así
 * que el panel la lleva en su contenedor junto con `color-scheme: dark`.
 *
 * La carga de datos vive en `PanelCargado`, dentro de un `Suspense`: el
 * esqueleto se envía de inmediato y el panel llega en cuanto Supabase
 * responde (login → panel, y cada `router.refresh()` tras importar o
 * programar). `loading.tsx` sólo cubre la página dentro del shell; este
 * `Suspense` cubre la espera del propio layout. Una cuenta real sin sucursales o sin semanas importadas
 * (`datos.sinDatos`) no ve datos de muestra: en lugar del shell se muestra el
 * onboarding para subir el primer CSV; al terminar, el refresh vuelve a
 * evaluar este layout y aparece el panel normal.
 */
export default function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  return (
    <div className="dark min-h-dvh bg-background text-foreground" style={{ colorScheme: "dark" }}>
      <Suspense fallback={<EsqueletoPanel />}>
        <PanelCargado>{children}</PanelCargado>
      </Suspense>
    </div>
  );
}

async function PanelCargado({ children }: { children: ReactNode }) {
  const [datos, reporte] = await Promise.all([obtenerDatosPanel(), obtenerReporte()]);
  if (datos.sinSesion) redirect("/login?next=/dashboard");
  return (
    <PanelProvider datos={datos} reporte={reporte}>
      {datos.sinDatos ? <Onboarding /> : <DashboardShell>{children}</DashboardShell>}
    </PanelProvider>
  );
}

/**
 * Mientras llegan los datos del panel: la barra del header y el mismo
 * esqueleto que `loading.tsx` dibuja dentro del shell, para que el usuario vea
 * una sola pantalla de carga entre el login y el Diagnóstico.
 */
function EsqueletoPanel() {
  return (
    <div className="flex min-h-dvh flex-col">
      <div aria-hidden="true" className="h-14 shrink-0 border-b border-border/50 bg-card" />
      <DashboardLoading />
    </div>
  );
}
