import Papa from "papaparse";

/**
 * Parseo y validación del CSV de turnos (ver supabase/README.md,
 * "Contrato del CSV de turnos"). Sin dependencias de Supabase ni del DOM:
 * recibe texto y devuelve filas válidas + errores por fila.
 */

export const COLUMNAS_CSV = [
  "clave",
  "nombre",
  "apellido",
  "puesto",
  "jornada_contratada",
  "fecha",
  "hora_inicio",
  "hora_fin",
  "minutos_descanso",
] as const;

export type ColumnaCsv = (typeof COLUMNAS_CSV)[number];

const COLUMNAS_OBLIGATORIAS: readonly ColumnaCsv[] = [
  "clave",
  "nombre",
  "apellido",
  "fecha",
  "hora_inicio",
  "hora_fin",
];

/** Fila válida y normalizada del CSV. */
export type FilaTurno = {
  /** Renglón en el archivo (el encabezado es el 1; la primera fila de datos, el 2). */
  fila: number;
  clave: string;
  nombre: string;
  apellido: string;
  puesto: string | null;
  jornadaContratada: number | null;
  /** `YYYY-MM-DD`, día en que inicia el turno. */
  fecha: string;
  /** `HH:MM` (24 h). */
  horaInicio: string;
  /** `HH:MM` (24 h). */
  horaFin: string;
  minutosDescanso: number;
  /** `true` cuando `horaFin <= horaInicio` (termina al día siguiente). */
  cruzaMedianoche: boolean;
  /** Horas efectivas: duración (+24 h si cruza) menos descanso, 2 decimales. */
  horas: number;
};

/** Misma forma que el jsonb `importaciones_csv.errores`. */
export type ErrorFila = {
  fila: number;
  columna: string;
  mensaje: string;
};

export type ResultadoParseo = {
  filas: FilaTurno[];
  errores: ErrorFila[];
  /** Filas de datos encontradas en el archivo (válidas + con error). */
  totales: number;
};

const RE_FECHA = /^(\d{4})-(\d{2})-(\d{2})$/;
const RE_HORA = /^(\d{1,2}):(\d{2})(?::\d{2})?$/;
const RE_ENTERO = /^\d+$/;

