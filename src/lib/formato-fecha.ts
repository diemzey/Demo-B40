/** Formateadores de fecha y hora compartidos (sin "use client"). Zona fija para que servidor y navegador coincidan. */

const fmtFechaHora = new Intl.DateTimeFormat("es-MX", {
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "America/Mexico_City",
});

/** "21 sep, 2:05 p.m." o null si la fecha no es válida. */
export function fechaPublicacion(iso: string): string | null {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : fmtFechaHora.format(d);
}
