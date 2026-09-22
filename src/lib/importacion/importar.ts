import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/supabase/database.types";
import { lunesIso, type ErrorFila, type FilaTurno } from "./parse";

/**
 * Escritura en Supabase de un CSV ya parseado (ver `parse.ts`):
 *
 * 0. resuelve la(s) sucursal(es) destino: la columna opcional `sucursal` del
 *    CSV manda; las filas sin ella van a la sucursal elegida (`sucursalId`) o
 *    escrita (`sucursalNombre`). Una sucursal que no exista se crea
 *    (`asegurarSucursal`), en el primer hub de la empresa;
 * 1. por cada sucursal, `importar_turnos_sucursal` (0014) registra la carga en
 *    `importaciones_csv`, hace en una transacción:
 * 2. "upsert" de `empleados` por `(sucursal_id, clave_externa)`;
 * 3. upsert de `horarios` por `(empleado_id, fecha, hora_inicio)` — re-importar
 *    la misma semana actualiza en vez de fallar;
 * 4. y cierra la carga con `completada` o `con_errores` y el detalle de errores.
 *    Un viaje por sucursal (o por cada FILAS_POR_LLAMADA filas) en vez de uno
 *    por cada 500 turnos: para 85 mil turnos eran 170 viajes.
 *
 * Cada carga guarda una `huella` (SHA-256 de las filas de la sucursal). Si la
 * sucursal ya tiene una carga `completada` con la misma huella y sus turnos
 * siguen ahí, se omite: así una carga grande interrumpida a la mitad se
 * retoma volviendo a soltar el mismo archivo, sin repetir lo hecho. Las cargas
 * que quedaron en `procesando` (pestaña cerrada, red caída) se cierran como
 * `con_errores` al retomar.
 *
 * Los errores de Supabase se lanzan como `Error` con mensaje en español.
 */

export const TAMANO_LOTE = 500;
/** Filas por llamada a `importar_turnos_sucursal` (≈ 1 MB de JSON). */
export const FILAS_POR_LLAMADA = 6000;
/**
 * Sucursales que se cargan a la vez. Una: con dos llamadas concurrentes cada
 * `importar_turnos_sucursal` pasaba de ~0.5 s a 5–12 s y alguna llegó al
 * statement timeout; en serie, 50 sucursales tardan ~30 s.
 */
export const SUCURSALES_EN_PARALELO = 1;

/** Nombre del hub que se crea si la empresa no tiene ninguno (el mismo que da de alta el registro). */
export const HUB_POR_DEFECTO = "Principal";

export type ClienteSupabase = SupabaseClient<Database>;

/**
 * Sucursal destino para las filas que no traen `sucursal` en el CSV: una
 * existente por id, o un nombre (se busca sin distinguir mayúsculas y, si no
 * existe, se crea). Puede omitirse cuando todas las filas traen sucursal.
 */
export type DestinoImportacion =
  | { sucursalId: string; sucursalNombre?: undefined }
  | { sucursalNombre: string; sucursalId?: undefined }
  | { sucursalId?: undefined; sucursalNombre?: undefined };

export type ParametrosImportacion = DestinoImportacion & {
  supabase: ClienteSupabase;
  nombreArchivo: string;
  filas: readonly FilaTurno[];
  totales: number;
  errores: readonly ErrorFila[];
  /** Ciudad para las sucursales (y el hub) que haya que crear. */
  ciudad?: string | null;
  /** Avance de la escritura: por sucursal y por lote de turnos. */
  onProgreso?: (p: ProgresoImportacion) => void;
};

export type ProgresoImportacion = {
  /** Sucursal en curso (desde 1) y cuántas trae el archivo. */
  sucursal: number;
  sucursales: number;
  nombre: string;
  /** Turnos del archivo ya escritos (u omitidos) y total. */
  turnos: number;
  turnosTotal: number;
  /** `true` cuando la sucursal ya estaba cargada igual y se omitió. */
  omitida?: boolean;
};

export type SucursalImportacion = {
  id: string;
  nombre: string;
  /** `true` si se creó en esta importación. */
  creada: boolean;
};

