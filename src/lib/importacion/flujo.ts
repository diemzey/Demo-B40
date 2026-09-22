import { programarSemana, type ResultadoProgramacion, type ProgresoProgramacion } from "@/lib/motor/programar";
import type { DestinoResuelto, EmpresaImportacion } from "./destino";
import { importarTurnos, type ClienteSupabase, type ResultadoImportacion } from "./importar";
import { numeroSemanaIso, type ResultadoParseo, type ResumenTurnos } from "./parse";

/**
 * Un solo flujo, sin botones intermedios: importar el CSV ya parseado y, por
 * cada sucursal-semana importada, correr el motor para publicar la propuesta.
 * Lo usan `ImportarYProgramar` (navegador) y el script de prueba en vivo
 * (`scripts/motor/salida/`), de modo que ambos ejecutan exactamente la misma
 * secuencia de biblioteca.
 *
 * El avance es UNA barra 0–100 con frases humanas (sin telemetría):
 *   leyendo 0–8 · destino 8–12 · importando 12–40 · programando 40–99 · listo 100.
 */

export type EtapaFlujo = "leyendo" | "destino" | "importando" | "programando" | "listo";

export type ProgresoFlujo = {
  etapa: EtapaFlujo;
  /** 0–100 sobre todo el flujo. */
  pct: number;
  /** Frase corta para la persona ("Guardando 388 turnos"). */
  etiqueta: string;
};

/** Tramo de la barra que ocupa cada etapa. */
export const TRAMOS: Record<EtapaFlujo, [number, number]> = {
  leyendo: [0, 8],
  destino: [8, 12],
  importando: [12, 40],
  programando: [40, 99],
  listo: [100, 100],
};

export type ProgramacionFlujo = {
  sucursal: ResultadoImportacion["sucursal"];
  semanaIso: string;
  resultado: ResultadoProgramacion;
};

export type ResultadoFlujo = {
  resultados: ResultadoImportacion[];
  programaciones: ProgramacionFlujo[];
  /** Sucursal en la que conviene abrir el panel (la primera importada). */
  sucursalId: string;
};

/**
 * Error del flujo con la etapa en la que falló y lo que ya quedó guardado,
 * para que "Reintentar" retome desde ahí.
 */
export class ErrorFlujo extends Error {
  readonly etapa: EtapaFlujo;
  readonly resultados: ResultadoImportacion[] | null;
  readonly programaciones: ProgramacionFlujo[];
  constructor(etapa: EtapaFlujo, causa: unknown, resultados: ResultadoImportacion[] | null, programaciones: ProgramacionFlujo[] = []) {
    super(mensajeDe(causa));
    this.name = "ErrorFlujo";
    this.etapa = etapa;
    this.resultados = resultados;
    this.programaciones = programaciones;
  }
}

function mensajeDe(e: unknown): string {
  const m = e instanceof Error ? e.message : String(e);
  // Sin códigos de Postgres ni prefijos técnicos: la persona no los necesita.
  return m.replace(/\s*\[[0-9A-Z]{5}\]/g, "").trim();
}

const fmtN = new Intl.NumberFormat("es-MX");

/** "388 turnos de 72 personas". */
export function fraseTurnos(turnos: number, personas: number): string {
  return `${fmtN.format(turnos)} ${turnos === 1 ? "turno" : "turnos"} de ${fmtN.format(personas)} ${personas === 1 ? "persona" : "personas"}`;
}

/** Frases humanas para cada paso del motor (`ProgresoProgramacion.paso`). */
export function etiquetaPasoMotor(p: ProgresoProgramacion, ctx: { sucursal?: string; tope: number }): string {
  const suc = ctx.sucursal ? ` de ${ctx.sucursal}` : "";
  switch (p.paso) {
    case "catalogo":
      return `Leyendo los turnos${suc}`;
    case "demanda":
      return "Calculando la demanda de la semana";
    case "baseline":
      return "Midiendo cómo está hoy la semana";
    case "optimizando":
      return `Buscando la mejor programación a ${ctx.tope} h`;
    case "guardando":
      return "Guardando la propuesta";
    case "resumiendo":
      return "Comparando el antes y el después";
    case "listo":
      return "Listo: tu antes y después";
  }
}

function escalar(tramo: [number, number], fraccion: number): number {
  const [a, b] = tramo;
  return Math.round(a + (b - a) * Math.max(0, Math.min(1, fraccion)));
}

