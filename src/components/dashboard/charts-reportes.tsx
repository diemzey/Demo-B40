"use client";

import type { ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type LabelProps,
  type TooltipContentProps,
} from "recharts";

/*
 * Gráficas del reporte ejecutivo. Mismo lenguaje que `charts.tsx`: marcas
 * delgadas (≤ 12 px) con extremo redondeado, rejilla de un solo paso, texto
 * siempre con tokens de texto. Una sola serie (el ahorro) → un solo color;
 * el verde es estado ("ahorro"), el destructivo marca un componente que
 * encareció en lugar de ahorrar.
 */

/** Verde de ahorro (mismo que `text-emerald-400`). */
const AHORRO = "#34d399";
const DESTRUCTIVO = "var(--destructive)";
const TINTA_MUTED = "var(--muted-foreground)";
const REJILLA = "var(--border)";
const AXIS_TICK = { fill: TINTA_MUTED, fontSize: 11 } as const;

const fmtMXN = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});
const fmtPct = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 1 });
const fmtEjeMXN = (v: number) => {
  const abs = Math.abs(v);
  const s = abs >= 1_000_000 ? `$${fmtPct.format(abs / 1_000_000)}M` : abs >= 1000 ? `$${Math.round(abs / 1000)}k` : `$${abs}`;
  return v < 0 ? `−${s}` : s;
};

function TooltipCaja({ titulo, children }: { titulo: ReactNode; children: ReactNode }) {
  return (
    <div className="rounded-md border border-border bg-popover px-2.5 py-2 text-xs text-popover-foreground shadow-lg shadow-black/20">
      <p className="mb-1 font-medium">{titulo}</p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">{children}</dl>
    </div>
  );
}

function TooltipFila({ color, etiqueta, valor }: { color: string; etiqueta: string; valor: string }) {
  return (
    <>
      <dt className="flex items-center gap-1.5 text-muted-foreground">
        <span aria-hidden="true" className="inline-block h-0.5 w-3 rounded-full" style={{ backgroundColor: color }} />
        {etiqueta}
      </dt>
      <dd className="text-right font-semibold tabular-nums text-foreground">{valor}</dd>
    </>
  );
}

/** Etiqueta directa a la derecha de la barra, en una sola línea. */
function EtiquetaBarra(props: LabelProps) {
  const { viewBox, value } = props;
  if (!viewBox || !("width" in viewBox) || value == null) return <></>;
  return (
    <text
      x={viewBox.x + viewBox.width + 6}
      y={viewBox.y + viewBox.height / 2}
      dy={4}
      fill="var(--foreground)"
      fontSize={11}
      fontWeight={600}
    >
      {value}
    </text>
  );
}

function TickNombre(props: unknown) {
  const { x, y, payload } = props as { x: number; y: number; payload: { value: string } };
  return (
    <text x={x} y={y} dx={-6} dy={4} textAnchor="end" fill={TINTA_MUTED} fontSize={11}>
      {payload.value}
    </text>
  );
}

/* ---------- Desglose del ahorro ---------- */

export type DesgloseAhorro = {
  dobles: number;
  triples: number;
  prima: number;
  sobrestaffing: number;
};

type DesgloseDatum = { clave: keyof DesgloseAhorro; nombre: string; valor: number; etiqueta: string; parte: number };

const NOMBRES: Record<keyof DesgloseAhorro, string> = {
  dobles: "Horas dobles",
  triples: "Horas triples",
  prima: "Prima dominical",
  sobrestaffing: "Sobrestaffing",
};

function TooltipDesglose({ active, payload }: TooltipContentProps) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as DesgloseDatum;
  return (
    <TooltipCaja titulo={d.nombre}>
      <TooltipFila color={d.valor < 0 ? DESTRUCTIVO : AHORRO} etiqueta="Ahorro" valor={fmtMXN.format(d.valor)} />
      <TooltipFila color={AHORRO} etiqueta="Del total" valor={`${fmtPct.format(d.parte)} %`} />
    </TooltipCaja>
  );
}

/**
 * Barras horizontales con los cuatro componentes del ahorro
 * (`ahorro_dobles`, `ahorro_triples`, `ahorro_prima`, `ahorro_sobrestaffing`
 * de `reporte_ejecutivo()`), ordenadas de mayor a menor.
 */
export function DesgloseAhorroChart({ desglose, total }: { desglose: DesgloseAhorro; total: number }) {
  const data: DesgloseDatum[] = (Object.keys(NOMBRES) as Array<keyof DesgloseAhorro>)
    .map((clave) => {
      const valor = desglose[clave];
      return {
        clave,
        nombre: NOMBRES[clave],
        valor,
        etiqueta: fmtMXN.format(valor),
        parte: total > 0 ? (100 * valor) / total : 0,
      };
    })
    .sort((a, b) => b.valor - a.valor);
  const max = Math.max(1, ...data.map((d) => d.valor));
  const min = Math.min(0, ...data.map((d) => d.valor));
  const negativos = data.filter((d) => d.valor < 0);
  const mayor = data[0];

  return (
    <figure>
      <div
        role="img"
        aria-label={`Desglose del ahorro por componente; el mayor es ${mayor.nombre} con ${mayor.etiqueta} (${fmtPct.format(mayor.parte)} % del total).`}
        className="h-[132px] w-full"
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 4, right: 88, bottom: 0, left: 0 }} barCategoryGap={6}>
            <CartesianGrid horizontal={false} stroke={REJILLA} strokeWidth={1} />
            <XAxis
              type="number"
              domain={[min, max * 1.05]}
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={false}
              tickFormatter={fmtEjeMXN}
              tickCount={4}
            />
            <YAxis
              type="category"
              dataKey="nombre"
              width={104}
              tick={TickNombre}
              tickLine={false}
              axisLine={false}
              interval={0}
            />
            <Tooltip
              cursor={{ fill: "var(--foreground)", fillOpacity: 0.04 }}
              content={TooltipDesglose}
              isAnimationActive={false}
            />
            <Bar dataKey="valor" name="Ahorro" radius={[0, 4, 4, 0]} maxBarSize={12} minPointSize={2} isAnimationActive={false}>
              {data.map((d) => (
                <Cell key={d.clave} fill={d.valor < 0 ? DESTRUCTIVO : AHORRO} />
              ))}
              <LabelList dataKey="etiqueta" content={EtiquetaBarra} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="inline-block size-2.5 rounded-[3px]" style={{ backgroundColor: AHORRO }} />
          Ahorro (baseline − propuesta)
        </span>
        {negativos.length > 0 && (
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="inline-block size-2.5 rounded-[3px]" style={{ backgroundColor: DESTRUCTIVO }} />
            Encareció con la propuesta
          </span>
        )}
      </figcaption>
    </figure>
  );
}
