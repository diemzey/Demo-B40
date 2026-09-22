import type { ClienteSupabase } from "./importar";
import type { ResultadoParseo, ResumenTurnos } from "./parse";

/**
 * Destino automático de una importación: la app no pregunta a qué sucursal
 * van los turnos salvo que sea imposible inferirlo.
 *
 *   - Si todas las filas traen `sucursal`, cada valor va a su sucursal (se
 *     crea si no existe): destino "csv".
 *   - Si hay filas sin sucursal y la empresa tiene exactamente una, van a
 *     ella ("existente").
 *   - Si la empresa no tiene sucursales, se crea una con el nombre de la
 *     empresa (o "Principal") ("crear"); el usuario puede cambiar el nombre
 *     antes de que se cree.
 *   - Si la empresa tiene varias, se usa la activa en el panel (o la primera)
 *     y se avisa con un chip no bloqueante ("existente", `elegible: true`).
 */

export const NOMBRE_SUCURSAL_POR_DEFECTO = "Principal";

export type SucursalBreve = { id: string; nombre: string };

/** Parámetros de programación de la empresa (0008_empresas_parametros.sql). */
export type EmpresaImportacion = {
  id: string;
  nombre: string;
  topeObjetivo: number;
  costoHoraDefault: number;
};

export type ContextoImportacion = {
  empresa: EmpresaImportacion | null;
  sucursales: SucursalBreve[];
};

export type DestinoResuelto =
  /** Todas las filas traen `sucursal`: el CSV manda. */
  | { tipo: "csv" }
  /** Las filas sin sucursal van a una existente. `elegible` cuando hay varias y conviene ofrecer cambiarla. */
  | { tipo: "existente"; sucursal: SucursalBreve; elegible: boolean }
  /** La empresa no tiene sucursales: se creará una con este nombre. */
  | { tipo: "crear"; nombre: string };

/** Empresa (con sus parámetros) y sucursales visibles para el usuario (RLS). */
export async function leerContextoImportacion(supabase: ClienteSupabase): Promise<ContextoImportacion> {
  const [{ data: empresas, error: eEmp }, { data: sucursales, error: eSuc }] = await Promise.all([
    supabase.from("empresas").select("id, nombre, tope_objetivo, costo_hora_default").limit(1),
    supabase.from("sucursales").select("id, nombre").order("created_at", { ascending: true }),
  ]);
  if (eEmp) throw new Error(`No se pudo leer la empresa de tu cuenta (${eEmp.message}).`);
  if (eSuc) throw new Error(`No se pudieron leer las sucursales de tu empresa (${eSuc.message}).`);
  const e = empresas?.[0];
  return {
    empresa: e
      ? {
          id: e.id,
          nombre: e.nombre,
          topeObjetivo: Number(e.tope_objetivo),
          costoHoraDefault: Number(e.costo_hora_default),
        }
      : null,
    sucursales: (sucursales ?? []).map((s) => ({ id: s.id, nombre: s.nombre })),
  };
}

/**
 * Decide el destino sin preguntar. `sucursalActivaId` es la sucursal que el
 * panel muestra (cookie), preferida cuando la empresa tiene varias.
 */
export function proponerDestino(
  parseo: Pick<ResultadoParseo, "filas">,
  resumen: Pick<ResumenTurnos, "filasSinSucursal">,
  contexto: ContextoImportacion,
  sucursalActivaId?: string | null,
): DestinoResuelto {
  if (parseo.filas.length > 0 && resumen.filasSinSucursal === 0) return { tipo: "csv" };
  const { sucursales, empresa } = contexto;
  if (sucursales.length === 1) return { tipo: "existente", sucursal: sucursales[0], elegible: false };
  if (sucursales.length === 0) {
    const nombre = empresa?.nombre.trim();
    return { tipo: "crear", nombre: nombre || NOMBRE_SUCURSAL_POR_DEFECTO };
  }
  const activa = sucursales.find((s) => s.id === sucursalActivaId) ?? sucursales[0];
  return { tipo: "existente", sucursal: activa, elegible: true };
}
