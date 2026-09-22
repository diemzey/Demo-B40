import { programarSemana, type ResultadoProgramacion, type ProgresoProgramacion } from "@/lib/motor/programar";
import type { DestinoResuelto, EmpresaImportacion } from "./destino";
import { importarTurnos, type ClienteSupabase, type ProgresoImportacion, type ResultadoImportacion, type SucursalImportacion } from "./importar";
import { numeroSemanaIso, type ResultadoParseo, type ResumenTurnos } from "./parse";

/*
 * Un solo flujo, sin botones intermedios: importar el CSV ya parseado y, por
 * cada sucursal-semana importada, correr el motor para publicar la propuesta.
 * Lo usan `ImportarYProgramar` (navegador) y el script de prueba en vivo
 * (`scripts/motor/salida/`), de modo que ambos ejecutan exactamente la misma
 * secuencia de biblioteca.
 *
 * El avance es UNA barra 0–100 con frases humanas (sin telemetría):
 *   leyendo 0–8 · destino 8–12 · importando 12–40 · programando 40–99 · listo 100.
 *
 * Retomar: volver a soltar el mismo archivo omite las sucursales que ya
 * quedaron cargadas igual (huella en `importaciones_csv`) y no vuelve a
 * programar las semanas de esas sucursales que ya tienen propuesta publicada.
 * Así una carga de 50 tiendas interrumpida a la mitad termina en la segunda
 * pasada sin repetir lo hecho.
 *
 * Las sucursales se programan en paralelo (`CONCURRENCIA_PROGRAMACION`); las
 * semanas de una misma sucursal, en serie, porque comparten catálogo de
 * empleados. La primera semana corre sola para dejar listo el catálogo de la
 * empresa (habilidades, puestos, tabuladores, plantillas, reglas).
 *
 * Con `enSegundoPlano`, el flujo sólo programa la primera semana de la
 * primera sucursal (lo que el panel va a abrir) y devuelve las demás en
 * `pendientes` para que la cola del panel (`lib/programacion/cola.ts`) las
 * programe mientras la persona navega: con 50 tiendas × 4 semanas el panel
 * abre en poco más de un minuto en vez de esperar 200 propuestas.
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

/**
 * Sucursales que se programan a la vez. Dos: con tres, los RPC que
 * materializan y resumen escenarios pasaban de ~1 s a más de 15 s en la
 * instancia base de Supabase y Postgres los cancelaba.
 */
export const CONCURRENCIA_PROGRAMACION = 2;

/** Una sucursal-semana por programar. */
export type Par = { sucursal: SucursalImportacion; semanaIso: string };

export type ProgramacionFlujo = {
  sucursal: ResultadoImportacion["sucursal"];
  semanaIso: string;
  resultado: ResultadoProgramacion;
};

