import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json, TablesInsert } from "@/lib/supabase/database.types";
import { lunesIso, type ErrorFila, type FilaTurno } from "./parse";

/**
 * Escritura en Supabase de un CSV ya parseado (ver `parse.ts`):
 *
 * 0. resuelve la(s) sucursal(es) destino: la columna opcional `sucursal` del
 *    CSV manda; las filas sin ella van a la sucursal elegida (`sucursalId`) o
 *    escrita (`sucursalNombre`). Una sucursal que no exista se crea
 *    (`asegurarSucursal`), en el primer hub de la empresa;
 * 1. por cada sucursal, registra la carga en `importaciones_csv` (`procesando`);
 * 2. "upsert" de `empleados` por `(sucursal_id, clave_externa)`;
 * 3. upsert de `horarios` por `(empleado_id, fecha, hora_inicio)` — re-importar
 *    la misma semana actualiza en vez de fallar;
 * 4. cierra la carga con `completada` o `con_errores` y el detalle de errores.
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

type EmpleadoInsert = TablesInsert<"empleados">;
type HorarioInsert = TablesInsert<"horarios">;

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

  // 0. Resolver destinos antes de escribir nada.
  const cargas: Array<{ sucursal: SucursalImportacion; filas: FilaTurno[] }> = [];
  for (const g of grupos.values()) {
    cargas.push({ sucursal: await asegurarSucursal(supabase, g.nombre, ciudad), filas: g.filas });
  }
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

  const resultados: ResultadoImportacion[] = [];
  const turnosTotal = cargas.reduce((n, c) => n + c.filas.length, 0);
  let acumulado = 0;
  for (const [i, carga] of cargas.entries()) {
    const primera = i === 0;
    const progreso = (hechos: number, omitida?: boolean) =>
      onProgreso?.({
        sucursal: i + 1,
        sucursales: cargas.length,
        nombre: carga.sucursal.nombre,
        turnos: acumulado + hechos,
        turnosTotal,
        omitida,
      });
    resultados.push(
      await importarEnSucursal({
        supabase,
        sucursal: carga.sucursal,
        nombreArchivo,
        filas: carga.filas,
        // Las filas con error del archivo sólo se cuentan en la primera carga.
        totales: primera ? totales - (filas.length - carga.filas.length) : carga.filas.length,
        errores: primera ? errores : [],
        progreso,
      }),
    );
    acumulado += carga.filas.length;
  }
  return resultados;
}

async function importarEnSucursal({
  supabase,
  sucursal,
  nombreArchivo,
  filas,
  totales,
  errores,
  progreso,
}: {
  supabase: ClienteSupabase;
  sucursal: SucursalImportacion;
  nombreArchivo: string;
  filas: readonly FilaTurno[];
  totales: number;
  errores: readonly ErrorFila[];
  progreso: (turnosHechos: number, omitida?: boolean) => void;
}): Promise<ResultadoImportacion> {
  const sucursalId = sucursal.id;
  progreso(0);

  // 0. ¿Ya está cargada igual? Misma huella completada y con todos sus turnos aún ligados.
  const huella = await huellaFilas(filas);
  const semanas = [...new Set(filas.map((f) => lunesIso(f.fecha)))].sort();
  const porClave = new Map<string, FilaTurno>();
  for (const f of filas) porClave.set(f.clave, f);
  if (!sucursal.creada) {
    const { data: previas } = await supabase
      .from("importaciones_csv")
      .select("id")
      .eq("sucursal_id", sucursalId)
      .eq("estado", "completada")
      .eq("huella", huella)
      .order("created_at", { ascending: false })
      .limit(1);
    const previa = previas?.[0];
    if (previa) {
      const { count } = await supabase
        .from("horarios")
        .select("id", { count: "exact", head: true })
        .eq("importacion_id", previa.id);
      if (count === filas.length) {
        progreso(filas.length, true);
        return {
          importacionId: previa.id,
          sucursal,
          empleados: porClave.size,
          horarios: filas.length,
          semanas,
          filasOk: filas.length,
          filasError: 0,
          huella,
          omitida: true,
        };
      }
    }
    // Cargas que quedaron a medias (pestaña cerrada, red caída): se cierran para no confundir.
    await supabase
      .from("importaciones_csv")
      .update({
        estado: "con_errores",
        errores: [{ fila: 0, columna: "importacion", mensaje: "Carga interrumpida; se volvió a cargar el archivo." }] as unknown as Json,
      })
      .eq("sucursal_id", sucursalId)
      .eq("estado", "procesando");
  }

  // 1. Bitácora de la carga.
  const { data: importacion, error: errorImportacion } = await supabase
    .from("importaciones_csv")
    .insert({
      sucursal_id: sucursalId,
      nombre_archivo: nombreArchivo,
      estado: "procesando",
      filas_totales: totales,
      huella,
    })
    .select("id")
    .single();

  if (errorImportacion || !importacion) {
    throw fallo(
      `No se pudo registrar la importación en ${sucursal.nombre}. Verifica que tengas permiso de edición en esta sucursal.`,
      errorImportacion,
    );
  }
  const importacionId = importacion.id;

  const marcarFallo = async (mensaje: string) => {
    await supabase
      .from("importaciones_csv")
      .update({
        estado: "con_errores",
        filas_ok: 0,
        filas_error: totales,
        errores: [...errores, { fila: 0, columna: "importacion", mensaje }] as unknown as Json,
      })
      .eq("id", importacionId);
  };

  try {
    // 2. Empleados: la última fila de cada clave manda en nombre/puesto/jornada.
    const claves = [...porClave.keys()];

    const idPorClave = new Map<string, string>();
    for (const lote of lotes(claves, 200)) {
      const { data, error } = await supabase
        .from("empleados")
        .select("id, clave_externa")
        .eq("sucursal_id", sucursalId)
        .in("clave_externa", lote);
      if (error) throw fallo("No se pudieron leer los colaboradores de la sucursal.", error);
      for (const e of data ?? []) {
        if (e.clave_externa) idPorClave.set(e.clave_externa, e.id);
      }
    }

    const nuevos: EmpleadoInsert[] = [];
    const existentes: EmpleadoInsert[] = [];
    for (const [clave, f] of porClave) {
      const base: EmpleadoInsert = {
        sucursal_id: sucursalId,
        clave_externa: clave,
        nombre: f.nombre,
        apellido: f.apellido,
        puesto: f.puesto,
        jornada_contratada_horas: f.jornadaContratada,
      };
      const id = idPorClave.get(clave);
      if (id) existentes.push({ ...base, id });
      else nuevos.push(base);
    }

    for (const lote of lotes(nuevos)) {
      const { data, error } = await supabase
        .from("empleados")
        .insert(lote)
        .select("id, clave_externa");
      if (error) throw fallo("No se pudieron crear los colaboradores.", error);
      for (const e of data ?? []) {
        if (e.clave_externa) idPorClave.set(e.clave_externa, e.id);
      }
    }

    for (const lote of lotes(existentes)) {
      // Upsert por llave primaria: actualiza nombre, apellido, puesto y jornada.
      const { error } = await supabase.from("empleados").upsert(lote, { onConflict: "id" });
      if (error) throw fallo("No se pudieron actualizar los colaboradores.", error);
    }

    // 3. Horarios.
    const horarios: HorarioInsert[] = [];
    for (const f of filas) {
      const empleadoId = idPorClave.get(f.clave);
      if (!empleadoId) {
        throw new Error(`No se encontró el colaborador con clave ${f.clave} después de crearlo.`);
      }
      horarios.push({
        empleado_id: empleadoId,
        fecha: f.fecha,
        hora_inicio: f.horaInicio,
        hora_fin: f.horaFin,
        cruza_medianoche: f.cruzaMedianoche,
        minutos_descanso: f.minutosDescanso,
        origen: "csv",
        importacion_id: importacionId,
      });
    }

    let escritos = 0;
    for (const lote of lotes(horarios)) {
      const { error } = await supabase
        .from("horarios")
        .upsert(lote, { onConflict: "empleado_id,fecha,hora_inicio" });
      if (error) throw fallo("No se pudieron guardar los turnos.", error);
      escritos += lote.length;
      progreso(escritos);
    }

    // 4. Cierre de la bitácora.
    const { error: errorCierre } = await supabase
      .from("importaciones_csv")
      .update({
        estado: errores.length > 0 ? "con_errores" : "completada",
        filas_ok: filas.length,
        filas_error: errores.length,
        errores: errores as unknown as Json,
      })
      .eq("id", importacionId);
    if (errorCierre) throw fallo("Los turnos se guardaron pero no se pudo cerrar la bitácora.", errorCierre);

    return {
      importacionId,
      sucursal,
      empleados: porClave.size,
      horarios: horarios.length,
      semanas,
      filasOk: filas.length,
      filasError: errores.length,
      huella,
      omitida: false,
    };
  } catch (e) {
    const mensaje = e instanceof Error ? e.message : "Error desconocido al importar.";
    try {
      await marcarFallo(mensaje);
    } catch {
      // La bitácora no se pudo actualizar; el error original es el importante.
    }
    throw e instanceof Error ? e : new Error(mensaje);
  }
}