/** Resultado de una carga: una sucursal, una fila en `importaciones_csv`. */
export type ResultadoImportacion = {
  importacionId: string;
  sucursal: SucursalImportacion;
  /** Colaboradores creados o actualizados. */
  empleados: number;
  /** Turnos insertados o actualizados. */
  horarios: number;
  /** Lunes ISO (`YYYY-MM-DD`) de las semanas cargadas. */
  semanas: string[];
  filasOk: number;
  filasError: number;
  /** Huella de las filas de la sucursal (ver cabecera). */
  huella: string;
  /** `true` si la sucursal ya tenía esta misma carga completada y no se reescribió. */
  omitida: boolean;
};


function lotes<T>(items: readonly T[], tamano = TAMANO_LOTE): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += tamano) out.push(items.slice(i, i + tamano));
  return out;
}

function fallo(contexto: string, error: { message: string; code?: string } | null): Error {
  const detalle = error?.message ? ` (${error.message})` : "";
  return new Error(`${contexto}${detalle}`);
}

/** Llave de comparación de nombres de sucursal: sin espacios sobrantes ni mayúsculas. */
export function llaveSucursal(nombre: string): string {
  return nombre.trim().toLocaleLowerCase("es-MX");
}

/** Texto canónico de una fila para la huella (sin el renglón ni la sucursal). */
function filaCanonica(f: FilaTurno): string {
  return [
    f.clave,
    f.nombre,
    f.apellido,
    f.puesto ?? "",
    f.jornadaContratada ?? "",
    f.fecha,
    f.horaInicio,
    f.horaFin,
    f.minutosDescanso,
    f.cruzaMedianoche ? 1 : 0,
  ].join("|");
}