export type ResultadoFlujo = {
  resultados: ResultadoImportacion[];
  programaciones: ProgramacionFlujo[];
  /** Semanas-sucursal que ya tenían propuesta publicada y no se volvieron a programar. */
  omitidas: number;
  /** Semanas-sucursal que quedan por programar en segundo plano (`enSegundoPlano`). */
  pendientes: Par[];
  /** Sucursal y semana con las que conviene abrir el panel (la primera programada o importada). */
  sucursalId: string;
  semanaIso: string | null;
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

/** Frase del avance de la importación ("Guardando Tlalpan (33 de 50) · 54,168 de 85,104 turnos"). */
function etiquetaImportacion(p: ProgresoImportacion, resumen: Pick<ResumenTurnos, "colaboradores" | "turnos">): string {
  if (p.sucursales <= 1) {
    return p.omitida ? `Ya estaba guardada: ${fraseTurnos(resumen.turnos, resumen.colaboradores)}` : `Guardando ${fraseTurnos(resumen.turnos, resumen.colaboradores)}`;
  }
  const conteo = `${fmtN.format(p.turnos)} de ${fmtN.format(p.turnosTotal)} turnos`;
  return p.omitida
    ? `${p.nombre} ya estaba guardada (${p.sucursal} de ${p.sucursales}) · ${conteo}`
    : `Guardando ${p.nombre} (${p.sucursal} de ${p.sucursales}) · ${conteo}`;
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
  /** Sucursales programadas a la vez (por defecto `CONCURRENCIA_PROGRAMACION`). */
  concurrencia?: number;
  /** Programar sólo la primera semana y devolver el resto en `pendientes`. */
  enSegundoPlano?: boolean;
  onProgreso?: (p: ProgresoFlujo) => void;
};

export const llavePar = (p: Par) => `${p.sucursal.id}|${p.semanaIso}`;

/**
 * Semanas-sucursal con propuesta publicada entre las sucursales que se
 * omitieron por estar ya cargadas igual: no hace falta reprogramarlas.
 */
async function paresYaProgramados(supabase: ClienteSupabase, resultados: ResultadoImportacion[]): Promise<Set<string>> {
  const omitidas = resultados.filter((r) => r.omitida);
  if (omitidas.length === 0) return new Set();
  const ids = omitidas.map((r) => r.sucursal.id);
  const semanas = [...new Set(omitidas.flatMap((r) => r.semanas))];
  const { data, error } = await supabase
    .from("escenarios")
    .select("sucursal_id, semana_iso")
    .eq("tipo", "propuesta")
    .eq("estado", "publicado")
    .in("sucursal_id", ids)
    .in("semana_iso", semanas);
  if (error) throw new Error(`No se pudieron leer las propuestas existentes (${error.message}).`);
  return new Set((data ?? []).map((e) => `${e.sucursal_id}|${e.semana_iso}`));
}

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
        onProgreso: (p: ProgresoImportacion) =>
          progreso({
            etapa: "importando",
            pct: escalar(TRAMOS.importando, p.turnosTotal > 0 ? p.turnos / p.turnosTotal : 0),
            etiqueta: etiquetaImportacion(p, resumen),
          }),
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

  // 2. Programar cada sucursal-semana que falte.
  const pares: Par[] = resultados.flatMap((r) => r.semanas.map((semanaIso) => ({ sucursal: r.sucursal, semanaIso })));
  const programaciones: ProgramacionFlujo[] = [...(opts.programaciones ?? [])];
  const hechas = new Set(programaciones.map(llavePar));
  let yaProgramados: Set<string>;
  try {
    yaProgramados = await paresYaProgramados(supabase, resultados);
  } catch (e) {
    throw new ErrorFlujo("programando", e, resultados, programaciones);
  }
  const pendientes = pares.filter((p) => !hechas.has(llavePar(p)) && !yaProgramados.has(llavePar(p)));
  const omitidas = pares.length - pendientes.length - programaciones.length;
  const varias = pares.length > 1;

  // En segundo plano: sólo la primera semana ahora; el resto lo programa la cola del panel.
  const ahora = opts.enSegundoPlano ? pendientes.slice(0, 1) : pendientes;
  const despues = opts.enSegundoPlano ? pendientes.slice(1) : [];

  try {
    await programarPares({
      supabase,
      pares: ahora,
      tope,
      costoHoraDefault,
      concurrencia: opts.concurrencia,
      onProgreso: ({ fraccion, par, paso, hechas: n, total }) => {
        const conteo = total > 1 ? `Semana ${Math.min(n + 1, total)} de ${total} · ` : "";
        const etiquetaSemana = varias ? ` · semana ${numeroSemanaIso(par.semanaIso)}` : "";
        progreso({
          etapa: "programando",
          pct: escalar(TRAMOS.programando, fraccion),
          etiqueta: conteo + etiquetaPasoMotor(paso, { sucursal: varias ? par.sucursal.nombre : undefined, tope: paso.tope ?? tope ?? 40 }) + etiquetaSemana,
        });
      },
      onHecha: (p) => programaciones.push(p),
    });
  } catch (e) {
    throw new ErrorFlujo("programando", e, resultados, programaciones);
  }

  progreso({ etapa: "listo", pct: 100, etiqueta: "Listo: tu antes y después" });
  const primera = programaciones[0] ?? null;
  return {
    resultados,
    programaciones,
    omitidas,
    pendientes: despues,
    sucursalId: primera?.sucursal.id ?? resultados[0].sucursal.id,
    semanaIso: primera?.semanaIso ?? resultados[0].semanas[0] ?? null,
  };
}

export type ProgresoPares = {
  /** Semanas terminadas y total. */
  hechas: number;
  total: number;
  /** 0–1 sobre el total, contando las que van a medias. */
  fraccion: number;
  /** Sucursal-semana que reporta este avance y su paso del motor. */
  par: Par;
  paso: ProgresoProgramacion;
};

