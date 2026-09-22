/**
 * Esqueleto mientras el servidor arma la página del panel (Diagnóstico).
 * Se muestra dentro del `<main>` del shell (el layout ya resolvió los datos),
 * así que dibuja lo que va ahí: cabecera de página y tres bloques.
 */
import { LogoCargando } from "@/components/ui/logo-cargando";

function Bloque({ className }: { className: string }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-lg bg-muted ${className}`} />;
}

export default function DashboardLoading() {
  return (
    <div
      className="mx-auto w-full max-w-6xl p-4 md:p-6"
      role="status"
      aria-live="polite"
      aria-label="Cargando tu panel"
    >
      <div className="mb-6 flex items-center gap-3 text-muted-foreground">
        <LogoCargando size={28} label="" className="text-foreground" />
        <span className="text-[13px]">Cargando tu panel…</span>
      </div>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-2">
          <Bloque className="h-3 w-24" />
          <Bloque className="h-7 w-64" />
          <Bloque className="h-3 w-40" />
        </div>
        <Bloque className="h-9 w-36" />
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Bloque className="h-28" />
        <Bloque className="h-28" />
        <Bloque className="h-28" />
      </div>
      <Bloque className="mt-4 h-[420px]" />
    </div>
  );
}
