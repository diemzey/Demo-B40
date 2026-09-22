"use client";

import { useMemo } from "react";
import {
  Area,
  ComposedChart,
  Line,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from "recharts";
import {
  AMBAR,
  AXIS_TICK,
  HOY,
  Leyenda,
  Leyendas,
  REJILLA,
  TINTA_MUTED,
  TooltipCaja,
  TooltipFila,
  fmtH,
  fmtPct1,
} from "@/components/dashboard/charts";
import type { CoberturaPanel } from "@/lib/datos/tipos";
import { cn } from "@/lib/utils";

/*
 * Cobertura vs demanda de la semana: la única gráfica que explica por qué la
 * propuesta es válida (mantiene la cobertura donde hay demanda) y dónde falla
 * (picos sin cubrir). Datos de `cobertura_intervalo` para baseline y
 * propuesta (7 días × 48 intervalos de 30 min). Tres tintas: área gris de la
 * demanda, línea gris de hoy, línea ámbar de la propuesta.
 */

const ZONA = "America/Mexico_City";
const fmtDia = new Intl.DateTimeFormat("es-MX", { weekday: "short", timeZone: ZONA });
const fmtHora = new Intl.DateTimeFormat("es-MX", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: ZONA,
});
const fmtClaveDia = new Intl.DateTimeFormat("en-CA", { timeZone: ZONA }); // YYYY-MM-DD

const capitaliza = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).replace(".", "");

type Punto = CoberturaPanel & {
  i: number;
  dia: string;
  hora: string;
  /** La propuesta deja el pico por debajo de lo requerido. */
  sinCubrir: boolean;
};

type Tramo = { desde: number; hasta: number };

function TooltipCobertura({ active, payload }: TooltipContentProps) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as Punto;
  const personas = (v: number) => fmtPct1.format(v);
  return (
    <TooltipCaja
      titulo={
        <>
          {d.dia} {d.hora}
          {d.esPico && <span className="ml-1.5 font-normal text-amber-400">pico</span>}
        </>
      }
    >
      <TooltipFila color={TINTA_MUTED} etiqueta="Requiere" valor={personas(d.requerido)} tipo="rect" />
      <TooltipFila color={HOY} etiqueta="Hoy" valor={personas(d.hoy)} />
      <TooltipFila color={AMBAR} etiqueta="Propuesta" valor={personas(d.propuesta)} />
    </TooltipCaja>
  );
}

