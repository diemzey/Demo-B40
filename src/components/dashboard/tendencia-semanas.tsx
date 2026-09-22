"use client";

import dynamic from "next/dynamic";
import { Leyenda, Leyendas } from "@/components/dashboard/charts";
import { AHORRO, AMBAR, TINTA_MUTED } from "@/components/dashboard/charts-tema";
import type { SemanaHistorial } from "@/lib/datos/tipos";

/*
 * Tendencia por semana. La gráfica (recharts) vive en
 * `tendencia-semanas-grafica.tsx` y se carga sólo en el cliente y bajo demanda
 * (`next/dynamic`, `ssr: false`). Mientras llega, un hueco del mismo alto con
 * la misma leyenda.
 */

const Grafica = dynamic(() => import("@/components/dashboard/tendencia-semanas-grafica"), {
  ssr: false,
  loading: () => <TendenciaCargando />,
});

function TendenciaCargando() {
  return (
    <figure aria-busy="true">
      <div className="h-[180px] w-full" />
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
      </Leyendas>
    </figure>
  );
}

export function TendenciaSemanas({ semanas }: { semanas: SemanaHistorial[] }) {
  return <Grafica semanas={semanas} />;
}
