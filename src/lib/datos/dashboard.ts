import { cache } from "react";
import { cookies } from "next/headers";
import type { JornadaPersona } from "@/components/ui/jornada-artefacto";
import { resumenDe } from "@/components/demo/plantilla-coapa";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/database.types";
import { datosDemo } from "@/lib/datos/demo";
import { numeroSemanaIso, semanaDesdeLunes } from "@/lib/datos/semana";
import {
  COOKIE_SUCURSAL,
  TOPE_2030,
  type DatosPanel,
  type SemanaHistorial,
  type SucursalPanel,
} from "@/lib/datos/tipos";

/*
 * Acceso a datos del panel. SOLO servidor: usa `cookies()` y el cliente de
 * Supabase de servidor; no importarlo desde componentes "use client".
 *
 * Cómo se decide el origen:
 *   1. Sin variables de Supabase (`hasSupabaseEnv()` false) → demo.
 *   2. Sin usuario autenticado → demo (el proxy ya redirige a /login).
 *   3. Usuario sin `perfiles.empresa_id`, empresa sin sucursales o sin
 *      horarios en ninguna → demo con `aviso: "sin-datos"`.
 *   4. En cualquier otro caso → Supabase.
 * RLS filtra todas las consultas a la empresa del usuario; aquí sólo se
 * repite el filtro por claridad.
 */

type Supabase = Awaited<ReturnType<typeof createClient>>;
type ResumenFila = Tables<"v_resumen_sucursal_semana">;

/** Catálogo local por si `topes_semanales` estuviera vacío (mismos valores que la migración 0004). */
const TOPES_RESPALDO: Array<Pick<Tables<"topes_semanales">, "anio" | "tope_horas">> = [
  { anio: 2026, tope_horas: 48 },
  { anio: 2027, tope_horas: 46 },
  { anio: 2028, tope_horas: 44 },
  { anio: 2029, tope_horas: 42 },
  { anio: 2030, tope_horas: 40 },
];

/** Misma regla que `public.tope_semanal(anio)`: exacto, si no el anterior más cercano, si no el siguiente. */
function topeDe(catalogo: ReadonlyArray<{ anio: number; tope_horas: number }>, anio: number): number {
  const exacto = catalogo.find((t) => t.anio === anio);
  if (exacto) return exacto.tope_horas;
  const anteriores = catalogo.filter((t) => t.anio < anio).sort((a, b) => b.anio - a.anio);
  if (anteriores.length) return anteriores[0].tope_horas;
  const posteriores = catalogo.filter((t) => t.anio > anio).sort((a, b) => a.anio - b.anio);
  if (posteriores.length) return posteriores[0].tope_horas;
  return TOPE_2030;
}

const redondea = (n: number) => Math.round(n * 10) / 10;

function nombreCompleto(e: Pick<Tables<"empleados">, "nombre" | "apellido">): string {
  return `${e.apellido} ${e.nombre}`.trim();
}

