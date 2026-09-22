"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { CalendarDays } from "lucide-react";
import { usePanel } from "@/lib/datos/panel-context";
import { COOKIE_SEMANA } from "@/lib/datos/tipos";
import { rangoCorto, semanaDesdeLunes } from "@/lib/datos/semana";
import { cn } from "@/lib/utils";

/** Guarda la semana elegida (lunes `YYYY-MM-DD`) para que el panel la muestre. */
export function guardarSemana(inicio: string) {
  document.cookie = `${COOKIE_SEMANA}=${encodeURIComponent(inicio)}; path=/; max-age=31536000; samesite=lax`;
}

/**
 * Selector de semana del Diagnóstico: lista las semanas de la sucursal (más
 * reciente primero) y al cambiar guarda la cookie y recarga el panel.
 */
export function SelectorSemana({ className }: { className?: string }) {
  const datos = usePanel();
  const router = useRouter();
  const [pendiente, startTransition] = useTransition();
  const semanas = [...datos.semanas].sort((a, b) => b.inicio.localeCompare(a.inicio));
  if (semanas.length < 2 || !datos.semana) return null;

  return (
    <label className={cn("inline-flex items-center gap-2", className)}>
      <CalendarDays className="size-4 text-muted-foreground" strokeWidth={1.5} aria-hidden="true" />
      <span className="sr-only">Semana</span>
      <select
        value={datos.semana.inicio}
        disabled={pendiente}
        aria-busy={pendiente}
        onChange={(e) => {
          guardarSemana(e.target.value);
          startTransition(() => router.refresh());
        }}
        className="h-10 rounded-md border border-border/60 bg-card px-2.5 text-[13px] text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/60 disabled:opacity-60 md:h-9"
      >
        {semanas.map((s) => (
          <option key={s.inicio} value={s.inicio}>
            S{s.iso} · {rangoCorto(semanaDesdeLunes(s.inicio))}
            {s.programada ? "" : " · sin propuesta"}
          </option>
        ))}
      </select>
    </label>
  );
}

/** Botón "Ver" de la pestaña Semanas: elige la semana y abre el Diagnóstico. */
export function VerSemana({ inicio, actual }: { inicio: string; actual: boolean }) {
  const router = useRouter();
  const [pendiente, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pendiente}
      onClick={() => {
        if (!actual) guardarSemana(inicio);
        window.history.replaceState(null, "", window.location.pathname);
        window.dispatchEvent(new Event("hashchange"));
        if (!actual) startTransition(() => router.refresh());
      }}
      className="inline-flex h-8 items-center rounded-md border border-border/60 px-2.5 text-xs font-medium text-foreground transition-colors hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/60 disabled:opacity-60"
    >
      {pendiente ? "Abriendo…" : "Ver"}
    </button>
  );
}
