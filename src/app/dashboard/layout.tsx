import { DashboardShell } from "@/components/dashboard/dashboard-shell";

/**
 * El sitio aplica el tema oscuro con la clase `dark` (ver globals.css), así
 * que el panel la lleva en su contenedor junto con `color-scheme: dark`.
 */
export default function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  return (
    <div className="dark min-h-dvh bg-background text-foreground" style={{ colorScheme: "dark" }}>
      <DashboardShell>{children}</DashboardShell>
    </div>
  );
}
