"use client";

import type { ReactNode } from "react";
import { useConfig } from "@/components/dashboard/tabs/use-local-store";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type LabelProps,
  type TooltipContentProps,
} from "recharts";

/*
 * Lenguaje de gráficas del panel (skill dataviz):
 * - Marcas delgadas (barras ≤ 12 px, líneas 2 px), extremos redondeados 4 px
 *   anclados a la base, rejilla de un solo paso sobre la superficie y sin guiones.
 * - El color hace un solo trabajo: `--destructive` = exceso sobre el tope
 *   (estado), ámbar = el tope (referencia), gris = contexto.
 * - Texto siempre con tokens de texto (`--muted-foreground`, `--foreground`),
 *   nunca con el color de la serie.
 * - Cada gráfica lleva tooltip, `figcaption` y su tabla gemela (la tabla de
 *   colaboradores en la misma página).
 */

/** Tope por defecto (transitorio 2027, h/semana); la página pasa el vigente. */
const TOPE_DEFAULT = 46;
/** Ámbar de marca (mismo que `text-amber-400` en el resto del panel). */
const AMBAR = "#f0a63a";
const DESTRUCTIVO = "var(--destructive)";
const NEUTRO = "var(--chart-2)";
const TINTA_MUTED = "var(--muted-foreground)";
const REJILLA = "var(--border)";

const AXIS_TICK = { fill: TINTA_MUTED, fontSize: 11 } as const;

export type PersonaHoras = {
  nombre: string;
  hoy: number;
  reacomodada: number;
};

const fmtH = new Intl.NumberFormat("es-MX", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const fmtInt = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 0 });
const fmtMXN = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

/* ---------- Tooltip compartido ---------- */

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
        <span
          aria-hidden="true"
          className="inline-block h-0.5 w-3 rounded-full"
          style={{ backgroundColor: color }}
        />
        {etiqueta}
      </dt>
      <dd className="text-right font-semibold tabular-nums text-foreground">{valor}</dd>
    </>
  );
}

/**
 * Etiqueta directa a la derecha de una barra horizontal, en una sola línea
 * (el `Text` de recharts parte las etiquetas largas). `soloIndice` limita la
 * etiqueta a una barra: la extrema, para no poner un número en cada punto.
 */
function EtiquetaBarra({ soloIndice }: { soloIndice?: number }) {
  return function Etiqueta(props: LabelProps) {
    const { viewBox, value, index } = props;
    if (!viewBox || !("width" in viewBox) || value == null) return <></>;
    if (soloIndice !== undefined && index !== soloIndice) return <></>;
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
  };
}

/** Tick de eje Y en una sola línea (sin partir nombres largos). */
function TickNombre(props: unknown) {
  const { x, y, payload } = props as { x: number; y: number; payload: { value: string } };
  return (
    <text x={x} y={y} dx={-6} dy={4} textAnchor="end" fill={TINTA_MUTED} fontSize={11}>
      {payload.value}
    </text>
  );
}

/* ---------- 1. Horas por colaborador ---------- */

type PersonaDatum = PersonaHoras & { exceso: number; etiqueta: string };

function TooltipPersona({ active, payload }: TooltipContentProps) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as PersonaDatum;
  return (
    <TooltipCaja titulo={d.nombre}>
      <TooltipFila
        color={d.exceso > 0 ? DESTRUCTIVO : NEUTRO}
        etiqueta="Hoy"
        valor={`${fmtH.format(d.hoy)} h`}
      />
      <TooltipFila color={AMBAR} etiqueta="Reacomodada" valor={`${fmtH.format(d.reacomodada)} h`} />
      {d.exceso > 0 && (
        <TooltipFila color={DESTRUCTIVO} etiqueta="Al doble" valor={`${fmtH.format(d.exceso)} h`} />
      )}
    </TooltipCaja>
  );
}

