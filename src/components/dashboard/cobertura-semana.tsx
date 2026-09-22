"use client";

import dynamic from "next/dynamic";
import { Leyenda, Leyendas } from "@/components/dashboard/charts";
import { AMBAR, HOY, TINTA_MUTED } from "@/components/dashboard/charts-tema";
import type { CoberturaSemanaProps } from "@/components/dashboard/cobertura-semana-grafica";
import { cn } from "@/lib/utils";

/*
 * Cobertura vs demanda de la semana. La gráfica (recharts) vive en
 * `cobertura-semana-grafica.tsx` y se carga sólo en el cliente y bajo demanda
 * (`next/dynamic`, `ssr: false`) para no enviar la librería en el primer
 * paquete. Mientras llega, un hueco del mismo alto con la misma leyenda: el
 * servidor tampoco pintaba nada dentro del `ResponsiveContainer`.
 */

const Grafica = dynamic(() => import("@/components/dashboard/cobertura-semana-grafica"), {
  ssr: false,
  loading: () => <CoberturaCargando />,
});

function CoberturaCargando() {
  return (
    <>
      <div className="-mx-1 overflow-x-auto px-1 [scrollbar-width:thin]" aria-busy="true">
        <div className="h-[220px] min-w-[720px]" />
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
      </Leyendas>
    </>
  );
}

export function CoberturaSemana({ cobertura, deficitPicoHoras = 0, className }: CoberturaSemanaProps) {
  if (cobertura.length === 0) return null;
  return (
    <figure className={cn("min-w-0", className)}>
      <Grafica cobertura={cobertura} deficitPicoHoras={deficitPicoHoras} />
    </figure>
  );
}