function limpiar(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

/** Valida `YYYY-MM-DD` como fecha real del calendario. */
export function esFechaValida(fecha: string): boolean {
  const m = RE_FECHA.exec(fecha);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const t = Date.UTC(y, mo - 1, d);
  const dt = new Date(t);
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}

/** `HH:MM` → minutos desde medianoche, o `null` si es inválida. Acepta `H:MM` y `HH:MM:SS`. */
export function horaAMinutos(hora: string): number | null {
  const m = RE_HORA.exec(hora);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

function minutosAHora(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Parsea el CSV completo. Nunca lanza: los problemas se reportan en `errores`.
 * Una fila con cualquier error se excluye de `filas`.
 */
export function parsearTurnos(texto: string): ResultadoParseo {
  const errores: ErrorFila[] = [];
  const filas: FilaTurno[] = [];

  const limpio = texto.replace(/^﻿/, "");
  const parsed = Papa.parse<Record<string, string | undefined>>(limpio, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (h) => h.replace(/^﻿/, "").trim().toLowerCase(),
    transform: (v) => (typeof v === "string" ? v.trim() : v),
  });

  const data = parsed.data;
  const totales = data.length;
  const campos = new Set((parsed.meta.fields ?? []).map((f) => f.trim().toLowerCase()));
  const faltantes = COLUMNAS_CSV.filter((c) => !campos.has(c));

  if (faltantes.length > 0) {
    errores.push({
      fila: 1,
      columna: faltantes.join(", "),
      mensaje:
        `Faltan columnas en el encabezado: ${faltantes.join(", ")}. ` +
        `El encabezado debe ser: ${COLUMNAS_CSV.join(",")}`,
    });
    return { filas, errores, totales };
  }

  // Errores estructurales de papaparse (comillas sin cerrar, campos de más).
  const filasRotas = new Set<number>();
  for (const e of parsed.errors) {
    if (typeof e.row !== "number") continue;
    if (e.code === "TooFewFields") continue; // celdas finales omitidas → se tratan como vacías
    if (filasRotas.has(e.row)) continue;
    filasRotas.add(e.row);
    errores.push({
      fila: e.row + 2,
      columna: "archivo",
      mensaje:
        e.code === "TooManyFields"
          ? "La fila tiene más columnas que el encabezado."
          : `Fila mal formada: ${e.message}`,
    });
  }

  // Duplicados dentro del archivo (misma clave + fecha + hora_inicio).
  const vistos = new Set<string>();

  data.forEach((raw, i) => {
    if (filasRotas.has(i)) return;
    const fila = i + 2;
    const erroresFila: ErrorFila[] = [];
    const error = (columna: ColumnaCsv | "fila", mensaje: string) =>
      erroresFila.push({ fila, columna, mensaje });

    const valores = Object.fromEntries(
      COLUMNAS_CSV.map((c) => [c, limpiar(raw[c])]),
    ) as Record<ColumnaCsv, string>;

    for (const c of COLUMNAS_OBLIGATORIAS) {
      if (!valores[c]) error(c, "Es obligatoria.");
    }

    // fecha
    if (valores.fecha && !esFechaValida(valores.fecha)) {
      error("fecha", `"${valores.fecha}" no es una fecha válida (usa YYYY-MM-DD).`);
    }

    // horas
    const ini = valores.hora_inicio ? horaAMinutos(valores.hora_inicio) : null;
    const fin = valores.hora_fin ? horaAMinutos(valores.hora_fin) : null;
    if (valores.hora_inicio && ini === null) {
      error("hora_inicio", `"${valores.hora_inicio}" no es una hora válida (usa HH:MM, 24 h).`);
    }
    if (valores.hora_fin && fin === null) {
      error("hora_fin", `"${valores.hora_fin}" no es una hora válida (usa HH:MM, 24 h).`);
    }

    // minutos_descanso
    let minutosDescanso = 0;
    if (valores.minutos_descanso) {
      if (!RE_ENTERO.test(valores.minutos_descanso)) {
        error("minutos_descanso", `"${valores.minutos_descanso}" debe ser un entero mayor o igual a 0.`);
      } else {
        minutosDescanso = Number(valores.minutos_descanso);
      }
    }

    // jornada_contratada
    let jornadaContratada: number | null = null;
    if (valores.jornada_contratada) {
      const j = Number(valores.jornada_contratada.replace(",", "."));
      if (!Number.isFinite(j) || j < 0 || j > 168) {
        error("jornada_contratada", `"${valores.jornada_contratada}" debe ser un número de horas (p. ej. 48 o 24.5).`);
      } else {
        jornadaContratada = Math.round(j * 100) / 100;
      }
    }

    let cruzaMedianoche = false;
    let horas = 0;
    if (ini !== null && fin !== null) {
      cruzaMedianoche = fin <= ini;
      const duracion = fin - ini + (cruzaMedianoche ? 24 * 60 : 0);
      horas = Math.round(((duracion - minutosDescanso) / 60) * 100) / 100;
      if (horas <= 0) {
        error(
          "minutos_descanso",
          `El descanso (${minutosDescanso} min) deja el turno sin horas efectivas.`,
        );
      } else if (horas > 24) {
        error("hora_fin", "El turno no puede durar más de 24 horas.");
      }
    }

    if (erroresFila.length === 0 && ini !== null) {
      const llave = `${valores.clave}|${valores.fecha}|${minutosAHora(ini)}`;
      if (vistos.has(llave)) {
        error(
          "hora_inicio",
          `Turno duplicado en el archivo: ${valores.clave} ya tiene un turno el ${valores.fecha} a las ${minutosAHora(ini)}.`,
        );
      } else {
        vistos.add(llave);
      }
    }

    if (erroresFila.length > 0) {
      errores.push(...erroresFila);
      return;
    }

    filas.push({
      fila,
      clave: valores.clave,
      nombre: valores.nombre,
      apellido: valores.apellido,
      puesto: valores.puesto || null,
      jornadaContratada,
      fecha: valores.fecha,
      horaInicio: minutosAHora(ini as number),
      horaFin: minutosAHora(fin as number),
      minutosDescanso,
      cruzaMedianoche,
      horas,
    });
  });

  errores.sort((a, b) => a.fila - b.fila);
  return { filas, errores, totales };
}

/* ---------- Resumen para la vista previa ---------- */

/** Lunes de la semana ISO que contiene `fecha` (`YYYY-MM-DD`), en `YYYY-MM-DD`. */
export function lunesIso(fecha: string): string {
  const [y, m, d] = fecha.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const dow = dt.getUTCDay(); // 0 = domingo
  const desplazamiento = dow === 0 ? -6 : 1 - dow;
  dt.setUTCDate(dt.getUTCDate() + desplazamiento);
  return dt.toISOString().slice(0, 10);
}

/** Número de semana ISO (1–53) de un lunes ISO `YYYY-MM-DD`. */
export function numeroSemanaIso(lunes: string): number {
  const [y, m, d] = lunes.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  // El jueves de la semana define el año ISO.
  const jueves = new Date(dt);
  jueves.setUTCDate(dt.getUTCDate() + 3);
  const inicioAnio = new Date(Date.UTC(jueves.getUTCFullYear(), 0, 1));
  return Math.floor((jueves.getTime() - inicioAnio.getTime()) / 86_400_000 / 7) + 1;
}

const fmtDiaMes = new Intl.DateTimeFormat("es-MX", { timeZone: "UTC", day: "numeric", month: "short" });
const fmtDiaMesAnio = new Intl.DateTimeFormat("es-MX", {
  timeZone: "UTC",
  day: "numeric",
  month: "short",
  year: "numeric",
});

function utc(fecha: string): Date {
  const [y, m, d] = fecha.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/** Etiqueta legible de la semana ISO que inicia en `lunes`: "27 jul – 2 ago 2026" o "3–9 ago 2026". */
export function etiquetaSemana(lunes: string): string {
  const ini = utc(lunes);
  const fin = new Date(ini);
  fin.setUTCDate(ini.getUTCDate() + 6);
  const finTxt = fmtDiaMesAnio.format(fin);
  if (ini.getUTCMonth() === fin.getUTCMonth()) {
    return `${ini.getUTCDate()}–${finTxt}`;
  }
  return `${fmtDiaMes.format(ini)} – ${finTxt}`;
}

export type ResumenEmpleadoSemana = {
  clave: string;
  nombre: string;
  apellido: string;
  /** Lunes ISO `YYYY-MM-DD`. */
  semana: string;
  turnos: number;
  horas: number;
};

export type ResumenTurnos = {
  colaboradores: number;
  turnos: number;
  horasTotales: number;
  /** Fechas distintas, ordenadas. */
  fechas: string[];
  /** Lunes ISO distintos, ordenados. */
  semanas: string[];
  /** Totales por colaborador y semana ISO. */
  porEmpleadoSemana: ResumenEmpleadoSemana[];
};

function redondear(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Totales por colaborador y semana ISO, más fechas/semanas detectadas. */
export function resumirTurnos(filas: readonly FilaTurno[]): ResumenTurnos {
  const grupos = new Map<string, ResumenEmpleadoSemana>();
  const claves = new Set<string>();
  const fechas = new Set<string>();
  const semanas = new Set<string>();
  let horasTotales = 0;

  for (const f of filas) {
    const semana = lunesIso(f.fecha);
    claves.add(f.clave);
    fechas.add(f.fecha);
    semanas.add(semana);
    horasTotales += f.horas;
    const k = `${f.clave}|${semana}`;
    const g = grupos.get(k);
    if (g) {
      g.turnos += 1;
      g.horas = redondear(g.horas + f.horas);
      g.nombre = f.nombre;
      g.apellido = f.apellido;
    } else {
      grupos.set(k, {
        clave: f.clave,
        nombre: f.nombre,
        apellido: f.apellido,
        semana,
        turnos: 1,
        horas: redondear(f.horas),
      });
    }
  }

  const porEmpleadoSemana = [...grupos.values()].sort(
    (a, b) => a.semana.localeCompare(b.semana) || a.clave.localeCompare(b.clave),
  );

  return {
    colaboradores: claves.size,
    turnos: filas.length,
    horasTotales: redondear(horasTotales),
    fechas: [...fechas].sort(),
    semanas: [...semanas].sort(),
    porEmpleadoSemana,
  };
}
