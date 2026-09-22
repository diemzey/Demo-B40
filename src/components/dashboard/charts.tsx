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
 * - Las tintas, `AXIS_TICK` y los formateadores están en `charts-tema.ts`;
 *   aquí sólo hay componentes (tooltip y leyenda), que no dependen de recharts.
 * - Cada gráfica (recharts) se carga con `next/dynamic` y `ssr: false` desde
 *   su archivo `*-grafica.tsx`; el módulo público conserva la misma API.
 */

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
