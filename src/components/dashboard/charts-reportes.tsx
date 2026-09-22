"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type LabelProps,
  type TooltipContentProps,
} from "recharts";
import {
  AHORRO,
  AMBAR,
  AXIS_TICK,
  DESTRUCTIVO,
  HOY,
  Leyenda,
  Leyendas,
  REJILLA,
  TINTA_MUTED,
  TooltipCaja,
  TooltipFila,
  fmtEjeMXN,
  fmtInt,
  fmtMXN,
  pct,
} from "@/components/dashboard/charts";
import type { FilaReporte } from "@/lib/datos/tipos";
import { numeroSemanaIso, rangoCorto, semanaDesdeLunes } from "@/lib/datos/semana";

/*
 * Gráficas del reporte de la empresa. Mismo lenguaje que `charts.tsx`:
 * gris = hoy, ámbar = propuesta, emerald = ahorro; texto con tokens de texto.
 */

/* ---------- Costo por semana: barras agrupadas hoy vs propuesta ---------- */

type PuntoSemana = {
  etiqueta: string;
  rango: string;
  tiendas: number;
  costoBaseline: number;
  costoPropuesta: number;
  ahorro: number;
  ahorroTexto: string;
};

function TooltipSemana({ active, payload }: TooltipContentProps) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as PuntoSemana;
  return (
    <TooltipCaja
      titulo={
        <>
          {d.etiqueta} <span className="font-normal text-muted-foreground">· {d.rango}</span>
        </>
      }
    >
      <TooltipFila color={HOY} etiqueta="Hoy" valor={fmtMXN.format(d.costoBaseline)} tipo="rect" />
      <TooltipFila color={AMBAR} etiqueta="Propuesta" valor={fmtMXN.format(d.costoPropuesta)} tipo="rect" />
      <TooltipFila color={AHORRO} etiqueta="Ahorro" valor={fmtMXN.format(d.ahorro)} />
      <dt className="text-muted-foreground">Sucursales</dt>
      <dd className="text-right tabular-nums">{fmtInt.format(d.tiendas)}</dd>
    </TooltipCaja>
  );
}

/** Etiqueta del ahorro sobre la barra de "hoy", una sola línea, en tinta de texto. */
function EtiquetaAhorro(props: LabelProps) {
  const { viewBox, value } = props;
  if (!viewBox || !("width" in viewBox) || value == null) return <></>;
  return (
    <text
      x={viewBox.x + viewBox.width}
      y={viewBox.y - 6}
      textAnchor="start"
      fill="var(--foreground)"
      fontSize={11}
      fontWeight={600}
    >
      {value}
    </text>
  );
}

export function AhorroPorSemanaChart({ semanas }: { semanas: FilaReporte[] }) {
  const data: PuntoSemana[] = semanas.map((s) => ({
    etiqueta: `S${numeroSemanaIso(s.semanaIso)}`,
    rango: rangoCorto(semanaDesdeLunes(s.semanaIso)),
    tiendas: s.tiendas,
    costoBaseline: s.costoBaseline,
    costoPropuesta: s.costoPropuesta,
    ahorro: s.ahorroMxn,
    ahorroTexto: `−${fmtMXN.format(Math.abs(s.ahorroMxn))}`,
  }));
  const max = Math.max(1, ...data.map((d) => d.costoBaseline));
  const total = data.reduce((a, d) => a + d.ahorro, 0);
  // Etiquetas directas sólo cuando caben (pocas semanas); el resto va al tooltip.
  const conEtiquetas = data.length <= 8;

  return (
    <figure>
      <div
        role="img"
        aria-label={`Costo laboral por semana, hoy contra la propuesta, en ${fmtInt.format(data.length)} semanas; ahorro total ${fmtMXN.format(total)}.`}
        className="h-[200px] w-full"
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 18, right: 8, bottom: 0, left: 0 }} barGap={2} barCategoryGap="28%">
            <CartesianGrid vertical={false} stroke={REJILLA} strokeWidth={1} />
            <XAxis dataKey="etiqueta" tick={AXIS_TICK} tickLine={false} axisLine={false} interval={0} tickMargin={6} />
            <YAxis
              domain={[0, Math.ceil((max * 1.15) / 1000) * 1000]}
              tickCount={3}
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={false}
              width={48}
              tickFormatter={fmtEjeMXN}
            />
            <Tooltip
              cursor={{ fill: "var(--foreground)", fillOpacity: 0.04 }}
              content={TooltipSemana}
              isAnimationActive={false}
            />
            <Bar dataKey="costoBaseline" name="Hoy" fill={HOY} fillOpacity={0.55} radius={[4, 4, 0, 0]} maxBarSize={18} isAnimationActive={false}>
              {conEtiquetas && <LabelList dataKey="ahorroTexto" content={EtiquetaAhorro} />}
            </Bar>
            <Bar dataKey="costoPropuesta" name="Propuesta" fill={AMBAR} radius={[4, 4, 0, 0]} maxBarSize={18} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <Leyendas>
        <Leyenda color={TINTA_MUTED} tipo="rect">
          Costo hoy
        </Leyenda>
        <Leyenda color={AMBAR} tipo="rect">
          Costo con la propuesta
        </Leyenda>
        {conEtiquetas && <span>La cifra sobre cada par es el ahorro de la semana.</span>}
      </Leyendas>
    </figure>
  );
}