export type OpcionesPares = {
  supabase: ClienteSupabase;
  pares: Par[];
  tope?: number;
  costoHoraDefault?: number;
  /** Sucursales programadas a la vez (por defecto `CONCURRENCIA_PROGRAMACION`). */
  concurrencia?: number;
  onProgreso?: (p: ProgresoPares) => void;
  /** Se llama en cuanto termina cada semana, en el orden en que terminan. */
  onHecha?: (p: ProgramacionFlujo) => void;
  /** Para cancelar: si devuelve `true`, no se inician más semanas. */
  cancelada?: () => boolean;
};

/**
 * Programa varias sucursal-semanas: en serie dentro de cada sucursal, varias
 * sucursales a la vez; la primera semana corre sola (catálogo). Ante un
 * conflicto de unicidad o un timeout de Postgres reintenta la semana una vez.
 * Lanza el primer error después de que terminen las semanas en curso.
 */
export async function programarPares(opts: OpcionesPares): Promise<ProgramacionFlujo[]> {
  const { supabase, pares, tope, costoHoraDefault } = opts;
  const progreso = opts.onProgreso ?? (() => {});
  const total = pares.length;
  const hechas: ProgramacionFlujo[] = [];

  // Avance agregado: semanas terminadas + fracción de las que van corriendo.
  const parcial = new Map<string, number>();
  const avisar = (par: Par, paso: ProgresoProgramacion) => {
    parcial.set(llavePar(par), paso.paso === "listo" ? 1 : paso.pct / 100);
    let suma = hechas.length;
    for (const v of parcial.values()) suma += v;
    progreso({ hechas: hechas.length, total, fraccion: total > 0 ? suma / total : 1, par, paso });
  };

  const programar = async (par: Par) => {
    avisar(par, { paso: "catalogo", pct: 0 });
    const correr = () =>
      programarSemana({
        supabase,
        sucursalId: par.sucursal.id,
        semanaIso: par.semanaIso,
        tope,
        costoHoraDefault,
        onProgreso: (p) => avisar(par, p),
      });
    let resultado: ResultadoProgramacion;
    try {
      resultado = await correr();
    } catch (e) {
      // Dos sucursales en paralelo pueden crear a la vez el mismo puesto o plantilla
      // de la empresa (la segunda pasada ya los encuentra creados), o Postgres pudo
      // cancelar una consulta por tiempo con la base cargada: una segunda pasada
      // tras una pausa suele bastar. Nada quedó a medias: cada paso es una transacción.
      if (!esConflicto(e) && !esTimeout(e)) throw e;
      await new Promise((r) => setTimeout(r, esTimeout(e) ? 4000 : 500));
      resultado = await correr();
    }
    parcial.delete(llavePar(par));
    const hecha = { sucursal: par.sucursal, semanaIso: par.semanaIso, resultado };
    hechas.push(hecha);
    opts.onHecha?.(hecha);
    avisar(par, { paso: "listo", pct: 100 });
  };

  // Colas por sucursal: en serie dentro de la sucursal, varias sucursales a la vez.
  const colas = new Map<string, Par[]>();
  for (const p of pares) colas.set(p.sucursal.id, [...(colas.get(p.sucursal.id) ?? []), p]);
  const listaColas = [...colas.values()];
  const concurrencia = Math.max(1, opts.concurrencia ?? CONCURRENCIA_PROGRAMACION);
  const cancelada = opts.cancelada ?? (() => false);

  let fallo: unknown = null;
  try {
    // La primera semana sola: deja el catálogo de la empresa listo para las demás.
    const primera = listaColas[0]?.shift();
    if (primera && !cancelada()) await programar(primera);

    let siguiente = 0;
    const trabajador = async () => {
      while (fallo === null && !cancelada() && siguiente < listaColas.length) {
        const cola = listaColas[siguiente++];
        for (const par of cola) {
          if (fallo !== null || cancelada()) return;
          await programar(par);
        }
      }
    };
    await Promise.all(
      Array.from({ length: Math.min(concurrencia, listaColas.length) }, () =>
        trabajador().catch((e) => {
          if (fallo === null) fallo = e;
        }),
      ),
    );
  } catch (e) {
    fallo = e;
  }
  if (fallo !== null) throw fallo;
  return hechas;
}

/** Consulta cancelada por `statement_timeout` (57014). */
function esTimeout(e: unknown): boolean {
  const m = e instanceof Error ? e.message : String(e);
  return /57014|statement timeout/i.test(m);
}

/** Violación de unicidad de Postgres (23505) al crear catálogo en paralelo. */
function esConflicto(e: unknown): boolean {
  const m = e instanceof Error ? e.message : String(e);
  return /23505|duplicate key|ya existe|already exists/i.test(m);
}