export function HorasPorPersonaChart({
  personas,
  tope = TOPE_DEFAULT,
  topeAnio,
}: {
  personas: PersonaHoras[];
  tope?: number;
  /** Año del tope para la leyenda ("Tope 2027"). */
  topeAnio?: number;
}) {
  const data: PersonaDatum[] = [...personas]
    .sort((a, b) => b.hoy - a.hoy)
    .map((p) => ({
      ...p,
      exceso: Math.max(0, p.hoy - tope),
      etiqueta: `${fmtH.format(p.hoy)} h`,
    }));
  const fuera = data.filter((d) => d.exceso > 0).length;
  const alto = data.length * 17 + 28;

  return (
    <figure>
      <div
        role="img"
        aria-label={`Horas semanales de ${data.length} colaboradores ordenadas de mayor a menor; ${fuera} superan el tope de ${tope} horas.`}
        style={{ height: alto }}
        className="w-full"
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 18, right: 40, bottom: 0, left: 0 }}
            barCategoryGap={5}
          >
            <CartesianGrid horizontal={false} stroke={REJILLA} strokeWidth={1} />
            <XAxis
              type="number"
              domain={[0, 60]}
              ticks={[0, 20, 40, 60]}
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => `${v} h`}
            />
            <YAxis
              type="category"
              dataKey="nombre"
              width={128}
              tick={TickNombre}
              tickLine={false}
              axisLine={false}
              interval={0}
            />
            <Tooltip
              cursor={{ fill: "var(--foreground)", fillOpacity: 0.04 }}
              content={TooltipPersona}
              isAnimationActive={false}
            />
            <ReferenceLine
              x={tope}
              stroke={AMBAR}
              strokeWidth={1.5}
              ifOverflow="visible"
              label={{
                value: `Tope ${tope} h`,
                position: "top",
                fill: "var(--foreground)",
                fontSize: 11,
                fontWeight: 600,
              }}
            />
            <Bar dataKey="hoy" name="Hoy" radius={[0, 4, 4, 0]} maxBarSize={12} isAnimationActive={false}>
              {data.map((d) => (
                <Cell key={d.nombre} fill={d.exceso > 0 ? DESTRUCTIVO : NEUTRO} />
              ))}
              {/* Etiqueta directa solo en el extremo: el resto va al tooltip y a la tabla. */}
              <LabelList dataKey="etiqueta" content={EtiquetaBarra({ soloIndice: 0 })} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
        <Leyenda color={DESTRUCTIVO} tipo="rect">
          Excede el tope
        </Leyenda>
        <Leyenda color={NEUTRO} tipo="rect">
          Dentro del tope
        </Leyenda>
        <Leyenda color={AMBAR} tipo="line">
          {topeAnio ? `Tope ${topeAnio} (${tope} h)` : `Tope (${tope} h)`}
        </Leyenda>
      </figcaption>
    </figure>
  );
}

function Leyenda({
  color,
  tipo,
  children,
}: {
  color: string;
  tipo: "rect" | "line";
  children: ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        aria-hidden="true"
        className={tipo === "rect" ? "inline-block size-2.5 rounded-[3px]" : "inline-block h-0.5 w-3.5 rounded-full"}
        style={{ backgroundColor: color }}
      />
      {children}
    </span>
  );
}

/* ---------- 2. Antes vs. reacomodada ---------- */

export type AntesDespues = {
  horasAntes: number;
  horasDespues: number;
  personasAntes: number;
  personasDespues: number;
  totalPersonas: number;
};

type ParDatum = { serie: "Hoy" | "Reacomodada"; valor: number; texto: string };

function TooltipPar({ active, payload, label }: TooltipContentProps) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as ParDatum;
  return (
    <TooltipCaja titulo={label}>
      <TooltipFila color={d.serie === "Hoy" ? DESTRUCTIVO : NEUTRO} etiqueta={d.serie} valor={d.texto} />
    </TooltipCaja>
  );
}

function ParBarras({
  titulo,
  data,
  max,
  unidad,
}: {
  titulo: string;
  data: ParDatum[];
  max: number;
  unidad: string;
}) {
  return (
    <div>
      <p className="mb-1 text-[11px] font-medium text-muted-foreground">{titulo}</p>
      <div
        role="img"
        aria-label={`${titulo}: hoy ${data[0].texto}, reacomodada ${data[1].texto}.`}
        className="h-[60px] w-full"
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 2, right: 64, bottom: 2, left: 0 }}
            barCategoryGap={4}
          >
            <XAxis type="number" domain={[0, max]} hide />
            <YAxis
              type="category"
              dataKey="serie"
              width={88}
              tick={TickNombre}
              tickLine={false}
              axisLine={false}
              interval={0}
            />
            <Tooltip
              cursor={{ fill: "var(--foreground)", fillOpacity: 0.04 }}
              content={(p) => <TooltipPar {...p} label={titulo} />}
              isAnimationActive={false}
            />
            <Bar
              dataKey="valor"
              name={unidad}
              radius={[0, 4, 4, 0]}
              maxBarSize={12}
              minPointSize={2}
              isAnimationActive={false}
              background={{ fill: "var(--foreground)", fillOpacity: 0.04, radius: 4 }}
            >
              {data.map((d) => (
                <Cell key={d.serie} fill={d.serie === "Hoy" ? DESTRUCTIVO : NEUTRO} />
              ))}
              <LabelList dataKey="texto" content={EtiquetaBarra({})} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function AntesDespuesChart({ resumen }: { resumen: AntesDespues }) {
  const horas: ParDatum[] = [
    { serie: "Hoy", valor: resumen.horasAntes, texto: `${fmtH.format(resumen.horasAntes)} h` },
    {
      serie: "Reacomodada",
      valor: resumen.horasDespues,
      texto: `${fmtH.format(resumen.horasDespues)} h`,
    },
  ];
  const personas: ParDatum[] = [
    {
      serie: "Hoy",
      valor: resumen.personasAntes,
      texto: `${fmtInt.format(resumen.personasAntes)} de ${resumen.totalPersonas}`,
    },
    {
      serie: "Reacomodada",
      valor: resumen.personasDespues,
      texto: `${fmtInt.format(resumen.personasDespues)} de ${resumen.totalPersonas}`,
    },
  ];
  // Cada medida lleva su propia escala: nunca dos magnitudes distintas en un mismo eje.
  return (
    <figure className="flex flex-col gap-3">
      <ParBarras
        titulo="Horas al doble"
        data={horas}
        max={Math.max(resumen.horasAntes, resumen.horasDespues, 1)}
        unidad="h"
      />
      <ParBarras
        titulo="Personas fuera de norma"
        data={personas}
        max={resumen.totalPersonas}
        unidad="personas"
      />
      <figcaption className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
        <Leyenda color={DESTRUCTIVO} tipo="rect">
          Hoy
        </Leyenda>
        <Leyenda color={NEUTRO} tipo="rect">
          Reacomodada
        </Leyenda>
      </figcaption>
    </figure>
  );
}

