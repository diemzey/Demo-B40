"use client";

import type { ComponentProps, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Piezas compartidas por el panel (pestañas, importación, onboarding).
 *
 * Reglas:
 *  - Un solo botón primario (amarillo) y un solo outline: `BotonPrimario` /
 *    `BotonOutline` (o las cadenas `botonPrimario` / `botonOutline` de
 *    `estilos.ts` para un `<a download>`). Son el mismo `Button` de
 *    `src/components/ui/button.tsx`.
 *  - Una sola cápsula: `Pill`.
 *  - Escala tipográfica: `j40-body` (13 px), `j40-muted` (12 px), `j40-eyebrow`
 *    (10 px mono). Definidas en `globals.css`.
 *  - Números y fechas: `fmtMXN`, `fmtHoras`, `fmtPct`, `fmtEntero`, `fmtFecha`,
 *    `fmtFechaHora`, `fmtSemana`, `fmtSemanaLarga` (todo `es-MX`), en `formato.ts`.
 *
 * Este archivo sólo exporta componentes (más el tipo `PillTone` y la cadena
 * literal `inputClass`) para que Fast Refresh conserve el estado; lo demás
 * vive en `estilos.ts` y `formato.ts`.
 */

/* ---------- Botones ---------- */

type BotonProps = Omit<ComponentProps<typeof Button>, "variant" | "size"> & {
  size?: "sm" | "default";
};

/** Botón principal (amarillo). Un solo primario por pantalla. */
export function BotonPrimario({ className, size = "sm", ...props }: BotonProps) {
  return <Button variant="primary" size={size} className={cn("gap-2", className)} {...props} />;
}

/** Botón secundario (contorno). */
export function BotonOutline({ className, size = "sm", ...props }: BotonProps) {
  return <Button variant="outline" size={size} className={cn("gap-2", className)} {...props} />;
}

/* ---------- Cabeceras y tarjetas ---------- */

/** Etiqueta de sección: 10 px mono, mayúsculas, gris. */
export function Eyebrow({ className, children }: { className?: string; children: ReactNode }) {
  return <p className={cn("j40-eyebrow", className)}>{children}</p>;
}

export function TabHeader({
  eyebrow = "Panel",
  title,
  subtitle,
  action,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <Eyebrow>{eyebrow}</Eyebrow>
        <h1 className="mt-1 text-xl font-semibold tracking-tight md:text-2xl">{title}</h1>
        {subtitle && <p className="j40-body mt-1 text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Panel({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn("rounded-lg border border-border bg-card shadow-lg shadow-black/5", className)}>
      {children}
    </div>
  );
}

export function PanelHeader({
  title,
  description,
  aside,
}: {
  title: ReactNode;
  description?: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 p-4 pb-2">
      <div className="space-y-0.5">
        <h2 className="j40-body font-semibold">{title}</h2>
        {description && <p className="j40-muted">{description}</p>}
      </div>
      {aside}
    </div>
  );
}

/* ---------- Cápsulas ---------- */

/**
 * Tonos de `Pill`:
 *  - good     cumple / en norma / programada
 *  - warn     atención: en el tope, cobertura justa
 *  - bad      excede / fuera de norma / error
 *  - neutral  sin dato, informativo
 *  - marca    amarillo de marca (p. ej. "Actual" en Semanas)
 *  - amber    alias de `warn` (compatibilidad); usar `warn` o `marca`.
 */
export type PillTone = "good" | "warn" | "bad" | "neutral" | "marca" | "amber";

const PILL: Record<PillTone, string> = {
  good: "bg-emerald-500/15 text-emerald-400",
  warn: "bg-amber-500/15 text-amber-400",
  amber: "bg-amber-500/15 text-amber-400",
  marca: "bg-yellow-400/15 text-yellow-300",
  bad: "bg-destructive/15 text-destructive",
  neutral: "bg-muted text-muted-foreground",
};

export function Pill({
  tone = "neutral",
  className,
  children,
  ...props
}: { tone?: PillTone; className?: string; children: ReactNode } & Omit<
  ComponentProps<"span">,
  "children" | "className"
>) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold leading-4 tabular-nums",
        PILL[tone],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}

/* ---------- Formularios ---------- */

export const inputClass =
  "h-10 w-full rounded-md border border-input bg-background px-2.5 text-[13px] text-foreground shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50 md:h-9";

export function Campo({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="j40-muted font-medium">
        {label}
      </label>
      {children}
      {hint && <p className="j40-muted">{hint}</p>}
    </div>
  );
}

export function Iniciales({ nombre, className }: { nombre: string; className?: string }) {
  const ini = nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-semibold text-muted-foreground ring-1 ring-border/60",
        className,
      )}
    >
      {ini || "?"}
    </span>
  );
}
