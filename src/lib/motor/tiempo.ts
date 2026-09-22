/**
 * Utilidades de tiempo. Todo el motor trabaja en hora local de México
 * (America/Mexico_City, UTC-06:00 fijo desde 2022: sin horario de verano),
 * representada como milisegundos epoch, y serializa ISO con offset -06:00,
 * igual que los archivos de scripts/sintetico/salida/.
 */

export const OFFSET_MIN = -6 * 60;
export const OFFSET_TXT = '-06:00';
export const MS_MIN = 60_000;
export const MS_HORA = 3_600_000;
export const MS_DIA = 86_400_000;
export const INTERVALO_MIN = 30;
export const MS_INTERVALO = INTERVALO_MIN * MS_MIN;

/** "HH:MM" → minutos desde medianoche. */
export function hhmmAMin(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + (m || 0);
}

/** minutos desde medianoche → "HH:MM". */
export function minAHHMM(min: number): string {
  const h = Math.floor(min / 60) % 24;
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** "YYYY-MM-DD" (fecha local) → epoch ms de la medianoche local. */
export function fechaAMs(fecha: string): number {
  const [y, m, d] = fecha.split('-').map(Number);
  return Date.UTC(y, m - 1, d) - OFFSET_MIN * MS_MIN;
}

/** epoch ms → "YYYY-MM-DD" en hora local. */
export function msAFecha(ms: number): string {
  const d = new Date(ms + OFFSET_MIN * MS_MIN);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

/** epoch ms → minutos desde la medianoche local. */
export function msAMinDia(ms: number): number {
  const local = ms + OFFSET_MIN * MS_MIN;
  return Math.floor((((local % MS_DIA) + MS_DIA) % MS_DIA) / MS_MIN);
}

/** epoch ms → ISO 8601 con offset -06:00 (p. ej. 2026-07-06T09:00:00-06:00). */
export function msAIso(ms: number): string {
  const local = new Date(ms + OFFSET_MIN * MS_MIN);
  const p = (n: number) => String(n).padStart(2, '0');
  return (
    `${local.getUTCFullYear()}-${p(local.getUTCMonth() + 1)}-${p(local.getUTCDate())}` +
    `T${p(local.getUTCHours())}:${p(local.getUTCMinutes())}:${p(local.getUTCSeconds())}${OFFSET_TXT}`
  );
}

/** ISO (con cualquier offset) → epoch ms. */
export function isoAMs(iso: string): number {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) throw new Error(`Fecha inválida: ${iso}`);
  return ms;
}

/** Día ISO (1 = lunes … 7 = domingo) de un instante en hora local. */
export function isodow(ms: number): number {
  const d = new Date(ms + OFFSET_MIN * MS_MIN).getUTCDay(); // 0 = domingo
  return d === 0 ? 7 : d;
}

/** Fecha local "YYYY-MM-DD" + "HH:MM" → epoch ms. */
export function fechaHoraAMs(fecha: string, hhmm: string): number {
  return fechaAMs(fecha) + hhmmAMin(hhmm) * MS_MIN;
}

/** Suma días a una fecha "YYYY-MM-DD". */
export function sumarDias(fecha: string, dias: number): string {
  return msAFecha(fechaAMs(fecha) + dias * MS_DIA);
}

/** Último día del mes de una fecha. */
export function ultimoDiaMes(fecha: string): number {
  const [y, m] = fecha.split('-').map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** Valida que la fecha sea lunes (semana ISO). */
export function esLunes(fecha: string): boolean {
  return isodow(fechaAMs(fecha) + 12 * MS_HORA) === 1;
}

/** Redondeo a n decimales (half away from zero, como `round()` de Postgres). */
export function redondear(x: number, dec = 2): number {
  const f = 10 ** dec;
  const s = Math.sign(x);
  return (s * Math.round(Math.abs(x) * f + 1e-9)) / f;
}