/* ---------- 3. Costo extra por semana ---------- */

export type SemanaHoras = { semana: number; horas: number };
type CostoSemana = SemanaHoras & { costo: number };

function TooltipCosto({ active, payload }: TooltipContentProps) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as CostoSemana;
  return (
    <TooltipCaja titulo={`Semana ${d.semana}`}>
      <TooltipFila color={DESTRUCTIVO} etiqueta="Costo extra" valor={fmtMXN.format(d.costo)} />
      <TooltipFila color={NEUTRO} etiqueta="Horas al doble" valor={`${fmtH.format(d.horas)} h`} />
    </TooltipCaja>
  );
}

const fmtEjeMXN = (v: number) => (v >= 1000 ? `$${Math.round(v / 1000)}k` : `$${v}`);

export function CostoSemanalChart({
  semanas,
  nota,
}: {
  semanas: SemanaHoras[];
  /** Pie de la gráfica; por defecto la nota de los datos de muestra. */
  nota?: ReactNode;
}) {
  const [{ costoHora }] = useConfig();
  const serie: CostoSemana[] = semanas.map((s) => ({ ...s, costo: s.horas * costoHora * 2 }));
  if (serie.length === 0) {
    return (
      <p className="py-8 text-center text-xs text-muted-foreground">Aún no hay semanas para esta sucursal.</p>
    );
  }
  const ultimo = serie[serie.length - 1];
  const max = Math.max(...serie.map((s) => s.costo));
  const techo = Math.max(5000, Math.ceil((max * 1.15) / 5000) * 5000);

  return (
    <figure>
      <div
        role="img"
        aria-label={`Costo extra semanal de la semana ${serie[0].semana} a la ${ultimo.semana}; la semana ${ultimo.semana} cierra en ${fmtMXN.format(ultimo.costo)}.`}
        className="h-[168px] w-full"
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={serie} margin={{ top: 18, right: 12, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="costo-wash" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={DESTRUCTIVO} stopOpacity={0.16} />
                <stop offset="100%" stopColor={DESTRUCTIVO} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke={REJILLA} strokeWidth={1} />
            <XAxis
              dataKey="semana"
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => `S${v}`}
              interval={0}
            />
            <YAxis
              domain={[0, techo]}
              ticks={[0, techo / 2, techo]}
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={false}
              width={40}
              tickFormatter={fmtEjeMXN}
            />
            <Tooltip
              cursor={{ stroke: TINTA_MUTED, strokeWidth: 1 }}
              content={TooltipCosto}
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="costo"
              name="Costo extra"
              stroke={DESTRUCTIVO}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
              fill="url(#costo-wash)"
              isAnimationActive={false}
              activeDot={{ r: 4, fill: DESTRUCTIVO, stroke: "var(--card)", strokeWidth: 2 }}
              dot={(props) => {
                const { cx, cy, index } = props as { cx: number; cy: number; index: number };
                if (index !== serie.length - 1) return <g key={index} />;
                return (
                  <g key={index}>
                    <circle cx={cx} cy={cy} r={4} fill={DESTRUCTIVO} stroke="var(--card)" strokeWidth={2} />
                    <text
                      x={cx}
                      y={cy - 10}
                      textAnchor="end"
                      fill="var(--foreground)"
                      fontSize={11}
                      fontWeight={600}
                    >
                      {fmtMXN.format(ultimo.costo)}
                    </text>
                  </g>
                );
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="mt-2 text-[11px] text-muted-foreground">
        {nota ?? (
          <>
            Semanas {serie[0].semana}–{ultimo.semana - 1}: datos de muestra; la semana {ultimo.semana}{" "}
            es la real (horas al doble × ${costoHora} × 2).
          </>
        )}
      </figcaption>
    </figure>
  );
}