/* ---------- De dónde sale el ahorro: barra apilada al 100 % ---------- */

export type DesgloseAhorro = {
  dobles: number;
  triples: number;
  prima: number;
  sobrestaffing: number;
};

const COMPONENTES: Array<{ clave: keyof DesgloseAhorro; nombre: string; color: string }> = [
  { clave: "dobles", nombre: "Horas dobles", color: "#34d399" },
  { clave: "triples", nombre: "Horas triples", color: "#10b981" },
  { clave: "prima", nombre: "Prima dominical", color: "#6ee7b7" },
  { clave: "sobrestaffing", nombre: "Personal de más", color: "#059669" },
];

type Parte = { clave: keyof DesgloseAhorro; nombre: string; color: string; valor: number; parte: number };

function TooltipDesglose({ active, payload }: TooltipContentProps) {
  if (!active || !payload?.length) return null;
  const partes = payload[0].payload as Record<string, unknown> & { partes: Parte[] };
  return (
    <TooltipCaja titulo="De dónde sale el ahorro">
      {partes.partes.map((p) => (
        <TooltipFila key={p.clave} color={p.color} etiqueta={p.nombre} valor={`${fmtMXN.format(p.valor)} · ${pct(p.parte)}`} tipo="rect" />
      ))}
    </TooltipCaja>
  );
}

/**
 * Una sola fila apilada al 100 % con los componentes del ahorro
 * (`ahorro_dobles`, `ahorro_triples`, `ahorro_prima`, `ahorro_sobrestaffing`
 * de `reporte_ejecutivo()`), de mayor a menor. Un componente negativo (la
 * propuesta encareció ese rubro) no entra en la barra y se anota debajo.
 */
export function DesgloseAhorroBarra({ desglose }: { desglose: DesgloseAhorro }) {
  const positivos = COMPONENTES.map((c) => ({ ...c, valor: desglose[c.clave] })).filter((c) => c.valor > 0);
  const negativos = COMPONENTES.map((c) => ({ ...c, valor: desglose[c.clave] })).filter((c) => c.valor < 0);
  const suma = positivos.reduce((a, c) => a + c.valor, 0);
  const partes: Parte[] = positivos
    .map((c) => ({ ...c, parte: suma > 0 ? (100 * c.valor) / suma : 0 }))
    .sort((a, b) => b.valor - a.valor);
  const fila: Record<string, number | Parte[]> = { partes };
  for (const p of partes) fila[p.clave] = p.parte;
  const mayor = partes[0];

  if (!mayor) {
    return <p className="py-4 text-xs text-muted-foreground">Sin ahorro que desglosar.</p>;
  }

  return (
    <figure>
      <div
        role="img"
        aria-label={`Desglose del ahorro: ${partes.map((p) => `${p.nombre} ${pct(p.parte)}`).join(", ")}.`}
        className="h-12 w-full"
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={[fila]} layout="vertical" margin={{ top: 4, right: 0, bottom: 4, left: 0 }} barCategoryGap={0}>
            <XAxis type="number" domain={[0, 100]} hide />
            <YAxis type="category" dataKey={() => ""} hide />
            <Tooltip cursor={false} content={TooltipDesglose} isAnimationActive={false} />
            {partes.map((p, i) => (
              <Bar
                key={p.clave}
                dataKey={p.clave}
                name={p.nombre}
                stackId="ahorro"
                fill={p.color}
                stroke="var(--card)"
                strokeWidth={2}
                radius={i === 0 ? [4, 0, 0, 4] : i === partes.length - 1 ? [0, 4, 4, 0] : 0}
                maxBarSize={40}
                isAnimationActive={false}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <Leyendas>
        {partes.map((p) => (
          <Leyenda key={p.clave} color={p.color} tipo="rect">
            {p.nombre} <span className="tabular-nums text-foreground">{pct(p.parte)}</span> ·{" "}
            <span className="tabular-nums">{fmtMXN.format(p.valor)}</span>
          </Leyenda>
        ))}
        {negativos.map((n) => (
          <Leyenda key={n.clave} color={DESTRUCTIVO} tipo="rect">
            {n.nombre} encareció {fmtMXN.format(Math.abs(n.valor))}
          </Leyenda>
        ))}
      </Leyendas>
    </figure>
  );
}
