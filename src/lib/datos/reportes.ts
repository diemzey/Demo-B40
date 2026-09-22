import { cache } from "react";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import type { Database, Tables } from "@/lib/supabase/database.types";
import {
  TOPE_2030,
  type DatosReporte,
  type FilaReporte,
  type SucursalReporte,
  type TotalReporte,
} from "@/lib/datos/tipos";

/*
 * Reporte ejecutivo de ahorro. SOLO servidor (cliente de Supabase de servidor).
 *
 * Trazabilidad: cada cifra sale de Postgres, no se recalcula aquí.
 *   asignaciones → v_costo_empleado_semana → resumen_escenario
 *   → v_ahorro_escenario (baseline vs propuesta por tienda-semana)
 *   → reporte_ejecutivo() (agregado de la empresa por semana ISO).
 * Lo único que se computa en TypeScript es el total de todas las semanas
 * (`totalDe`), que suma las filas de `reporte_ejecutivo()` sin tocar el detalle.
 *
 * Origen: sin variables de Supabase → demo; sin usuario → demo; con sesión pero
 * sin escenarios publicados → demo con `aviso: "sin-datos"`.
 */

type Supabase = Awaited<ReturnType<typeof createClient>>;
type AhorroFila = Tables<"v_ahorro_escenario">;

const num = (v: number | string | null | undefined): number => {
  const n = typeof v === "number" ? v : Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};
const r2 = (n: number) => Math.round(n * 100) / 100;

/** Tope más frecuente entre las propuestas; 40 h (2030) si no hay filas. */
function topeDe(filas: ReadonlyArray<Pick<AhorroFila, "tope_semanal">>): number {
  const conteo = new Map<number, number>();
  for (const f of filas) {
    if (typeof f.tope_semanal === "number") conteo.set(f.tope_semanal, (conteo.get(f.tope_semanal) ?? 0) + 1);
  }
  let tope = TOPE_2030;
  let mejor = 0;
  for (const [t, c] of conteo) {
    if (c > mejor) {
      mejor = c;
      tope = t;
    }
  }
  return tope;
}

/** Suma de las filas de `reporte_ejecutivo()`; ver `TotalReporte` para las convenciones. */
function totalDe(semanas: FilaReporte[], porSucursal: SucursalReporte[]): TotalReporte {
  const suma = (f: (s: FilaReporte) => number) => semanas.reduce((a, s) => a + f(s), 0);
  const tiendaSemanas = suma((s) => s.tiendas);
  const ponderado = (f: (s: FilaReporte) => number) =>
    tiendaSemanas > 0 ? r2(suma((s) => f(s) * s.tiendas) / tiendaSemanas) : 0;
  const costoBaseline = r2(suma((s) => s.costoBaseline));
  const ahorroMxn = r2(suma((s) => s.ahorroMxn));

  const tiendas = new Set(porSucursal.map((s) => s.sucursalId));
  const conDeficit = new Set(porSucursal.filter((s) => s.deficitPicoHoras > 0).map((s) => s.sucursalId));

  return {
    semanas: semanas.length,
    desde: semanas[0]?.semanaIso ?? null,
    hasta: semanas[semanas.length - 1]?.semanaIso ?? null,
    tiendas: tiendas.size || Math.max(0, ...semanas.map((s) => s.tiendas)),
    costoBaseline,
    costoPropuesta: r2(suma((s) => s.costoPropuesta)),
    ahorroMxn,
    ahorroPct: costoBaseline > 0 ? r2((100 * ahorroMxn) / costoBaseline) : 0,
    ahorroDobles: r2(suma((s) => s.ahorroDobles)),
    ahorroTriples: r2(suma((s) => s.ahorroTriples)),
    ahorroPrima: r2(suma((s) => s.ahorroPrima)),
    ahorroSobrestaffing: r2(suma((s) => s.ahorroSobrestaffing)),
    horasBaseline: r2(suma((s) => s.horasBaseline)),
    horasPropuesta: r2(suma((s) => s.horasPropuesta)),
    coberturaPicoBaselinePct: ponderado((s) => s.coberturaPicoBaselinePct),
    coberturaPicoPropuestaPct: ponderado((s) => s.coberturaPicoPropuestaPct),
    tiendasConSubdotacionPico: porSucursal.length
      ? conDeficit.size
      : suma((s) => s.tiendasConSubdotacionPico),
    deficitPicoHoras: r2(suma((s) => s.deficitPicoHoras)),
  };
}

