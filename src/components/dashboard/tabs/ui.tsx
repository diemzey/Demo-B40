"use client";

import type { ComponentProps, ReactNode } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Piezas compartidas por el panel (pestañas, importación, onboarding).
 *
 * Reglas:
 *  - Un solo botón primario (amarillo) y un solo outline: `BotonPrimario` /
 *    `BotonOutline` (o las cadenas `botonPrimario` / `botonOutline` para un
 *    `<a download>`). Son el mismo `Button` de `src/components/ui/button.tsx`.
 *  - Una sola cápsula: `Pill`.
 *  - Escala tipográfica: `j40-body` (13 px), `j40-muted` (12 px), `j40-eyebrow`
 *    (10 px mono). Definidas en `globals.css`.
 *  - Números y fechas: `fmtMXN`, `fmtHoras`, `fmtPct`, `fmtEntero`, `fmtFecha`,
 *    `fmtFechaHora`, `fmtSemana`, `fmtSemanaLarga` (todo `es-MX`).
 */

/* ---------- Botones ---------- */

/** Clases del botón primario del panel (36 px; 40 px en táctil). Para `<a download>`. */
export const botonPrimario = cn(buttonVariants({ variant: "primary", size: "sm" }), "gap-2");

/** Clases del botón outline del panel. Para `<a download>`. */
export const botonOutline = cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-2");

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

/** Tono de `Pill` para el estado de una persona frente al tope (`estadoDe` en jornada-artefacto). */
export const TONO_ESTADO: Record<"excede" | "limite" | "cumple", PillTone> = {
  excede: "bad",
  limite: "warn",
  cumple: "good",
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

/* ---------- Números y fechas (es-MX) ---------- */

const MENOS = "−";

/** Sustituye el guion ASCII inicial por el signo menos tipográfico. */
function signo(texto: string): string {
  return texto.replace(/^-/, MENOS);
}

const nfMXN = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});
const nfHoras = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 1 });
const nfPct = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 1 });
const nfEntero = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 0 });

/** "$205,680" · "−$2,610". Sin sufijo "MXN": el símbolo ya lo dice. */
export function fmtMXN(mxn: number): string {
  return signo(nfMXN.format(mxn));
}

/** "400 h" · "2,928.5 h" · "−400 h". */
export function fmtHoras(h: number): string {
  return `${signo(nfHoras.format(h))} h`;
}

/** "13.5 %" (espacio fino antes del signo, como en el hero). Recibe 0–100. */
export function fmtPct(pct: number): string {
  return `${signo(nfPct.format(pct))} %`;
}

/** "72" · "1,250". */
export function fmtEntero(n: number): string {
  return signo(nfEntero.format(n));
}

/** Antepone "+" a los positivos; los negativos ya traen "−". */
export function conSigno(texto: string, valor: number): string {
  return valor > 0 ? `+${texto}` : texto;
}

function aDate(fecha: string | Date): Date {
  if (fecha instanceof Date) return fecha;
  // `YYYY-MM-DD` es medianoche UTC; un ISO 8601 completo se interpreta tal cual.
  return fecha.length === 10 ? new Date(`${fecha}T00:00:00Z`) : new Date(fecha);
}

/** Quita el punto de las abreviaturas ("sep." → "sep") que algunos navegadores añaden. */
function sinPuntos(texto: string): string {
  return texto.replace(/\./g, "");
}

const dfCorto = new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short", timeZone: "UTC" });
const dfCortoAnio = new Intl.DateTimeFormat("es-MX", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});
const dfLargo = new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "long", timeZone: "UTC" });
const dfDia = new Intl.DateTimeFormat("es-MX", { day: "numeric", timeZone: "UTC" });
const dfMesCorto = new Intl.DateTimeFormat("es-MX", { month: "short", timeZone: "UTC" });
const dfMesLargo = new Intl.DateTimeFormat("es-MX", { month: "long", timeZone: "UTC" });
const dfFechaHora = new Intl.DateTimeFormat("es-MX", {
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

/** "21 sep 2026" (fecha `YYYY-MM-DD` o ISO 8601). */
export function fmtFecha(fecha: string | Date): string {
  return sinPuntos(dfCortoAnio.format(aDate(fecha)));
}

/** "21 sep, 8:01 pm" en la zona del navegador (sin puntos); para "publicado el". */
export function fmtFechaHora(fecha: string | Date): string {
  return sinPuntos(dfFechaHora.format(aDate(fecha)))
    .replace(/\s*([ap])\s?m$/i, " $1m")
    .replace(/\s{2,}/g, " ")
    .trim();
}

type Semana = { inicio: string; fin: string };

function mismoMes(a: Date, b: Date): boolean {
  return a.getUTCFullYear() === b.getUTCFullYear() && a.getUTCMonth() === b.getUTCMonth();
}

/** Forma corta: "20 – 26 jul" · "27 jul – 2 ago". Para tablas y cápsulas. */
export function fmtSemana(semana: Semana): string {
  const a = aDate(semana.inicio);
  const b = aDate(semana.fin);
  if (mismoMes(a, b)) return `${dfDia.format(a)} – ${dfDia.format(b)} ${sinPuntos(dfMesCorto.format(b))}`;
  return `${sinPuntos(dfCorto.format(a))} – ${sinPuntos(dfCorto.format(b))}`;
}

/** Forma larga: "semana del 20 al 26 de julio" · "semana del 27 de julio al 2 de agosto". Para títulos. */
export function fmtSemanaLarga(semana: Semana): string {
  const a = aDate(semana.inicio);
  const b = aDate(semana.fin);
  if (mismoMes(a, b)) return `semana del ${dfDia.format(a)} al ${dfDia.format(b)} de ${dfMesLargo.format(b)}`;
  return `semana del ${dfLargo.format(a)} al ${dfLargo.format(b)}`;
}
