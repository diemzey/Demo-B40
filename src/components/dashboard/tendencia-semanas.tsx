"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from "recharts";
import {
  AHORRO,
  AMBAR,
  AXIS_TICK,
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
} from "@/components/dashboard/charts";
import type { SemanaHistorial } from "@/lib/datos/tipos";
import { rangoCorto, semanaDesdeLunes } from "@/lib/datos/semana";

/*
 * Tendencia por semana: costo de hoy (gris) contra costo con la propuesta
 * (ámbar) y el ahorro acumulado (verde) en el mismo eje (todo en MXN). Las
 * semanas sin propuesta aparecen en el eje sin barras: la serie se mide
 * siempre con el tope de la propuesta, nunca contra el tope legal del año.
 */

type Punto = {
  inicio: string;
  etiqueta: string;
  rango: string;
  costoBaseline: number | null;
  costoPropuesta: number | null;
  ahorro: number | null;
  acumulado: number;
};

function TooltipSemana({ active, payload }: TooltipContentProps) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as Punto;
  return (
    <TooltipCaja
      titulo={
        <>
          {d.etiqueta} <span className="font-normal text-muted-foreground">· {d.rango}</span>
        </>
      }
    >
      {d.costoBaseline === null ? (
        <>
          <dt className="text-muted-foreground">Sin propuesta</dt>
          <dd />
        </>
      ) : (
        <>
          <TooltipFila color={HOY} etiqueta="Hoy" valor={fmtMXN.format(d.costoBaseline)} tipo="rect" />
          <TooltipFila color={AMBAR} etiqueta="Propuesta" valor={fmtMXN.format(d.costoPropuesta ?? 0)} tipo="rect" />
          <TooltipFila color={AHORRO} etiqueta="Ahorro" valor={fmtMXN.format(d.ahorro ?? 0)} />
        </>
      )}
      <TooltipFila color={AHORRO} etiqueta="Acumulado" valor={fmtMXN.format(d.acumulado)} />
    </TooltipCaja>
  );
}

export function TendenciaSemanas({ semanas }: { semanas: SemanaHistorial[] }) {
  const data = semanas.reduce<Punto[]>((acc, s) => {
    const previo = acc.length ? acc[acc.length - 1].acumulado : 0;
    acc.push({
      inicio: s.inicio,
      etiqueta: `S${s.iso}`,
      rango: rangoCorto(semanaDesdeLunes(s.inicio)),
      costoBaseline: s.costoBaseline ?? null,
      costoPropuesta: s.costoPropuesta ?? null,
      ahorro: s.ahorroMxn ?? null,
      acumulado: previo + (s.ahorroMxn ?? 0),
    });
    return acc;
  }, []);
  const acumulado = data.length ? data[data.length - 1].acumulado : 0;
  const programadas = semanas.filter((s) => s.programada);
  const sinPropuesta = semanas.length - programadas.length;
  const topes = [...new Set(programadas.map((s) => s.tope).filter((t): t is number => t !== undefined))];
  const max = Math.max(1, ...data.map((d) => Math.max(d.costoBaseline ?? 0, d.acumulado)));
  const techo = Math.ceil((max * 1.1) / 1000) * 1000;

  return (
    <figure>
      <div
        role="img"
        aria-label={`Costo semanal de hoy contra la propuesta en ${fmtInt.format(semanas.length)} semanas; ahorro acumulado ${fmtMXN.format(acumulado)}.`}
        className="h-[180px] w-full"
      >
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barGap={2} barCategoryGap="30%">
            <CartesianGrid vertical={false} stroke={REJILLA} strokeWidth={1} />
            <XAxis dataKey="etiqueta" tick={AXIS_TICK} tickLine={false} axisLine={false} interval={0} tickMargin={6} />
            <YAxis
              domain={[0, techo]}
              tickCount={3}
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={false}
              width={44}
              tickFormatter={fmtEjeMXN}
            />
            <Tooltip
              cursor={{ fill: "var(--foreground)", fillOpacity: 0.04 }}
              content={TooltipSemana}
              isAnimationActive={false}
            />
            <Bar dataKey="costoBaseline" name="Hoy" fill={HOY} fillOpacity={0.55} radius={[4, 4, 0, 0]} maxBarSize={14} isAnimationActive={false} />
            <Bar dataKey="costoPropuesta" name="Propuesta" fill={AMBAR} radius={[4, 4, 0, 0]} maxBarSize={14} isAnimationActive={false} />
            <Line
              type="monotone"
              dataKey="acumulado"
              name="Ahorro acumulado"
              stroke={AHORRO}
              strokeWidth={2}
              dot={{ r: 3, fill: AHORRO, stroke: "var(--card)", strokeWidth: 2 }}
              activeDot={{ r: 4, fill: AHORRO, stroke: "var(--card)", strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <Leyendas>
        <Leyenda color={TINTA_MUTED} tipo="rect">
          Costo hoy
        </Leyenda>
        <Leyenda color={AMBAR} tipo="rect">
          Costo con la propuesta
        </Leyenda>
        <Leyenda color={AHORRO} tipo="line">
          Ahorro acumulado
        </Leyenda>
        {sinPropuesta > 0 && (
          <span>
            {fmtInt.format(sinPropuesta)} {sinPropuesta === 1 ? "semana sin propuesta" : "semanas sin propuesta"} (sin barras)
          </span>
        )}
        {topes.length > 1 && <span>Topes distintos: {topes.map((t) => `${t} h`).join(", ")}</span>}
      </Leyendas>
    </figure>
  );
}
