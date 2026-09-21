"use client";

import { StatCard } from "@/components/dashboard/stat-card";
import { useConfig } from "@/components/dashboard/tabs/use-local-store";
import { FACTOR_DOBLE } from "@/components/dashboard/semanas-data";

const fmtMXN = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});
const fmtPct = new Intl.NumberFormat("es-MX", {
  style: "percent",
  maximumFractionDigits: 0,
  signDisplay: "exceptZero",
});
const fmtH = new Intl.NumberFormat("es-MX", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

/**
 * Tarjeta "Costo extra semanal": lee el costo por hora de la configuración
 * guardada (60 MXN si no hay) y compara contra la semana anterior, si la hay.
 */
export function CostoKpi({
  horasActual,
  horasPrevia,
  semanaPrevia,
}: {
  horasActual: number;
  /** Horas al doble de la semana anterior; sin ella no se muestra el delta. */
  horasPrevia?: number;
  /** Número de la semana anterior (para "vs. S30"). */
  semanaPrevia?: number;
}) {
  const [{ costoHora }] = useConfig();
  const costo = horasActual * costoHora * FACTOR_DOBLE;
  const hayPrevia = horasPrevia !== undefined && semanaPrevia !== undefined;
  const previo = (horasPrevia ?? 0) * costoHora * FACTOR_DOBLE;
  const delta = previo > 0 ? (costo - previo) / previo : 0;
  return (
    <StatCard
      label="Costo extra semanal"
      value={fmtMXN.format(costo)}
      hint={`${fmtH.format(horasActual)} h × $${costoHora} × ${FACTOR_DOBLE}`}
      delta={hayPrevia ? `${fmtPct.format(delta)} vs. S${semanaPrevia}` : undefined}
      deltaTone={delta > 0 ? "bad" : delta < 0 ? "good" : "neutral"}
    />
  );
}
