"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Piezas compartidas por las pestañas del panel (estilo Origin UI: compacto, 12–13 px). */

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
        <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-400">{eyebrow}</p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight md:text-2xl">{title}</h1>
        {subtitle && <p className="mt-1 text-[13px] text-muted-foreground">{subtitle}</p>}
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
        <h2 className="text-[13px] font-semibold">{title}</h2>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      {aside}
    </div>
  );
}

export type PillTone = "good" | "warn" | "bad" | "neutral" | "amber";

const PILL: Record<PillTone, string> = {
  good: "bg-emerald-500/15 text-emerald-400",
  warn: "bg-amber-500/15 text-amber-400",
  amber: "bg-amber-500/15 text-amber-400",
  bad: "bg-destructive/15 text-destructive",
  neutral: "bg-muted text-muted-foreground",
};

export function Pill({ tone = "neutral", children }: { tone?: PillTone; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold leading-4",
        PILL[tone],
      )}
    >
      {children}
    </span>
  );
}

export const inputClass =
  "h-8 w-full rounded-md border border-input bg-background px-2.5 text-[13px] text-foreground shadow-xs outline-none placeholder:text-muted-foreground/60 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50";

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
      <label htmlFor={htmlFor} className="text-xs font-medium text-muted-foreground">
        {label}
      </label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground/80">{hint}</p>}
    </div>
  );
}

export const botonPrimario =
  "inline-flex h-8 items-center justify-center gap-2 rounded-md bg-yellow-400 px-3 text-[13px] font-semibold text-neutral-950 transition-colors hover:bg-yellow-300 disabled:pointer-events-none disabled:opacity-50";

export const botonOutline =
  "inline-flex h-8 items-center justify-center gap-2 rounded-md border border-input bg-background px-3 text-[13px] font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50";

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
