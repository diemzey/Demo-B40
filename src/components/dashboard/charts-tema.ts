/*
 * Tintas, ejes y formateadores del lenguaje de gráficas del panel (ver
 * `charts.tsx`). Viven aparte de los componentes para que `charts.tsx` sólo
 * exporte componentes y Fast Refresh conserve su estado.
 */

/** Ámbar de marca (mismo que `text-amber-400` en el resto del panel). */
export const AMBAR = "#f0a63a";
/** Verde de ahorro (mismo que `text-emerald-400`). */
export const AHORRO = "#34d399";
export const DESTRUCTIVO = "var(--destructive)";
/** Gris de "hoy". */
export const HOY = "var(--muted-foreground)";
export const TINTA_MUTED = "var(--muted-foreground)";
export const REJILLA = "var(--border)";
export const SUPERFICIE = "var(--card)";

export const AXIS_TICK = { fill: TINTA_MUTED, fontSize: 11 } as const;

export const fmtH = new Intl.NumberFormat("es-MX", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
export const fmtInt = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 0 });
export const fmtMXN = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});
export const fmtPct1 = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 1 });
/** "13.5 %": porcentaje con un decimal y espacio fino antes del signo. */
export const pct = (v: number) => `${fmtPct1.format(v)} %`;

/** Eje en pesos abreviados: $12k · $1.4M; con signo tipográfico. */
export const fmtEjeMXN = (v: number) => {
  const abs = Math.abs(v);
  const s =
    abs >= 1_000_000 ? `$${fmtPct1.format(abs / 1_000_000)}M` : abs >= 1000 ? `$${Math.round(abs / 1000)}k` : `$${abs}`;
  return v < 0 ? `−${s}` : s;
};
