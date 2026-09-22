/**
 * Números y fechas del panel (todo `es-MX`): `fmtMXN`, `fmtHoras`, `fmtPct`,
 * `fmtEntero`, `conSigno`, `fmtFecha`, `fmtFechaHora`, `fmtSemana`,
 * `fmtSemanaLarga`. Viven aparte de `ui.tsx` para que ese archivo sólo exporte
 * componentes y Fast Refresh conserve su estado.
 */

const MENOS = "−";

/** Sustituye el guion ASCII inicial por el signo menos tipográfico. */
function signo(texto: string): string {
  return texto.replace(/^-/, MENOS);
}

const nfMXN = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});
const nfHoras = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 1 });
const nfPct = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 1 });
const nfEntero = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 0 });

/** "$205,680" · "−$2,610". Sin sufijo "MXN": el símbolo ya lo dice. */
export function fmtMXN(mxn: number): string {
  return signo(nfMXN.format(mxn));
}

/** "400 h" · "2,928.5 h" · "−400 h". */
export function fmtHoras(h: number): string {
  return `${signo(nfHoras.format(h))} h`;
}

/** "13.5 %" (espacio fino antes del signo, como en el hero). Recibe 0–100. */
export function fmtPct(pct: number): string {
  return `${signo(nfPct.format(pct))} %`;
}

/** "72" · "1,250". */
export function fmtEntero(n: number): string {
  return signo(nfEntero.format(n));
}

/** Antepone "+" a los positivos; los negativos ya traen "−". */
export function conSigno(texto: string, valor: number): string {
  return valor > 0 ? `+${texto}` : texto;
}

function aDate(fecha: string | Date): Date {
  if (fecha instanceof Date) return fecha;
  // `YYYY-MM-DD` es medianoche UTC; un ISO 8601 completo se interpreta tal cual.
  return fecha.length === 10 ? new Date(`${fecha}T00:00:00Z`) : new Date(fecha);
}

/** Quita el punto de las abreviaturas ("sep." → "sep") que algunos navegadores añaden. */
function sinPuntos(texto: string): string {
  return texto.replace(/\./g, "");
}

const dfCorto = new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short", timeZone: "UTC" });
const dfCortoAnio = new Intl.DateTimeFormat("es-MX", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});
const dfLargo = new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "long", timeZone: "UTC" });
const dfDia = new Intl.DateTimeFormat("es-MX", { day: "numeric", timeZone: "UTC" });
const dfMesCorto = new Intl.DateTimeFormat("es-MX", { month: "short", timeZone: "UTC" });
const dfMesLargo = new Intl.DateTimeFormat("es-MX", { month: "long", timeZone: "UTC" });
const dfFechaHora = new Intl.DateTimeFormat("es-MX", {
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

/** "21 sep 2026" (fecha `YYYY-MM-DD` o ISO 8601). */
export function fmtFecha(fecha: string | Date): string {
  return sinPuntos(dfCortoAnio.format(aDate(fecha)));
}

/** "21 sep, 8:01 pm" en la zona del navegador (sin puntos); para "publicado el". */
export function fmtFechaHora(fecha: string | Date): string {
  return sinPuntos(dfFechaHora.format(aDate(fecha)))
    .replace(/\s*([ap])\s?m$/i, " $1m")
    .replace(/\s{2,}/g, " ")
    .trim();
}

type Semana = { inicio: string; fin: string };

function mismoMes(a: Date, b: Date): boolean {
  return a.getUTCFullYear() === b.getUTCFullYear() && a.getUTCMonth() === b.getUTCMonth();
}

/** Forma corta: "20 – 26 jul" · "27 jul – 2 ago". Para tablas y cápsulas. */
export function fmtSemana(semana: Semana): string {
  const a = aDate(semana.inicio);
  const b = aDate(semana.fin);
  if (mismoMes(a, b)) return `${dfDia.format(a)} – ${dfDia.format(b)} ${sinPuntos(dfMesCorto.format(b))}`;
  return `${sinPuntos(dfCorto.format(a))} – ${sinPuntos(dfCorto.format(b))}`;
}

/** Forma larga: "semana del 20 al 26 de julio" · "semana del 27 de julio al 2 de agosto". Para títulos. */
export function fmtSemanaLarga(semana: Semana): string {
  const a = aDate(semana.inicio);
  const b = aDate(semana.fin);
  if (mismoMes(a, b)) return `semana del ${dfDia.format(a)} al ${dfDia.format(b)} de ${dfMesLargo.format(b)}`;
  return `semana del ${dfLargo.format(a)} al ${dfLargo.format(b)}`;
}