async function cargarDesdeSupabase(supabase: Supabase, sucursalPedida: string | undefined): Promise<DatosPanel> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return datosDemo();

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("empresa_id, empresas(id, nombre)")
    .eq("id", user.id)
    .maybeSingle();
  const empresa = perfil?.empresas ?? null;
  if (!perfil?.empresa_id || !empresa) return datosDemo("sin-datos");

  const [{ data: filasSucursales }, { data: filasTopes }] = await Promise.all([
    supabase
      .from("sucursales")
      .select("id, nombre, ciudad, hubs!inner(nombre, empresa_id)")
      .eq("hubs.empresa_id", empresa.id)
      .order("nombre"),
    supabase.from("topes_semanales").select("anio, tope_horas").order("anio"),
  ]);
  if (!filasSucursales?.length) return datosDemo("sin-datos");
  const catalogo = filasTopes?.length ? filasTopes : TOPES_RESPALDO;

  // Un solo viaje para el resumen de todas las sucursales: alimenta la lista,
  // la elección de sucursal por defecto y el historial de la elegida.
  const { data: filasResumen } = await supabase
    .from("v_resumen_sucursal_semana")
    .select("*")
    .in(
      "sucursal_id",
      filasSucursales.map((s) => s.id),
    )
    .order("semana_iso", { ascending: false });
  const resumen = (filasResumen ?? []).filter(
    (r): r is ResumenFila & { sucursal_id: string; semana_iso: string } =>
      typeof r.sucursal_id === "string" && typeof r.semana_iso === "string",
  );
  if (!resumen.length) return datosDemo("sin-datos");

  const ultimaPorSucursal = new Map<string, (typeof resumen)[number]>();
  for (const r of resumen) {
    if (!ultimaPorSucursal.has(r.sucursal_id)) ultimaPorSucursal.set(r.sucursal_id, r);
  }

  const sucursales: SucursalPanel[] = filasSucursales.map((s) => {
    const u = ultimaPorSucursal.get(s.id);
    return {
      id: s.id,
      nombre: s.nombre,
      ciudad: s.ciudad,
      hub: s.hubs.nombre,
      personas: u?.colaboradores ?? 0,
      horasAlDoble: redondea(u?.horas_al_doble ?? 0),
      fueraDeNorma: u?.fuera_de_norma ?? 0,
    };
  });

  // Sucursal: la pedida (si existe y tiene semanas), si no la de la semana más reciente.
  const elegida =
    (sucursalPedida && ultimaPorSucursal.has(sucursalPedida)
      ? filasSucursales.find((s) => s.id === sucursalPedida)
      : undefined) ?? filasSucursales.find((s) => s.id === resumen[0].sucursal_id);
  if (!elegida) return datosDemo("sin-datos");

  const historial = resumen.filter((r) => r.sucursal_id === elegida.id);
  const semana = semanaDesdeLunes(historial[0].semana_iso);
  const tope = topeDe(catalogo, semana.anio);
  const topeAnterior = topeDe(catalogo, semana.anio - 1);

  // El motor de reacomodo vive en Postgres (public.reacomodar_semana): quien
  // excede el tope cede, quien tiene capacidad recibe, y lo que no cabe en la
  // plantilla se reporta como horas sin cubrir → vacantes sugeridas.
  const [{ data: filasReacomodo }, { data: filasBalance }, { data: filasEmpleados }] =
    await Promise.all([
      supabase.rpc("reacomodar_semana", { p_sucursal: elegida.id, p_semana: semana.inicio, p_tope: tope }),
      supabase.rpc("resumen_reacomodo", { p_sucursal: elegida.id, p_semana: semana.inicio, p_tope: tope }),
      supabase
        .from("empleados")
        .select("id, nombre, apellido, puesto, foto_url")
        .eq("sucursal_id", elegida.id)
        .eq("activo", true)
        .order("apellido")
        .order("nombre"),
    ]);

  const propuesta = new Map<string, { hoy: number; reacomodada: number }>();
  for (const r of filasReacomodo ?? []) {
    propuesta.set(r.empleado_id, { hoy: r.horas_hoy, reacomodada: r.horas_reacomodadas });
  }

  // Sólo colaboradores activos con horas esa semana: así el conteo coincide
  // con `colaboradores` de la vista y con las cifras del pie de la tabla.
  const personas: JornadaPersona[] = (filasEmpleados ?? []).flatMap((e) => {
    const fila = propuesta.get(e.id);
    if (!fila) return [];
    return [
      {
        nombre: nombreCompleto(e),
        foto: e.foto_url ?? "",
        detalle: e.puesto ?? undefined,
        hoy: fila.hoy,
        reacomodada: fila.reacomodada,
      },
    ];
  });

  const balance = filasBalance?.[0];
  const reacomodo = {
    horasAbsorbidas: redondea(balance?.horas_absorbidas ?? 0),
    horasSinCubrir: redondea(balance?.horas_sin_cubrir ?? 0),
    vacantes: balance?.vacantes_sugeridas ?? 0,
  };

  const antes = resumenDe(personas, "hoy", tope);
  const despues = { ...resumenDe(personas, "reacomodada", tope), ...reacomodo };
  const antes2030 = resumenDe(personas, "hoy", TOPE_2030);

  // La tarjeta de la sucursal elegida usa las mismas cifras que el panel.
  const sucursalesConsistentes = sucursales.map((s) =>
    s.id === elegida.id
      ? { ...s, personas: personas.length, horasAlDoble: antes.horasAlDoble, fueraDeNorma: antes.fueraDeNorma }
      : s,
  );

  const semanas: SemanaHistorial[] = historial
    .map((r) => ({
      inicio: r.semana_iso,
      iso: numeroSemanaIso(r.semana_iso),
      horasAlDoble: redondea(r.horas_al_doble ?? 0),
      fueraDeNorma: r.fuera_de_norma ?? 0,
      colaboradores: r.colaboradores ?? 0,
    }))
    .reverse();
  // La semana mostrada se calcula de `personas` para que coincida con la tabla.
  const ultima = semanas[semanas.length - 1];
  if (ultima) {
    ultima.horasAlDoble = antes.horasAlDoble;
    ultima.fueraDeNorma = antes.fueraDeNorma;
    ultima.colaboradores = personas.length;
  }

  return {
    origen: "supabase",
    aviso: null,
    empresa: { id: empresa.id, nombre: empresa.nombre },
    sucursales: sucursalesConsistentes,
    sucursal: { id: elegida.id, nombre: elegida.nombre },
    semana,
    tope,
    topeAnio: semana.anio,
    topeAnterior: topeAnterior === tope ? null : topeAnterior,
    tope2030: TOPE_2030,
    personas,
    antes,
    despues,
    antes2030,
    semanas,
  };
}

/**
 * Memorizada por petición (React `cache`): el layout y la página la llaman
 * con los mismos argumentos y comparten una sola carga.
 */
const cargarPanel = cache(async (sucursalId: string | undefined): Promise<DatosPanel> => {
  if (!hasSupabaseEnv()) return datosDemo();
  const supabase = await createClient();
  const pedida = sucursalId ?? (await cookies()).get(COOKIE_SUCURSAL)?.value;
  return cargarDesdeSupabase(supabase, pedida || undefined);
});

/**
 * Datos del panel para la sucursal indicada o, si no se indica, la guardada
 * en la cookie `j40_sucursal` o la que tenga la semana más reciente.
 */
export function obtenerDatosPanel(opciones: { sucursalId?: string } = {}): Promise<DatosPanel> {
  return cargarPanel(opciones.sucursalId);
}

export type { DatosPanel, SemanaHistorial, SucursalPanel } from "@/lib/datos/tipos";