/**
 * Fila de `reporte_ejecutivo()` tal como la devuelve Postgres. Las coberturas
 * pueden venir null (semana sin intervalos pico), aunque el tipo generado no lo diga.
 */
type FilaReporteSql = Omit<
  Database["public"]["Functions"]["reporte_ejecutivo"]["Returns"][number],
  "cobertura_pico_baseline_pct" | "cobertura_pico_propuesta_pct"
> & {
  cobertura_pico_baseline_pct: number | null;
  cobertura_pico_propuesta_pct: number | null;
};

function aFilaReporte(r: FilaReporteSql): FilaReporte {
  return {
    semanaIso: r.semana_iso.slice(0, 10),
    tiendas: num(r.tiendas),
    costoBaseline: num(r.costo_baseline),
    costoPropuesta: num(r.costo_propuesta),
    ahorroMxn: num(r.ahorro_mxn),
    ahorroPct: num(r.ahorro_pct),
    ahorroDobles: num(r.ahorro_dobles),
    ahorroTriples: num(r.ahorro_triples),
    ahorroPrima: num(r.ahorro_prima),
    ahorroSobrestaffing: num(r.ahorro_sobrestaffing),
    horasBaseline: num(r.horas_baseline),
    horasPropuesta: num(r.horas_propuesta),
    coberturaPicoBaselinePct: num(r.cobertura_pico_baseline_pct),
    coberturaPicoPropuestaPct: num(r.cobertura_pico_propuesta_pct),
    tiendasConSubdotacionPico: num(r.tiendas_con_subdotacion_pico),
    deficitPicoHoras: num(r.deficit_pico_horas),
  };
}

function aSucursalReporte(r: AhorroFila, nombres: Map<string, string>): SucursalReporte | null {
  if (typeof r.sucursal_id !== "string" || typeof r.semana_iso !== "string") return null;
  return {
    sucursalId: r.sucursal_id,
    nombre: nombres.get(r.sucursal_id) ?? "Sucursal",
    semanaIso: r.semana_iso.slice(0, 10),
    costoBaseline: num(r.costo_total_baseline),
    costoPropuesta: num(r.costo_total_propuesta),
    ahorroMxn: num(r.ahorro_mxn),
    ahorroPct: num(r.ahorro_pct),
    coberturaPicoPropuestaPct:
      typeof r.cobertura_pico_propuesta_pct === "number" ? r.cobertura_pico_propuesta_pct : null,
    deficitPicoHoras: num(r.deficit_pico_horas_propuesta),
  };
}

const porPeorAhorro = (a: SucursalReporte, b: SucursalReporte) =>
  a.ahorroPct - b.ahorroPct || a.nombre.localeCompare(b.nombre, "es") || a.semanaIso.localeCompare(b.semanaIso);

/** Arma `DatosReporte` a partir de las filas ya traídas (mismo camino para demo y Supabase). */
function armar(
  base: Pick<DatosReporte, "origen" | "aviso" | "empresa">,
  filasReporte: FilaReporteSql[],
  filasAhorro: AhorroFila[],
  nombres: Map<string, string>,
): DatosReporte {
  const semanas = filasReporte.map(aFilaReporte).sort((a, b) => a.semanaIso.localeCompare(b.semanaIso));
  const porSucursal = filasAhorro
    .map((r) => aSucursalReporte(r, nombres))
    .filter((s): s is SucursalReporte => s !== null)
    .sort(porPeorAhorro);
  const mejores = [...porSucursal].sort((a, b) => porPeorAhorro(b, a)).slice(0, 5);
  return {
    ...base,
    tope: topeDe(filasAhorro),
    semanas,
    total: totalDe(semanas, porSucursal),
    porSucursal,
    mejores,
  };
}