/** SHA-256 (hex) de las filas ordenadas; el orden del archivo no cambia la huella. */
export async function huellaFilas(filas: readonly FilaTurno[]): Promise<string> {
  const texto = filas.map(filaCanonica).sort().join("\n");
  const bytes = new TextEncoder().encode(texto);
  const subtle = globalThis.crypto?.subtle;
  if (subtle) {
    const hash = await subtle.digest("SHA-256", bytes);
    return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  // Sin WebCrypto (entornos muy viejos): FNV-1a de 32 bits por duplicado, suficiente para distinguir cargas.
  let a = 0x811c9dc5;
  let b = 0x01000193;
  for (const x of bytes) {
    a = Math.imul(a ^ x, 0x01000193) >>> 0;
    b = Math.imul(b ^ x, 0x811c9dc5) >>> 0;
  }
  return `fnv-${a.toString(16).padStart(8, "0")}${b.toString(16).padStart(8, "0")}`;
}

/* ---------- Sucursales ---------- */

/**
 * Devuelve la sucursal de la empresa llamada `nombre` (sin distinguir
 * mayúsculas) y, si no existe, la crea en el primer hub de la empresa (por
 * `created_at`); si la empresa no tiene hubs, crea uno llamado "Principal".
 *
 * Crear hubs/sucursales exige rol owner/admin (RLS); un gerente recibe un
 * error explicativo.
 */
export async function asegurarSucursal(
  supabase: ClienteSupabase,
  nombre: string,
  ciudad?: string | null,
): Promise<SucursalImportacion> {
  const limpio = nombre.trim();
  if (!limpio) throw new Error("El nombre de la sucursal no puede ir vacío.");

  // RLS acota `sucursales` a la empresa del usuario; comparamos en memoria
  // para no depender del escapado de patrones `ilike`.
  const { data: existentes, error: errorLectura } = await supabase
    .from("sucursales")
    .select("id, nombre")
    .order("created_at", { ascending: true });
  if (errorLectura) throw fallo("No se pudieron leer las sucursales de tu empresa.", errorLectura);

  const llave = llaveSucursal(limpio);
  const existente = (existentes ?? []).find((s) => llaveSucursal(s.nombre) === llave);
  if (existente) return { id: existente.id, nombre: existente.nombre, creada: false };

  const { data: hubs, error: errorHubs } = await supabase
    .from("hubs")
    .select("id")
    .order("created_at", { ascending: true })
    .limit(1);
  if (errorHubs) throw fallo("No se pudieron leer los hubs de tu empresa.", errorHubs);

  let hubId = hubs?.[0]?.id;
  if (!hubId) {
    const { data: empresaId, error: errorEmpresa } = await supabase.rpc("empresa_actual");
    if (errorEmpresa || !empresaId) {
      throw fallo(
        "Tu cuenta no está ligada a una empresa; pide a un administrador que te agregue.",
        errorEmpresa,
      );
    }
    const { data: hub, error: errorHub } = await supabase
      .from("hubs")
      .insert({ empresa_id: empresaId, nombre: HUB_POR_DEFECTO, ciudad: ciudad ?? null })
      .select("id")
      .single();
    if (errorHub || !hub) {
      throw fallo(
        "No se pudo crear el hub de la empresa. Sólo un owner o admin puede crear sucursales.",
        errorHub,
      );
    }
    hubId = hub.id;
  }

  const { data: sucursal, error: errorSucursal } = await supabase
    .from("sucursales")
    .insert({ hub_id: hubId, nombre: limpio, ciudad: ciudad ?? null })
    .select("id, nombre")
    .single();
  if (errorSucursal || !sucursal) {
    throw fallo(
      `No se pudo crear la sucursal "${limpio}". Sólo un owner o admin puede crear sucursales.`,
      errorSucursal,
    );
  }
  return { id: sucursal.id, nombre: sucursal.nombre, creada: true };
}

async function sucursalPorId(supabase: ClienteSupabase, id: string): Promise<SucursalImportacion> {
  const { data, error } = await supabase.from("sucursales").select("id, nombre").eq("id", id).maybeSingle();
  if (error || !data) {
    throw fallo("La sucursal elegida no existe o no tienes acceso a ella.", error);
  }
  return { id: data.id, nombre: data.nombre, creada: false };
}

/* ---------- Importación ---------- */

/**
 * Resuelve de una vez todas las sucursales del archivo: una lectura, y un
 * solo insert con las que falten (en el primer hub de la empresa; si no hay,
 * se crea "Principal"). Devuelve un mapa llave → sucursal.
 */
async function asegurarSucursales(
  supabase: ClienteSupabase,
  nombres: string[],
  ciudad?: string | null,
): Promise<Map<string, SucursalImportacion>> {
  const out = new Map<string, SucursalImportacion>();
  if (nombres.length === 0) return out;
  const { data: existentes, error: errorLectura } = await supabase
    .from("sucursales")
    .select("id, nombre")
    .order("created_at", { ascending: true });
  if (errorLectura) throw fallo("No se pudieron leer las sucursales de tu empresa.", errorLectura);
  const porLlave = new Map((existentes ?? []).map((s) => [llaveSucursal(s.nombre), s]));
  const faltan: string[] = [];
  for (const n of nombres) {
    const limpio = n.trim();
    if (!limpio) throw new Error("El nombre de la sucursal no puede ir vacío.");
    const llave = llaveSucursal(limpio);
    if (out.has(llave)) continue;
    const e = porLlave.get(llave);
    if (e) out.set(llave, { id: e.id, nombre: e.nombre, creada: false });
    else faltan.push(limpio);
  }
  if (faltan.length === 0) return out;

  const { data: hubs, error: errorHubs } = await supabase
    .from("hubs")
    .select("id")
    .order("created_at", { ascending: true })
    .limit(1);
  if (errorHubs) throw fallo("No se pudieron leer los hubs de tu empresa.", errorHubs);
  let hubId = hubs?.[0]?.id;
  if (!hubId) {
    const { data: empresaId, error: errorEmpresa } = await supabase.rpc("empresa_actual");
    if (errorEmpresa || !empresaId) {
      throw fallo("Tu cuenta no está ligada a una empresa; pide a un administrador que te agregue.", errorEmpresa);
    }
    const { data: hub, error: errorHub } = await supabase
      .from("hubs")
      .insert({ empresa_id: empresaId, nombre: HUB_POR_DEFECTO, ciudad: ciudad ?? null })
      .select("id")
      .single();
    if (errorHub || !hub) throw fallo("No se pudo crear el hub de tu empresa.", errorHub);
    hubId = hub.id;
  }
  const { data: creadas, error: errorCrear } = await supabase
    .from("sucursales")
    .insert(faltan.map((nombre) => ({ hub_id: hubId, nombre, ciudad: ciudad ?? null })))
    .select("id, nombre");
  if (errorCrear || !creadas) {
    throw fallo(
      `No se pudieron crear ${faltan.length === 1 ? `la sucursal "${faltan[0]}"` : `${faltan.length} sucursales`}. Sólo un owner o admin puede crear sucursales.`,
      errorCrear,
    );
  }
  for (const c of creadas) out.set(llaveSucursal(c.nombre), { id: c.id, nombre: c.nombre, creada: true });
  return out;
}

type Carga = {
  sucursal: SucursalImportacion;
  filas: FilaTurno[];
  huella: string;
  /** Id de la carga completada idéntica que permite omitir esta sucursal. */
  omitirPor: string | null;
};

/**
 * Importa el CSV. Las filas se agrupan por su columna `sucursal` (una carga y
 * una fila de `importaciones_csv` por sucursal, en orden de aparición); las
 * que no la traen van a `sucursalId`/`sucursalNombre`. Devuelve un resultado
 * por sucursal; con una sola sucursal el arreglo tiene un elemento.
 *
 * Los errores de parseo del archivo (`errores`, `totales`) se registran en la
 * bitácora de la primera carga para no contarlos dos veces.
 */
export async function importarTurnos({
  supabase,
  sucursalId,
  sucursalNombre,
  ciudad,
  nombreArchivo,
  filas,
  totales,
  errores,
  onProgreso,
}: ParametrosImportacion): Promise<ResultadoImportacion[]> {
  if (filas.length === 0) {
    throw new Error("No hay filas válidas para importar.");
  }

  // Grupos por sucursal del CSV (llave sin mayúsculas; se conserva la primera grafía).
  const grupos = new Map<string, { nombre: string; filas: FilaTurno[] }>();
  const sinSucursal: FilaTurno[] = [];
  for (const f of filas) {
    if (!f.sucursal) {
      sinSucursal.push(f);
      continue;
    }
    const llave = llaveSucursal(f.sucursal);
    const g = grupos.get(llave);
    if (g) g.filas.push(f);
    else grupos.set(llave, { nombre: f.sucursal.trim(), filas: [f] });
  }

  // 0. Resolver destinos antes de escribir nada (todas las sucursales de una vez).
  const mapa = await asegurarSucursales(supabase, [...grupos.values()].map((g) => g.nombre), ciudad);
  const cargas: Array<{ sucursal: SucursalImportacion; filas: FilaTurno[] }> = [];
  for (const [llave, g] of grupos) cargas.push({ sucursal: mapa.get(llave)!, filas: g.filas });
  if (sinSucursal.length > 0) {
    let destino: SucursalImportacion;
    if (sucursalId) destino = await sucursalPorId(supabase, sucursalId);
    else if (sucursalNombre) destino = await asegurarSucursal(supabase, sucursalNombre, ciudad);
    else {
      throw new Error(
        grupos.size > 0
          ? `${sinSucursal.length} filas no traen sucursal: elige a cuál sucursal van.`
          : "Elige o escribe la sucursal a la que pertenecen los turnos.",
      );
    }
    // Si el destino coincide con una sucursal del CSV, se unen en una sola carga.
    const misma = cargas.find((c) => c.sucursal.id === destino.id);
    if (misma) misma.filas.push(...sinSucursal);
    else cargas.push({ sucursal: destino, filas: sinSucursal });
  }

  // 1. Huellas y cargas ya hechas (misma huella completada con todos sus turnos ligados).
  const huellas = await Promise.all(cargas.map((c) => huellaFilas(c.filas)));
  const listas: Carga[] = cargas.map((c, i) => ({ ...c, huella: huellas[i], omitirPor: null }));
  const existentes = listas.filter((c) => !c.sucursal.creada);
  if (existentes.length > 0) {
    const { data: previas } = await supabase
      .from("importaciones_csv")
      .select("id, sucursal_id, huella, created_at")
      .in("sucursal_id", existentes.map((c) => c.sucursal.id))
      .eq("estado", "completada")
      .in("huella", existentes.map((c) => c.huella))
      .order("created_at", { ascending: false });
    for (const c of existentes) {
      const previa = (previas ?? []).find((p) => p.sucursal_id === c.sucursal.id && p.huella === c.huella);
      if (!previa) continue;
      const { count } = await supabase.from("horarios").select("id", { count: "exact", head: true }).eq("importacion_id", previa.id);
      if (count === c.filas.length) c.omitirPor = previa.id;
    }
    // Cargas que quedaron a medias (pestaña cerrada, red caída): se cierran para no confundir.
    const aRetomar = existentes.filter((c) => !c.omitirPor).map((c) => c.sucursal.id);
    if (aRetomar.length > 0) {
      await supabase
        .from("importaciones_csv")
        .update({
          estado: "con_errores",
          errores: [{ fila: 0, columna: "importacion", mensaje: "Carga interrumpida; se volvió a cargar el archivo." }] as unknown as Json,
        })
        .in("sucursal_id", aRetomar)
        .eq("estado", "procesando");
    }
  }

  // 2. Cargar cada sucursal (varias a la vez), reportando el avance en turnos.
  const turnosTotal = listas.reduce((n, c) => n + c.filas.length, 0);
  const hechosPorCarga = listas.map(() => 0);
  const avisar = (i: number, omitida?: boolean) =>
    onProgreso?.({
      sucursal: i + 1,
      sucursales: listas.length,
      nombre: listas[i].sucursal.nombre,
      turnos: hechosPorCarga.reduce((a, b) => a + b, 0),
      turnosTotal,
      omitida,
    });
  const resultados: ResultadoImportacion[] = new Array(listas.length);
  let siguiente = 0;
  const trabajador = async () => {
    while (siguiente < listas.length) {
      const i = siguiente++;
      const primera = i === 0;
      resultados[i] = await importarEnSucursal({
        supabase,
        carga: listas[i],
        nombreArchivo,
        // Las filas con error del archivo sólo se cuentan en la primera carga.
        totales: primera ? totales - (filas.length - listas[i].filas.length) : listas[i].filas.length,
        errores: primera ? errores : [],
        progreso: (hechos, omitida) => {
          hechosPorCarga[i] = hechos;
          avisar(i, omitida);
        },
      });
    }
  };
  await Promise.all(Array.from({ length: Math.min(SUCURSALES_EN_PARALELO, listas.length) }, trabajador));
  return resultados;
}

/** Fila tal como la recibe `importar_turnos_sucursal`. */
function filaRpc(f: FilaTurno, n: number) {
  return {
    clave: f.clave,
    nombre: f.nombre,
    apellido: f.apellido,
    puesto: f.puesto,
    jornada: f.jornadaContratada,
    fecha: f.fecha,
    inicio: f.horaInicio,
    fin: f.horaFin,
    cruza: f.cruzaMedianoche,
    descanso: f.minutosDescanso,
    n,
  };
}

async function importarEnSucursal({
  supabase,
  carga,
  nombreArchivo,
  totales,
  errores,
  progreso,
}: {
  supabase: ClienteSupabase;
  carga: Carga;
  nombreArchivo: string;
  totales: number;
  errores: readonly ErrorFila[];
  progreso: (turnosHechos: number, omitida?: boolean) => void;
}): Promise<ResultadoImportacion> {
  const { sucursal, filas, huella } = carga;
  const semanas = [...new Set(filas.map((f) => lunesIso(f.fecha)))].sort();
  const claves = new Set(filas.map((f) => f.clave));
  progreso(0);

  if (carga.omitirPor) {
    progreso(filas.length, true);
    return {
      importacionId: carga.omitirPor,
      sucursal,
      empleados: claves.size,
      horarios: filas.length,
      semanas,
      filasOk: filas.length,
      filasError: 0,
      huella,
      omitida: true,
    };
  }

  // Una llamada por sucursal (o por trozo de FILAS_POR_LLAMADA filas): la
  // función abre la bitácora, hace los upserts y la cierra en una transacción.
  const trozos = lotes(filas.map(filaRpc), FILAS_POR_LLAMADA);
  let importacionId: string | null = null;
  let escritos = 0;
  for (const [k, trozo] of trozos.entries()) {
    const cerrar = k === trozos.length - 1;
    const { data, error }: { data: { importacion_id: string }[] | null; error: { message: string; code?: string } | null } = await supabase.rpc("importar_turnos_sucursal", {
      p_sucursal: sucursal.id,
      p_nombre_archivo: nombreArchivo,
      p_huella: huella,
      p_filas_totales: totales,
      p_filas: trozo as unknown as Json,
      p_errores: (cerrar ? errores : []) as unknown as Json,
      p_importacion: importacionId,
      p_cerrar: cerrar,
    });
    if (error) throw fallo(`No se pudieron guardar los turnos de ${sucursal.nombre}.`, error);
    importacionId = data?.[0]?.importacion_id ?? importacionId;
    escritos += trozo.length;
    progreso(escritos);
  }
  if (!importacionId) throw new Error(`No se registró la carga de ${sucursal.nombre}.`);

  return {
    importacionId,
    sucursal,
    empleados: claves.size,
    horarios: filas.length,
    semanas,
    filasOk: filas.length,
    filasError: errores.length,
    huella,
    omitida: false,
  };
}
