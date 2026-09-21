import type { SemanaPanel } from "@/lib/datos/tipos";

/** Utilidades de fechas para semanas ISO. Todo en UTC para no depender de la zona del servidor. */

const DIA_MS = 86_400_000;

function aDate(fecha: string): Date {
  // `YYYY-MM-DD` se interpreta como medianoche UTC.
  return new Date(`${fecha.slice(0, 10)}T00:00:00Z`);
}

function aIso(fecha: Date): string {
  return fecha.toISOString().slice(0, 10);
}

/** Número de semana ISO (1–53) de una fecha `YYYY-MM-DD`. */
export function numeroSemanaIso(fecha: string): number {
  const d = aDate(fecha);
  // Jueves de esa semana decide el año ISO.
  const dia = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dia);
  const inicioAnio = Date.UTC(d.getUTCFullYear(), 0, 1);
  return Math.ceil(((d.getTime() - inicioAnio) / DIA_MS + 1) / 7);
}

/** Lunes de la semana ISO que contiene la fecha. */
export function lunesDe(fecha: string): string {
  const d = aDate(fecha);
  const dia = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() - (dia - 1));
  return aIso(d);
}

/** Semana del panel a partir de su lunes (`YYYY-MM-DD`). */
export function semanaDesdeLunes(lunes: string): SemanaPanel {
  const inicio = lunesDe(lunes);
  const fin = new Date(aDate(inicio).getTime() + 6 * DIA_MS);
  return {
    inicio,
    fin: aIso(fin),
    iso: numeroSemanaIso(inicio),
    anio: aDate(inicio).getUTCFullYear(),
  };
}

const fmtDiaMes = new Intl.DateTimeFormat("es-MX", {
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});

/** "27 de julio al 2 de agosto" (sin el "del" inicial). */
export function rangoSemana(semana: Pick<SemanaPanel, "inicio" | "fin">): string {
  return `${fmtDiaMes.format(aDate(semana.inicio))} al ${fmtDiaMes.format(aDate(semana.fin))}`;
}

const fmtCorto = new Intl.DateTimeFormat("es-MX", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

/** "27 jul – 2 ago", como en la pestaña Semanas. */
export function rangoCorto(semana: Pick<SemanaPanel, "inicio" | "fin">): string {
  const limpio = (s: string) => s.replace(".", "");
  return `${limpio(fmtCorto.format(aDate(semana.inicio)))} – ${limpio(fmtCorto.format(aDate(semana.fin)))}`;
}