/* ---------- Datos de muestra ---------- */

/** Semana ISO 31 de 2026, la misma que `supabase/seed.sql` y el panel demo. */
const LUNES_DEMO = "2026-07-27";

const AHORRO_DEMO: AhorroFila[] = [
  {
    sucursal_id: "coapa",
    semana_iso: LUNES_DEMO,
    escenario_baseline_id: "demo-b-coapa",
    escenario_propuesta_id: "demo-p-coapa",
    tope_semanal: TOPE_2030,
    costo_total_baseline: 214_380,
    costo_total_propuesta: 117_910,
    ahorro_mxn: 96_470,
    ahorro_pct: 45,
    ahorro_dobles: 61_200,
    ahorro_triples: 14_800,
    ahorro_prima: 6_470,
    ahorro_sobrestaffing: 14_000,
    cobertura_pico_baseline_pct: 92.5,
    cobertura_pico_propuesta_pct: 99.2,
    deficit_pico_horas_propuesta: 0,
    horas_baseline: 3_120,
    horas_propuesta: 2_680,
  },
  {
    sucursal_id: "polanco",
    semana_iso: LUNES_DEMO,
    escenario_baseline_id: "demo-b-polanco",
    escenario_propuesta_id: "demo-p-polanco",
    tope_semanal: TOPE_2030,
    costo_total_baseline: 226_940,
    costo_total_propuesta: 128_560,
    ahorro_mxn: 98_380,
    ahorro_pct: 43.35,
    ahorro_dobles: 60_100,
    ahorro_triples: 16_300,
    ahorro_prima: 7_180,
    ahorro_sobrestaffing: 14_800,
    cobertura_pico_baseline_pct: 90.8,
    cobertura_pico_propuesta_pct: 98.3,
    deficit_pico_horas_propuesta: 1.5,
    horas_baseline: 3_290,
    horas_propuesta: 2_810,
  },
  {
    sucursal_id: "satelite",
    semana_iso: LUNES_DEMO,
    escenario_baseline_id: "demo-b-satelite",
    escenario_propuesta_id: "demo-p-satelite",
    tope_semanal: TOPE_2030,
    costo_total_baseline: 201_150,
    costo_total_propuesta: 104_220,
    ahorro_mxn: 96_930,
    ahorro_pct: 48.19,
    ahorro_dobles: 58_400,
    ahorro_triples: 15_100,
    ahorro_prima: 6_330,
    ahorro_sobrestaffing: 17_100,
    cobertura_pico_baseline_pct: 93.1,
    cobertura_pico_propuesta_pct: 99.6,
    deficit_pico_horas_propuesta: 0,
    horas_baseline: 2_940,
    horas_propuesta: 2_540,
  },
];

const NOMBRES_DEMO = new Map([
  ["coapa", "Coapa"],
  ["polanco", "Polanco"],
  ["satelite", "Satélite"],
]);

