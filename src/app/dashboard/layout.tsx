import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { obtenerDatosPanel } from "@/lib/datos/dashboard";
import { PanelProvider } from "@/lib/datos/panel-context";
import { obtenerReporte } from "@/lib/datos/reportes";

// Los datos dependen de la sesión (cookies): siempre en tiempo de petición.
export const dynamic = "force-dynamic";

/**
 * El sitio aplica el tema oscuro con la clase `dark` (ver globals.css), así
 * que el panel la lleva en su contenedor junto con `color-scheme: dark`.
 *
 * Carga los datos del panel y el reporte ejecutivo una vez por petición
 * (compartidos con la página vía React `cache`) y los reparte a las pestañas
 * cliente con `PanelProvider`.
 */
export default async function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  const [datos, reporte] = await Promise.all([obtenerDatosPanel(), obtenerReporte()]);
  return (
    <div className="dark min-h-dvh bg-background text-foreground" style={{ colorScheme: "dark" }}>
      <PanelProvider datos={datos} reporte={reporte}>
        <DashboardShell>{children}</DashboardShell>
      </PanelProvider>
    </div>
  );
}