export type OpcionesFlujo = {
  supabase: ClienteSupabase;
  nombreArchivo: string;
  parseo: ResultadoParseo;
  resumen: Pick<ResumenTurnos, "colaboradores" | "turnos">;
  destino: DestinoResuelto;
  /** Parámetros de la empresa; si faltan, `programarSemana` los lee de `empresas`. */
  empresa?: Pick<EmpresaImportacion, "topeObjetivo" | "costoHoraDefault"> | null;
  /** Reintento: importación ya hecha (se salta a programar). */
  resultados?: ResultadoImportacion[] | null;
  /** Reintento: semanas ya programadas (se saltan). */
  programaciones?: ProgramacionFlujo[];
  onProgreso?: (p: ProgresoFlujo) => void;
};

export async function importarYProgramarTurnos(opts: OpcionesFlujo): Promise<ResultadoFlujo> {
  const { supabase, nombreArchivo, parseo, resumen, destino, empresa } = opts;
  const progreso = opts.onProgreso ?? (() => {});
  const tope = empresa?.topeObjetivo;
  const costoHoraDefault = empresa?.costoHoraDefault;

  // 1. Importar (salvo reintento con importación hecha).
  let resultados = opts.resultados ?? null;
  if (!resultados) {
    progreso({
      etapa: "importando",
      pct: TRAMOS.importando[0],
      etiqueta:
        destino.tipo === "crear"
          ? `Creando la sucursal ${destino.nombre}`
          : `Guardando ${fraseTurnos(resumen.turnos, resumen.colaboradores)}`,
    });
    try {
      const comunes = {
        supabase,
        nombreArchivo,
        filas: parseo.filas,
        totales: parseo.totales,
        errores: parseo.errores,
      };
      resultados = await importarTurnos(
        destino.tipo === "csv"
          ? comunes
          : destino.tipo === "existente"
            ? { ...comunes, sucursalId: destino.sucursal.id }
            : { ...comunes, sucursalNombre: destino.nombre },
      );
    } catch (e) {
      throw new ErrorFlujo("importando", e, null);
    }
  }

  // 2. Programar cada sucursal-semana.
  const pares = resultados.flatMap((r) => r.semanas.map((semanaIso) => ({ sucursal: r.sucursal, semanaIso })));
  const hechas = new Set((opts.programaciones ?? []).map((p) => `${p.sucursal.id}|${p.semanaIso}`));
  const programaciones: ProgramacionFlujo[] = [...(opts.programaciones ?? [])];
  const pendientes = pares.filter((p) => !hechas.has(`${p.sucursal.id}|${p.semanaIso}`));
  const [ini, fin] = TRAMOS.programando;
  const ancho = (fin - ini) / Math.max(pendientes.length, 1);
  const varias = pares.length > 1;

  for (const [i, par] of pendientes.entries()) {
    const tramo: [number, number] = [ini + ancho * i, ini + ancho * (i + 1)];
    const etiquetaSemana = varias ? ` · semana ${numeroSemanaIso(par.semanaIso)}` : "";
    progreso({
      etapa: "programando",
      pct: escalar(tramo, 0),
      etiqueta: etiquetaPasoMotor({ paso: "catalogo", pct: 0 }, { sucursal: varias ? par.sucursal.nombre : undefined, tope: tope ?? 40 }) + etiquetaSemana,
    });
    try {
      const resultado = await programarSemana({
        supabase,
        sucursalId: par.sucursal.id,
        semanaIso: par.semanaIso,
        tope,
        costoHoraDefault,
        onProgreso: (p) => {
          if (p.paso === "listo") return;
          progreso({
            etapa: "programando",
            pct: escalar(tramo, p.pct / 100),
            etiqueta: etiquetaPasoMotor(p, { sucursal: varias ? par.sucursal.nombre : undefined, tope: p.tope ?? tope ?? 40 }) + etiquetaSemana,
          });
        },
      });
      programaciones.push({ sucursal: par.sucursal, semanaIso: par.semanaIso, resultado });
    } catch (e) {
      throw new ErrorFlujo("programando", e, resultados, programaciones);
    }
  }

  progreso({ etapa: "listo", pct: 100, etiqueta: "Listo: tu antes y después" });
  return { resultados, programaciones, sucursalId: resultados[0].sucursal.id };
}
