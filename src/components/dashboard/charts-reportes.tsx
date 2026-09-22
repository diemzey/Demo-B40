"use client";

import dynamic from "next/dynamic";
import { Leyenda, Leyendas } from "@/components/dashboard/charts";
import { AMBAR, TINTA_MUTED } from "@/components/dashboard/charts-tema";
import type { DesgloseAhorro } from "@/components/dashboard/charts-reportes-graficas";
import type { FilaReporte } from "@/lib/datos/tipos";

export type { DesgloseAhorro } from "@/components/dashboard/charts-reportes-graficas";

/*
 * Gráficas del reporte de la empresa. Las implementaciones (recharts) viven en
 * `charts-reportes-graficas.tsx` y se cargan sólo en el cliente y bajo demanda
 * (`next/dynamic`, `ssr: false`). Mientras llegan, un hueco del mismo alto.
 */

/* ---------- Costo por semana ---------- */

const AhorroPorSemanaGrafica = dynamic(
  () => import("@/components/dashboard/charts-reportes-graficas").then((m) => m.AhorroPorSemanaGrafica),
  { ssr: false, loading: () => <AhorroPorSemanaCargando /> },
);

function AhorroPorSemanaCargando() {
  return (
    <figure aria-busy="true">
      <div className="h-[200px] w-full" />
      <Leyendas>
        <Leyenda color={TINTA_MUTED} tipo="rect">
          Costo hoy
        </Leyenda>
        <Leyenda color={AMBAR} tipo="rect">
          Costo con la propuesta
        </Leyenda>
      </Leyendas>
    </figure>
  );
}

export function AhorroPorSemanaChart({ semanas }: { semanas: FilaReporte[] }) {
  return <AhorroPorSemanaGrafica semanas={semanas} />;
}

/* ---------- De dónde sale el ahorro ---------- */

const DesgloseAhorroGrafica = dynamic(
  () => import("@/components/dashboard/charts-reportes-graficas").then((m) => m.DesgloseAhorroGrafica),
  { ssr: false, loading: () => <DesgloseAhorroCargando /> },
);

function DesgloseAhorroCargando() {
  return (
    <figure aria-busy="true">
      <div className="h-12 w-full" />
      <Leyendas>
        {/* Una línea invisible para reservar el alto de la leyenda. */}
        <span className="invisible">Cargando el desglose…</span>
      </Leyendas>
    </figure>
  );
}

export function DesgloseAhorroBarra({ desglose }: { desglose: DesgloseAhorro }) {
  return <DesgloseAhorroGrafica desglose={desglose} />;
}
