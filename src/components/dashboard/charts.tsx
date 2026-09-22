"use client";

import type { ReactNode } from "react";

/*
 * Lenguaje de gráficas del panel (skill dataviz), compartido por
 * `cobertura-semana.tsx`, `tendencia-semanas.tsx` y `charts-reportes.tsx`:
 * - Marcas delgadas (barras ≤ 14 px, líneas 1.5–2 px), extremos redondeados
 *   4 px anclados a la base, rejilla de un solo paso y sin guiones.
 * - El color hace un solo trabajo: gris = hoy / contexto, ámbar = la
 *   propuesta o el tope, emerald = ahorro, `--destructive` = lo que duele hoy.
 *   Nunca dos magnitudes en un eje; máximo tres tintas por gráfica.
 * - Texto siempre con tokens de texto (`--muted-foreground`, `--foreground`),
 *   nunca con el color de la serie.
 * - Cada gráfica lleva tooltip, `figcaption` con leyenda y `aria-label`.
 * - Sin animación de entrada (`isAnimationActive={false}`): el gerente lee cifras quietas.
 */

/** Ámbar de marca (mismo que `text-amber-400` en el resto del panel). */
export const AMBAR = "#f0a63a";
/** Verde de ahorro (mismo que `text-emerald-400`). */
export const AHORRO = "#34d399";
export const DESTRUCTIVO = "var(--destructive)";
/** Gris de "hoy". */
export const HOY = "var(--muted-foreground)";
export const TINTA_MUTED = "var(--muted-foreground)";
export const REJILLA = "var(--border)";
export const SUPERFICIE = "var(--card)";

export const AXIS_TICK = { fill: TINTA_MUTED, fontSize: 11 } as const;

export const fmtH = new Intl.NumberFormat("es-MX", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
export const fmtInt = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 0 });
export const fmtMXN = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});
export const fmtPct1 = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 1 });
/** "13.5 %": porcentaje con un decimal y espacio fino antes del signo. */
export const pct = (v: number) => `${fmtPct1.format(v)} %`;

/** Eje en pesos abreviados: $12k · $1.4M; con signo tipográfico. */
export const fmtEjeMXN = (v: number) => {
  const abs = Math.abs(v);
  const s =
    abs >= 1_000_000 ? `$${fmtPct1.format(abs / 1_000_000)}M` : abs >= 1000 ? `$${Math.round(abs / 1000)}k` : `$${abs}`;
  return v < 0 ? `−${s}` : s;
};

/* ---------- Tooltip compartido ---------- */

export function TooltipCaja({ titulo, children }: { titulo: ReactNode; children: ReactNode }) {
  return (
    <div className="rounded-md border border-border bg-popover px-2.5 py-2 text-xs text-popover-foreground shadow-lg shadow-black/20">
      <p className="mb-1 font-medium">{titulo}</p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">{children}</dl>
    </div>
  );
}

export function TooltipFila({
  color,
  etiqueta,
  valor,
  tipo = "line",
}: {
  color: string;
  etiqueta: string;
  valor: string;
  tipo?: "line" | "rect";
}) {
  return (
    <>
      <dt className="flex items-center gap-1.5 text-muted-foreground">
        <span
          aria-hidden="true"
          className={tipo === "rect" ? "inline-block size-2.5 rounded-[3px]" : "inline-block h-0.5 w-3 rounded-full"}
          style={{ backgroundColor: color }}
        />
        {etiqueta}
      </dt>
      <dd className="text-right font-semibold tabular-nums text-foreground">{valor}</dd>
    </>
  );
}

/* ---------- Leyenda ---------- */

export function Leyenda({
  color,
  tipo,
  children,
}: {
  color: string;
  tipo: "rect" | "line" | "area";
  children: ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        aria-hidden="true"
        className={
          tipo === "rect"
            ? "inline-block size-2.5 rounded-[3px]"
            : tipo === "area"
              ? "inline-block h-2.5 w-3.5 rounded-[3px] opacity-40"
              : "inline-block h-0.5 w-3.5 rounded-full"
        }
        style={{ backgroundColor: color }}
      />
      {children}
    </span>
  );
}

export function Leyendas({ children }: { children: ReactNode }) {
  return (
    <figcaption className="j40-muted mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
      {children}
    </figcaption>
  );
}
