import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json, TablesInsert } from "@/lib/supabase/database.types";
import { lunesIso, type ErrorFila, type FilaTurno } from "./parse";

/**
 * Escritura en Supabase de un CSV ya parseado (ver `parse.ts`):
 *
 * 1. registra la carga en `importaciones_csv` (estado `procesando`);
 * 2. "upsert" de `empleados` por `(sucursal_id, clave_externa)`;
 * 3. upsert de `horarios` por `(empleado_id, fecha, hora_inicio)` — re-importar
 *    la misma semana actualiza en vez de fallar;
 * 4. cierra la carga con `completada` o `con_errores` y el detalle de errores.
 *
 * Los errores de Supabase se lanzan como `Error` con mensaje en español.
 */

export const TAMANO_LOTE = 500;

export type ClienteSupabase = SupabaseClient<Database>;

export type ParametrosImportacion = {
  supabase: ClienteSupabase;
  sucursalId: string;
  nombreArchivo: string;
  filas: readonly FilaTurno[];
  totales: number;
  errores: readonly ErrorFila[];
};

export type ResultadoImportacion = {
  importacionId: string;
  /** Colaboradores creados o actualizados. */
  empleados: number;
  /** Turnos insertados o actualizados. */
  horarios: number;
  /** Lunes ISO (`YYYY-MM-DD`) de las semanas cargadas. */
  semanas: string[];
  filasOk: number;
  filasError: number;
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

export async function importarTurnos({
  supabase,
  sucursalId,
  nombreArchivo,
  filas,
  totales,
  errores,
}: ParametrosImportacion): Promise<ResultadoImportacion> {
  if (filas.length === 0) {
    throw new Error("No hay filas válidas para importar.");
  }

  // 1. Bitácora de la carga.
  const { data: importacion, error: errorImportacion } = await supabase
    .from("importaciones_csv")
    .insert({
      sucursal_id: sucursalId,
      nombre_archivo: nombreArchivo,
      estado: "procesando",
      filas_totales: totales,
    })
    .select("id")
    .single();

  if (errorImportacion || !importacion) {
    throw fallo(
      "No se pudo registrar la importación. Verifica que tengas permiso de edición en esta sucursal.",
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
    const porClave = new Map<string, FilaTurno>();
    for (const f of filas) porClave.set(f.clave, f);
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

    for (const lote of lotes(horarios)) {
      const { error } = await supabase
        .from("horarios")
        .upsert(lote, { onConflict: "empleado_id,fecha,hora_inicio" });
      if (error) throw fallo("No se pudieron guardar los turnos.", error);
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

    const semanas = [...new Set(filas.map((f) => lunesIso(f.fecha)))].sort();

    return {
      importacionId,
      empleados: porClave.size,
      horarios: horarios.length,
      semanas,
      filasOk: filas.length,
      filasError: errores.length,
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
