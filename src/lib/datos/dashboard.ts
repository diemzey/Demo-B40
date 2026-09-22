import { cache } from "react";
import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { JornadaPersona } from "@/components/ui/jornada-artefacto";
import { resumenDe } from "@/components/demo/plantilla-coapa";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import type { Database, Tables } from "@/lib/supabase/database.types";
import { datosDemo } from "@/lib/datos/demo";
import { numeroSemanaIso, semanaDesdeLunes } from "@/lib/datos/semana";
import {
  COOKIE_SEMANA,
  COOKIE_SUCURSAL,
  TOPE_2030,
  type CoberturaPanel,
  type DatosPanel,
  type EmpresaPanel,
  type ProgramacionPanel,
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
 *      horarios en ninguna → panel vacío de Supabase (`sinDatos: true`,
 *      `aviso: "sin-datos"`, sin personas de muestra): el layout muestra el
 *      onboarding para subir el primer CSV.
 *   4. En cualquier otro caso → Supabase.
 * RLS filtra todas las consultas a la empresa del usuario; aquí sólo se
 * repite el filtro por claridad.
 */

type Supabase = Awaited<ReturnType<typeof createClient>>;
type ResumenFila = Tables<"v_resumen_sucursal_semana">;
type AhorroFila = Tables<"v_ahorro_escenario">;

/*
 * Tablas y vistas de la programación (migraciones 0006/0007) que todavía no
 * están en `database.types.ts`. Se declaran aquí, sólo con las columnas que
 * lee el panel, y se superponen al esquema generado para consultarlas con
 * tipos; cuando se regeneren los tipos estas declaraciones sobran.
 */
type FilaResumenEscenario = {
  escenario_id: string;
  horas_totales: number;
  horas_dobles: number;
  horas_triples: number;
  costo_dobles: number;
  costo_triples: number;
  horas_sobrestaffing: number;
  costo_sobrestaffing: number;
  costo_total: number;
  intervalos_pico: number;
  intervalos_pico_cubiertos: number;
  deficit_pico_horas: number;
  calculado_en: string;
};
type FilaEscenario = {
  id: string;
  sucursal_id: string;
  semana_iso: string;
  tipo: "baseline" | "propuesta";
  version: number;
  estado: string;
  tope_semanal: number;
  publicado_en: string | null;
};
type FilaAsignacionHoras = {
  escenario_id: string;
  empleado_id: string;
  semana_iso: string;
  horas: number;
  horas_domingo: number;
  dias_trabajados: number;
};
type Tabla<Row> = { Row: Row; Insert: Partial<Row>; Update: Partial<Row>; Relationships: [] };
type EsquemaProgramacion = Omit<Database["public"], "Tables" | "Views"> & {
  Tables: Database["public"]["Tables"] & {
    escenarios: Tabla<FilaEscenario>;
    resumen_escenario: Tabla<FilaResumenEscenario>;
  };
  Views: Database["public"]["Views"] & {
    v_asignacion_horas_semana: { Row: FilaAsignacionHoras; Relationships: [] };
  };
};
type DbProgramacion = Omit<Database, "public"> & { public: EsquemaProgramacion };
type SupabaseProgramacion = SupabaseClient<DbProgramacion>;

const num = (v: number | string | null | undefined): number => {
  const n = typeof v === "number" ? v : Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};
const oNull = (v: number | string | null | undefined): number | null =>
  v === null || v === undefined ? null : num(v);

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

const SIN_EXCESO = { horasAlDoble: 0, fueraDeNorma: 0 };

/**
 * Panel vacío para una cuenta real que aún no tiene nada que mostrar. Nunca
 * lleva datos de muestra: el layout lo detecta por `sinDatos` y muestra el
 * onboarding. El tope es el del año en curso, sólo informativo.
 */
function panelVacio(
  empresa: DatosPanel["empresa"],
  catalogo: ReadonlyArray<{ anio: number; tope_horas: number }>,
): DatosPanel {
  const anio = new Date().getUTCFullYear();
  const tope = topeDe(catalogo, anio);
  const topeAnterior = topeDe(catalogo, anio - 1);
  return {
    origen: "supabase",
    aviso: "sin-datos",
    sinDatos: true,
    empresa,
    sucursales: [],
    sucursal: null,
    semana: null,
    tope: TOPE_2030,
    topeLegal: tope,
    topeAnio: anio,
    topeAnterior: topeAnterior === tope ? null : topeAnterior,
    tope2030: TOPE_2030,
    personas: [],
    antes: { ...SIN_EXCESO },
    despues: { ...SIN_EXCESO, horasAbsorbidas: 0, horasSinCubrir: 0, vacantes: 0 },
    antes2030: { ...SIN_EXCESO },
    semanas: [],
    programacion: null,
  };
}

/** Lunes `YYYY-MM-DD` de una fecha que Postgres devuelve como `date` (a veces con hora). */
const lunesDe = (fecha: string) => fecha.slice(0, 10);

type Programada = {
  programacion: ProgramacionPanel;
  /** Horas por empleado en la propuesta (`v_asignacion_horas_semana`). */
  horasPropuesta: Map<string, number>;
};

/**
 * Detalle de la propuesta publicada de una sucursal-semana: `resumen_escenario`
 * del baseline y de la propuesta, la fecha de publicación y las horas por
 * empleado. Devuelve null si la fila de `v_ahorro_escenario` no está completa
 * o si falta alguno de los resúmenes (la vista los exige, pero RLS podría
 * ocultarlos).
 */
async function cargarProgramada(db: SupabaseProgramacion, fila: AhorroFila): Promise<Programada | null> {
  const propuestaId = fila.escenario_propuesta_id;
  const baselineId = fila.escenario_baseline_id;
  if (!propuestaId || !baselineId) return null;

  const coberturaDe = (escenarioId: string) =>
    db
      .from("cobertura_intervalo")
      .select("inicio, requerido_total, asignado_total, es_pico")
      .eq("escenario_id", escenarioId)
      .order("inicio");
  const [
    { data: resumenes },
    { data: escenario },
    { data: filasHoras },
    { data: coberturaBaseline },
    { data: coberturaPropuesta },
  ] = await Promise.all([
    db.from("resumen_escenario").select("*").in("escenario_id", [baselineId, propuestaId]),
    db.from("escenarios").select("id, publicado_en").eq("id", propuestaId).maybeSingle(),
    db.from("v_asignacion_horas_semana").select("empleado_id, horas").eq("escenario_id", propuestaId),
    coberturaDe(baselineId),
    coberturaDe(propuestaId),
  ]);
  const baseline = resumenes?.find((r) => r.escenario_id === baselineId);
  const propuesta = resumenes?.find((r) => r.escenario_id === propuestaId);
  if (!baseline || !propuesta) return null;

  const horasPropuesta = new Map<string, number>();
  for (const h of filasHoras ?? []) {
    horasPropuesta.set(h.empleado_id, num(horasPropuesta.get(h.empleado_id)) + num(h.horas));
  }

  // Los dos escenarios comparten los intervalos (misma demanda); se unen por
  // `inicio` y la demanda es la del baseline (o la de la propuesta si falta).
  const cobertura = new Map<string, CoberturaPanel>();
  for (const c of coberturaBaseline ?? []) {
    cobertura.set(c.inicio, {
      inicio: c.inicio,
      requerido: num(c.requerido_total),
      hoy: num(c.asignado_total),
      propuesta: 0,
      esPico: c.es_pico,
    });
  }
  for (const c of coberturaPropuesta ?? []) {
    const fila = cobertura.get(c.inicio);
    if (fila) {
      fila.propuesta = num(c.asignado_total);
      fila.esPico = fila.esPico || c.es_pico;
    } else {
      cobertura.set(c.inicio, {
        inicio: c.inicio,
        requerido: num(c.requerido_total),
        hoy: 0,
        propuesta: num(c.asignado_total),
        esPico: c.es_pico,
      });
    }
  }

  return {
    programacion: {
      propuestaId,
      baselineId,
      tope: num(fila.tope_semanal) || TOPE_2030,
      costoBaseline: num(fila.costo_total_baseline ?? baseline.costo_total),
      costoPropuesta: num(fila.costo_total_propuesta ?? propuesta.costo_total),
      ahorroMxn: num(fila.ahorro_mxn),
      ahorroPct: num(fila.ahorro_pct),
      costoDoblesBaseline: num(baseline.costo_dobles),
      horasDoblesBaseline: num(baseline.horas_dobles),
      costoSobrestaffingBaseline: num(baseline.costo_sobrestaffing),
      costoSobrestaffingPropuesta: num(propuesta.costo_sobrestaffing),
      coberturaPicoBaselinePct: oNull(fila.cobertura_pico_baseline_pct),
      coberturaPicoPropuestaPct: oNull(fila.cobertura_pico_propuesta_pct),
      deficitPicoHoras: num(fila.deficit_pico_horas_propuesta ?? propuesta.deficit_pico_horas),
      publicadoEn: escenario?.publicado_en ?? null,
      cobertura: [...cobertura.values()].sort((a, b) => a.inicio.localeCompare(b.inicio)),
    },
    horasPropuesta,
  };
}

function nombreCompleto(e: Pick<Tables<"empleados">, "nombre" | "apellido">): string {
  return `${e.apellido} ${e.nombre}`.trim();
}

async function cargarDesdeSupabase(
  supabase: Supabase,
  sucursalPedida: string | undefined,
  semanaPedida: string | undefined,
): Promise<DatosPanel> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // Sin usuario (sesión caducada o petición del router sin cookies válidas):
  // nunca datos de muestra; el layout redirige a /login.
  if (!user) return { ...datosDemo(), sinSesion: true };

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("empresa_id, empresas(id, nombre, tope_objetivo, costo_hora_default)")
    .eq("id", user.id)
    .maybeSingle();
  const filaEmpresa = perfil?.empresas ?? null;
  if (!perfil?.empresa_id || !filaEmpresa) return panelVacio(null, TOPES_RESPALDO);
  const empresa: EmpresaPanel = {
    id: filaEmpresa.id,
    nombre: filaEmpresa.nombre,
    topeObjetivo: num(filaEmpresa.tope_objetivo) || TOPE_2030,
    costoHoraDefault: num(filaEmpresa.costo_hora_default),
  };

  const [{ data: filasSucursales }, { data: filasTopes }] = await Promise.all([
    supabase
      .from("sucursales")
      .select("id, nombre, ciudad, hubs!inner(nombre, empresa_id)")
      .eq("hubs.empresa_id", empresa.id)
      .order("nombre"),
    supabase.from("topes_semanales").select("anio, tope_horas").order("anio"),
  ]);
  const catalogo = filasTopes?.length ? filasTopes : TOPES_RESPALDO;
  const vacio = () => panelVacio(empresa, catalogo);
  if (!filasSucursales?.length) return vacio();

  // Resumen por semana: alimenta la elección de sucursal por defecto y el
  // historial de la elegida. La vista recorre todos los turnos de la empresa,
  // así que con sucursal pedida sólo se piden sus semanas (con 50 tiendas y la
  // base cargada, pedirlas todas rozaba el statement timeout); si no tiene
  // semanas, se piden todas para elegir otra.
  const consultaResumen = (ids: string[]) =>
    supabase.from("v_resumen_sucursal_semana").select("*").in("sucursal_id", ids).order("semana_iso", { ascending: false });
  const todas = filasSucursales.map((s) => s.id);
  const soloPedida = sucursalPedida && todas.includes(sucursalPedida) ? [sucursalPedida] : null;
  let { data: filasResumen, error: errorResumen } = await consultaResumen(soloPedida ?? todas);
  if (!errorResumen && soloPedida && !filasResumen?.length) {
    ({ data: filasResumen, error: errorResumen } = await consultaResumen(todas));
  }
  // Un error (p. ej. consulta cancelada por tiempo) no es "sin datos": el
  // límite de error del panel ofrece reintentar en vez de mostrar el onboarding.
  if (errorResumen) throw new Error(`No pudimos leer el resumen de semanas (${errorResumen.message}).`);
  const resumen = (filasResumen ?? []).filter(
    (r): r is ResumenFila & { sucursal_id: string; semana_iso: string } =>
      typeof r.sucursal_id === "string" && typeof r.semana_iso === "string",
  );
  if (!resumen.length) return vacio();

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
  if (!elegida) return vacio();

  const historial = resumen.filter((r) => r.sucursal_id === elegida.id);
  // Semana: la pedida (cookie/selector) si la sucursal la tiene; si no, la más reciente.
  const filaSemana = historial.find((r) => r.semana_iso === semanaPedida) ?? historial[0];
  const semana = semanaDesdeLunes(filaSemana.semana_iso);
  const topeLegal = topeDe(catalogo, semana.anio);
  const topeAnterior = topeDe(catalogo, semana.anio - 1);

  // Propuestas publicadas de la sucursal (una fila por semana): la de la
  // semana mostrada decide el tope y la columna reacomodada; las demás sólo
  // marcan el historial como programado.
  const db = supabase as unknown as SupabaseProgramacion;
  const { data: filasAhorro } = await supabase
    .from("v_ahorro_escenario")
    .select("*")
    .eq("sucursal_id", elegida.id);
  const ahorroPorSemana = new Map<string, AhorroFila>();
  for (const f of filasAhorro ?? []) {
    if (typeof f.semana_iso === "string") ahorroPorSemana.set(lunesDe(f.semana_iso), f);
  }
  const filaAhorro = ahorroPorSemana.get(semana.inicio);
  const programada = filaAhorro ? await cargarProgramada(db, filaAhorro) : null;

  // Con propuesta publicada, el tope es el de la propuesta. Sin ella, el
  // panel diagnostica contra el objetivo de la reforma (40 h), que es lo que
  // "Programar semana" optimiza; el tope legal del año queda como dato.
  const tope = programada?.programacion.tope ?? TOPE_2030;

  const consultaEmpleados = supabase
    .from("empleados")
    .select("id, nombre, apellido, puesto, foto_url")
    .eq("sucursal_id", elegida.id)
    .eq("activo", true)
    .order("apellido")
    .order("nombre");

  let personas: JornadaPersona[];
  let antes: DatosPanel["antes"];
  let despues: DatosPanel["despues"];

  if (programada) {
    // Horas de hoy (horarios importados) y horas de la propuesta por empleado.
    const [{ data: filasHoy }, { data: filasEmpleados }] = await Promise.all([
      supabase
        .from("v_horas_semana")
        .select("empleado_id, horas_semana")
        .eq("sucursal_id", elegida.id)
        .eq("semana_iso", semana.inicio),
      consultaEmpleados,
    ]);
    const hoy = new Map<string, number>();
    for (const h of filasHoy ?? []) {
      if (h.empleado_id) hoy.set(h.empleado_id, num(h.horas_semana));
    }
    const { horasPropuesta } = programada;
    // Colaboradores activos con horas hoy o en la propuesta; sin turnos en
    // la propuesta → 0 h reacomodadas.
    personas = (filasEmpleados ?? []).flatMap((e) => {
      const horasHoy = hoy.get(e.id);
      const reacomodada = horasPropuesta.get(e.id);
      if (horasHoy === undefined && reacomodada === undefined) return [];
      return [
        {
          nombre: nombreCompleto(e),
          foto: e.foto_url ?? "",
          detalle: e.puesto ?? undefined,
          hoy: redondea(horasHoy ?? 0),
          reacomodada: redondea(reacomodada ?? 0),
        },
      ];
    });
    const { programacion } = programada;
    const sinCubrir = redondea(programacion.deficitPicoHoras);
    antes = { ...resumenDe(personas, "hoy", tope), costoExtraMxn: programacion.costoDoblesBaseline };
    despues = {
      ...resumenDe(personas, "reacomodada", tope),
      horasSinCubrir: sinCubrir,
      vacantes: sinCubrir > 0 ? Math.ceil(sinCubrir / tope) : 0,
      ahorroMxn: programacion.ahorroMxn,
      ahorroPct: programacion.ahorroPct,
    };
  } else {
    // Sin propuesta: el reacomodo de Postgres (public.reacomodar_semana) con
    // el tope objetivo. Quien excede cede, quien tiene capacidad recibe, y lo
    // que no cabe en la plantilla se reporta como horas sin cubrir → vacantes.
    const [{ data: filasReacomodo }, { data: filasBalance }, { data: filasEmpleados }] =
      await Promise.all([
        supabase.rpc("reacomodar_semana", { p_sucursal: elegida.id, p_semana: semana.inicio, p_tope: tope }),
        supabase.rpc("resumen_reacomodo", { p_sucursal: elegida.id, p_semana: semana.inicio, p_tope: tope }),
        consultaEmpleados,
      ]);

    const propuesta = new Map<string, { hoy: number; reacomodada: number }>();
    for (const r of filasReacomodo ?? []) {
      propuesta.set(r.empleado_id, { hoy: r.horas_hoy, reacomodada: r.horas_reacomodadas });
    }

    // Sólo colaboradores activos con horas esa semana: así el conteo coincide
    // con `colaboradores` de la vista y con las cifras del pie de la tabla.
    personas = (filasEmpleados ?? []).flatMap((e) => {
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
    antes = resumenDe(personas, "hoy", tope);
    despues = {
      ...resumenDe(personas, "reacomodada", tope),
      horasAbsorbidas: redondea(balance?.horas_absorbidas ?? 0),
      horasSinCubrir: redondea(balance?.horas_sin_cubrir ?? 0),
      vacantes: balance?.vacantes_sugeridas ?? 0,
    };
  }

  const antes2030 = resumenDe(personas, "hoy", TOPE_2030);

  // La tarjeta de la sucursal elegida usa las mismas cifras que el panel.
  const sucursalesConsistentes = sucursales.map((s) =>
    s.id === elegida.id
      ? { ...s, personas: personas.length, horasAlDoble: antes.horasAlDoble, fueraDeNorma: antes.fueraDeNorma }
      : s,
  );

  const semanas: SemanaHistorial[] = historial
    .map((r) => {
      const ahorro = ahorroPorSemana.get(lunesDe(r.semana_iso));
      return {
        inicio: r.semana_iso,
        iso: numeroSemanaIso(r.semana_iso),
        horasAlDoble: redondea(r.horas_al_doble ?? 0),
        fueraDeNorma: r.fuera_de_norma ?? 0,
        colaboradores: r.colaboradores ?? 0,
        programada: ahorro !== undefined,
        ...(ahorro
          ? {
              ahorroMxn: num(ahorro.ahorro_mxn),
              costoBaseline: num(ahorro.costo_total_baseline),
              costoPropuesta: num(ahorro.costo_total_propuesta),
              tope: num(ahorro.tope_semanal) || TOPE_2030,
              coberturaPicoPropuestaPct: oNull(ahorro.cobertura_pico_propuesta_pct),
            }
          : {}),
      };
    })
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
    sinDatos: false,
    empresa,
    sucursales: sucursalesConsistentes,
    sucursal: { id: elegida.id, nombre: elegida.nombre },
    semana,
    tope,
    topeLegal,
    topeAnio: semana.anio,
    topeAnterior: topeAnterior === topeLegal ? null : topeAnterior,
    tope2030: TOPE_2030,
    personas,
    antes,
    despues,
    antes2030,
    semanas,
    programacion: programada?.programacion ?? null,
  };
}

/**
 * Memorizada por petición (React `cache`): el layout y la página la llaman
 * con los mismos argumentos y comparten una sola carga.
 */
const cargarPanel = cache(async (sucursalId: string | undefined): Promise<DatosPanel> => {
  if (!hasSupabaseEnv()) return datosDemo();
  const supabase = await createClient();
  const jar = await cookies();
  const pedida = sucursalId ?? jar.get(COOKIE_SUCURSAL)?.value;
  const semanaPedida = jar.get(COOKIE_SEMANA)?.value;
  return cargarDesdeSupabase(supabase, pedida || undefined, semanaPedida || undefined);
});

/**
 * Datos del panel para la sucursal indicada o, si no se indica, la guardada
 * en la cookie `j40_sucursal` o la que tenga la semana más reciente.
 */
export function obtenerDatosPanel(opciones: { sucursalId?: string } = {}): Promise<DatosPanel> {
  return cargarPanel(opciones.sucursalId);
}

export type { DatosPanel, SemanaHistorial, SucursalPanel } from "@/lib/datos/tipos";
