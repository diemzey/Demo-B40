/** Formateadores compartidos entre componentes de servidor y de cliente (sin "use client"). */
const fmtMXNEntero = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});
const fmtMillones = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 1 });

/** "$1.4 M" a partir del millón; entero en pesos por debajo. Signo tipográfico. */
export function mxnCompacto(v: number): string {
  const abs = Math.abs(v);
  const texto = abs >= 1_000_000 ? `$${fmtMillones.format(abs / 1_000_000)} M` : fmtMXNEntero.format(abs);
  return v < 0 ? `−${texto}` : texto;
}