export function CoberturaSemana({
  cobertura,
  deficitPicoHoras = 0,
  className,
}: {
  cobertura: CoberturaPanel[];
  /** Horas-persona que faltan en picos con la propuesta (`resumen_escenario`). */
  deficitPicoHoras?: number;
  className?: string;
}) {
  const { puntos, iniciosDia, tramos, picos, sinCubrir, max } = useMemo(() => {
    const puntos: Punto[] = cobertura.map((c, i) => {
      const fecha = new Date(c.inicio);
      return {
        ...c,
        i,
        dia: capitaliza(fmtDia.format(fecha)),
        hora: fmtHora.format(fecha),
        sinCubrir: c.esPico && c.propuesta < c.requerido,
      };
    });
    // Un tick y una línea tenue por día (primer intervalo de cada fecha local).
    const iniciosDia: number[] = [];
    let diaPrevio = "";
    for (const p of puntos) {
      const clave = fmtClaveDia.format(new Date(p.inicio));
      if (clave !== diaPrevio) {
        iniciosDia.push(p.i);
        diaPrevio = clave;
      }
    }
    // Tramos contiguos de picos sin cubrir → un ReferenceArea por tramo.
    const tramos: Tramo[] = [];
    for (const p of puntos) {
      if (!p.sinCubrir) continue;
      const ultimo = tramos[tramos.length - 1];
      if (ultimo && ultimo.hasta === p.i - 1) ultimo.hasta = p.i;
      else tramos.push({ desde: p.i, hasta: p.i });
    }
    const picos = puntos.filter((p) => p.esPico).length;
    const sinCubrir = puntos.filter((p) => p.sinCubrir).length;
    const max = Math.max(1, ...puntos.map((p) => Math.max(p.requerido, p.hoy, p.propuesta)));
    return { puntos, iniciosDia, tramos, picos, sinCubrir, max };
  }, [cobertura]);

  if (puntos.length === 0) return null;

  const techo = Math.ceil(max * 1.1);
  const resumen =
    sinCubrir === 0
      ? `la propuesta cubre los ${fmtPct1.format(picos)} intervalos pico`
      : `${fmtPct1.format(sinCubrir)} de ${fmtPct1.format(picos)} intervalos pico quedan por debajo de lo requerido con la propuesta`;

  return (
    <figure className={cn("min-w-0", className)}>
      {/* En móvil la gráfica conserva su ancho útil y se desplaza en horizontal. */}
      <div className="-mx-1 overflow-x-auto px-1 [scrollbar-width:thin]">
        <div
          role="img"
          aria-label={`Cobertura de la semana por intervalo de 30 minutos, demanda contra personal de hoy y de la propuesta: ${resumen}.`}
          className="h-[220px] min-w-[720px]"
        >
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={puntos} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="cobertura-demanda" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={TINTA_MUTED} stopOpacity={0.28} />
                  <stop offset="100%" stopColor={TINTA_MUTED} stopOpacity={0.08} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="i"
                type="number"
                domain={[0, puntos.length - 1]}
                ticks={iniciosDia}
                tickFormatter={(v: number) => puntos[v]?.dia ?? ""}
                tick={AXIS_TICK}
                tickLine={false}
                axisLine={false}
                interval={0}
                tickMargin={6}
              />
              <YAxis
                domain={[0, techo]}
                tickCount={3}
                allowDecimals={false}
                tick={AXIS_TICK}
                tickLine={false}
                axisLine={false}
                width={26}
              />
              {iniciosDia.slice(1).map((i) => (
                <ReferenceLine key={i} x={i} stroke={REJILLA} strokeWidth={1} />
              ))}
              {tramos.map((t) => (
                <ReferenceArea
                  key={t.desde}
                  x1={t.desde - 0.5}
                  x2={t.hasta + 0.5}
                  fill={AMBAR}
                  fillOpacity={0.14}
                  stroke="none"
                  ifOverflow="hidden"
                />
              ))}
              <Tooltip
                cursor={{ stroke: TINTA_MUTED, strokeWidth: 1 }}
                content={TooltipCobertura}
                isAnimationActive={false}
              />
              <Area
                type="stepAfter"
                dataKey="requerido"
                name="Demanda requerida"
                stroke="none"
                fill="url(#cobertura-demanda)"
                isAnimationActive={false}
                activeDot={false}
              />
              <Line
                type="stepAfter"
                dataKey="hoy"
                name="Hoy"
                stroke={HOY}
                strokeWidth={1.5}
                dot={false}
                activeDot={{ r: 3, fill: HOY, stroke: "var(--card)", strokeWidth: 2 }}
                isAnimationActive={false}
              />
              <Line
                type="stepAfter"
                dataKey="propuesta"
                name="Propuesta"
                stroke={AMBAR}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 3, fill: AMBAR, stroke: "var(--card)", strokeWidth: 2 }}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
      <Leyendas>
        <Leyenda color={TINTA_MUTED} tipo="area">
          Demanda requerida
        </Leyenda>
        <Leyenda color={HOY} tipo="line">
          Hoy
        </Leyenda>
        <Leyenda color={AMBAR} tipo="line">
          Propuesta
        </Leyenda>
        {sinCubrir > 0 && (
          <Leyenda color={AMBAR} tipo="area">
            Picos sin cubrir
            {deficitPicoHoras > 0 && <> · faltan {fmtH.format(deficitPicoHoras)} h</>}
          </Leyenda>
        )}
      </Leyendas>
    </figure>
  );
}