/** Misma agregación que `reporte_ejecutivo()` en SQL, aplicada a las filas de muestra. */
function reporteDemo(filas: AhorroFila[]): FilaReporteSql[] {
  const grupos = new Map<string, AhorroFila[]>();
  for (const f of filas) {
    const k = f.semana_iso ?? "";
    grupos.set(k, [...(grupos.get(k) ?? []), f]);
  }
  return [...grupos.entries()].map(([semana_iso, g]) => {
    const suma = (f: (r: AhorroFila) => number | null) => g.reduce((a, r) => a + num(f(r)), 0);
    const prom = (f: (r: AhorroFila) => number | null) => {
      const v = g.map(f).filter((x): x is number => typeof x === "number");
      return v.length ? r2(v.reduce((a, b) => a + b, 0) / v.length) : null;
    };
    const costo_baseline = suma((r) => r.costo_total_baseline);
    const ahorro_mxn = suma((r) => r.ahorro_mxn);
    return {
      semana_iso,
      tiendas: g.length,
      costo_baseline,
      costo_propuesta: suma((r) => r.costo_total_propuesta),
      ahorro_mxn,
      ahorro_pct: costo_baseline > 0 ? r2((100 * ahorro_mxn) / costo_baseline) : 0,
      ahorro_dobles: suma((r) => r.ahorro_dobles),
      ahorro_triples: suma((r) => r.ahorro_triples),
      ahorro_prima: suma((r) => r.ahorro_prima),
      ahorro_sobrestaffing: suma((r) => r.ahorro_sobrestaffing),
      horas_baseline: suma((r) => r.horas_baseline),
      horas_propuesta: suma((r) => r.horas_propuesta),
      cobertura_pico_baseline_pct: prom((r) => r.cobertura_pico_baseline_pct),
      cobertura_pico_propuesta_pct: prom((r) => r.cobertura_pico_propuesta_pct),
      tiendas_con_subdotacion_pico: g.filter((r) => num(r.deficit_pico_horas_propuesta) > 0).length,
      deficit_pico_horas: suma((r) => r.deficit_pico_horas_propuesta),
    };
  });
}

export function reporteDeMuestra(aviso: DatosReporte["aviso"] = null): DatosReporte {
  return armar(
    { origen: "demo", aviso, empresa: { id: "demo", nombre: "Grupo Solmar" } },
    reporteDemo(AHORRO_DEMO),
    AHORRO_DEMO,
    NOMBRES_DEMO,
  );
}

/* ---------- Supabase ---------- */

async function cargarDesdeSupabase(supabase: Supabase): Promise<DatosReporte> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return reporteDeMuestra();

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("empresa_id, empresas(id, nombre)")
    .eq("id", user.id)
    .maybeSingle();
  const empresa = perfil?.empresas ?? null;
  // Cuenta con sesión pero sin empresa: reporte vacío (nunca datos de muestra).
  if (!perfil?.empresa_id || !empresa) {
    return armar({ origen: "supabase", aviso: "sin-datos", empresa: null }, [], [], new Map());
  }

  // RLS ya limita las tres consultas a la empresa del usuario (cadena
  // hubs.empresa_id → sucursal → escenario); `reporte_ejecutivo` es security invoker.
  const [{ data: filasReporte }, { data: filasAhorro }, { data: filasSucursales }] = await Promise.all([
    supabase.rpc("reporte_ejecutivo", {}),
    supabase.from("v_ahorro_escenario").select("*").order("semana_iso", { ascending: true }),
    supabase
      .from("sucursales")
      .select("id, nombre, hubs!inner(empresa_id)")
      .eq("hubs.empresa_id", empresa.id),
  ]);
  // Sin escenarios publicados: reporte vacío con la empresa real, sin muestra.
  if (!filasReporte?.length) {
    return armar(
      { origen: "supabase", aviso: "sin-datos", empresa: { id: empresa.id, nombre: empresa.nombre } },
      [],
      [],
      new Map(),
    );
  }

  const nombres = new Map((filasSucursales ?? []).map((s) => [s.id, s.nombre] as const));
  return armar(
    { origen: "supabase", aviso: null, empresa: { id: empresa.id, nombre: empresa.nombre } },
    filasReporte,
    filasAhorro ?? [],
    nombres,
  );
}

/** Memorizada por petición (React `cache`), igual que `obtenerDatosPanel`. */
const cargarReporte = cache(async (): Promise<DatosReporte> => {
  if (!hasSupabaseEnv()) return reporteDeMuestra();
  const supabase = await createClient();
  return cargarDesdeSupabase(supabase);
});

/** Reporte ejecutivo de la empresa del usuario (todas las semanas con baseline y propuesta publicados). */
export function obtenerReporte(): Promise<DatosReporte> {
  return cargarReporte();
}

export type { DatosReporte, FilaReporte, SucursalReporte, TotalReporte } from "@/lib/datos/tipos";
