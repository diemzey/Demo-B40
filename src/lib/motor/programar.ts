/**
 * programarSemana(): corre el motor de programación desde la app, en el
 * navegador, con la sesión del usuario (aplican RLS y los constraint triggers
 * de 0006_programacion.sql). Sin React ni APIs de Node; importable desde
 * componentes "use client".
 *
 * Pasos (todos a través del cliente Supabase firmado):
 *   a. Catálogo mínimo (idempotente): habilidades piso/caja/almacen/supervision,
 *      un `puesto` por texto distinto de `empleados.puesto`, tabulador por
 *      puesto, `empleados.puesto_id`, `empleado_habilidades` (puesto + piso),
 *      `plantillas_turno` (si la empresa no tiene) y una fila de
 *      `reglas_laborales` de la empresa para el tope pedido.
 *   b. Demanda: con `trafico_observado` previo → pronóstico (media estacional)
 *      + requerimiento por productividad. Sin tráfico → "cobertura actual":
 *      la demanda por intervalo y habilidad es la que hoy cubre el horario
 *      importado (ver `demandaCoberturaActual`).
 *   c. Baseline: rpc `materializar_baseline` + `resumir_escenario`.
 *   d. Optimización: `optimizar` (Web Worker si existe; si no, en línea).
 *   e. Guardar: `escenarios` propuesta (borrador) + `asignaciones` en lotes
 *      de 500 → publicado → `resumir_escenario` → `v_ahorro_escenario`.
 *      Si algo falla después de crear el borrador, se borra y se relanza el
 *      error con mensaje en español.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "../supabase/database.types";
import type {
  Catalogo,
  DemandaFila,
  Empleado,
  ParametrosDemanda,
  PlantillaTurno,
  ReglasLaborales,
  ResultadoOptimizacion,
  Sucursal,
  TraficoFila,
} from "./tipos";
import { optimizar, type EntradaOptimizacion } from "./optimizar";
import { FACTOR_QUINCENA, METODO_PRONOSTICO, SEMANAS_HISTORIA, esSemanaQuincena, pronosticar } from "./pronostico";
import { PERCENTIL_PICO, percentilNearestRank, requerimiento } from "./requerimiento";
import {
  MS_DIA,
  MS_INTERVALO,
  MS_MIN,
  esLunes,
  fechaAMs,
  fechaHoraAMs,
  hhmmAMin,
  minAHHMM,
  msAIso,
  msAMinDia,
  sumarDias,
} from "./tiempo";

// ---------------------------------------------------------------------------
// Contrato público
// ---------------------------------------------------------------------------

export type ProgresoProgramacion = {
  paso: "catalogo" | "demanda" | "baseline" | "optimizando" | "guardando" | "resumiendo" | "listo";
  detalle?: string;
  pct: number;
};

export type ResultadoProgramacion = {
  escenarioBaselineId: string;
  escenarioPropuestaId: string;
  tope: number;
  ahorroMxn: number;
  ahorroPct: number;
  costoBaseline: number;
  costoPropuesta: number;
  horasDoblesBaseline: number;
  coberturaPicoBaselinePct: number | null;
  coberturaPicoPropuestaPct: number | null;
  deficitPicoHoras: number;
  vacantesHoras: number;
  asignaciones: number;
  ms: number;
};

export type OpcionesProgramacion = {
  supabase: SupabaseClient<Database>;
  sucursalId: string;
  /** Lunes ISO "YYYY-MM-DD". */
  semanaIso: string;
  /** Tope semanal de la propuesta (default 40). */
  tope?: number;
  /** Salario/hora para los puestos sin tabulador (default 60). */
  costoHoraDefault?: number;
  onProgreso?: (p: ProgresoProgramacion) => void;
};

export const TOPE_DEFAULT = 40;
export const COSTO_HORA_DEFAULT = 60;
export const PRESUPUESTO_MS = 3000;
export const METODO_COBERTURA_ACTUAL = "cobertura_actual";
export const LOTE = 500;

/** Habilidades mínimas de la empresa (mismas claves que scripts/sintetico). */
export const HABILIDADES_BASE: ReadonlyArray<{ clave: string; nombre: string }> = [
  { clave: "piso", nombre: "Piso de venta" },
  { clave: "caja", nombre: "Caja" },
  { clave: "almacen", nombre: "Almacén" },
  { clave: "supervision", nombre: "Supervisión" },
];

/** Plantillas estándar que se añaden cuando la empresa no tiene ninguna. */
export const PLANTILLAS_ESTANDAR: ReadonlyArray<{ hora_inicio: string; hora_fin: string; descanso_min: number }> = [
  { hora_inicio: "09:00", hora_fin: "17:30", descanso_min: 30 },
  { hora_inicio: "12:00", hora_fin: "20:30", descanso_min: 30 },
  { hora_inicio: "11:30", hora_fin: "20:00", descanso_min: 30 },
  { hora_inicio: "12:30", hora_fin: "21:00", descanso_min: 30 },
  { hora_inicio: "09:00", hora_fin: "15:00", descanso_min: 0 },
  { hora_inicio: "15:00", hora_fin: "21:00", descanso_min: 0 },
  { hora_inicio: "14:30", hora_fin: "20:30", descanso_min: 0 },
  { hora_inicio: "16:30", hora_fin: "20:30", descanso_min: 0 },
  { hora_inicio: "09:00", hora_fin: "13:00", descanso_min: 0 },
  { hora_inicio: "17:00", hora_fin: "21:00", descanso_min: 0 },
];

/** Productividad por defecto (docs/arquitectura.md §5, docs/calibracion-datos.md). */
export const PARAMETROS_DEMANDA_DEFAULT: ParametrosDemanda = {
  clientes_por_colaborador_30min: 10,
  transacciones_por_cajero_30min: 16,
  conversion: 0.35,
  minimo_apertura: { caja: 1, piso: 2, almacen: 1, supervision: 1 },
};

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------

type Cliente = SupabaseClient<Database>;
type ErrorPg = { message: string; code?: string; details?: string | null; hint?: string | null } | null;

function fallo(contexto: string, error: ErrorPg): Error {
  const partes = [error?.message, error?.details, error?.hint].filter(Boolean);
  return new Error(`${contexto}${error?.code ? ` [${error.code}]` : ""}${partes.length ? `: ${partes.join(" · ")}` : ""}`);
}

function mensajeDe(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

/** Lee todas las páginas de una consulta (PostgREST limita a 1000 filas por defecto). */
async function paginar<T>(
  contexto: string,
  consulta: (desde: number, hasta: number) => PromiseLike<{ data: T[] | null; error: ErrorPg }>,
): Promise<T[]> {
  const TAM = 1000;
  const out: T[] = [];
  for (let desde = 0; ; desde += TAM) {
    const { data, error } = await consulta(desde, desde + TAM - 1);
    if (error) throw fallo(contexto, error);
    const filas = data ?? [];
    out.push(...filas);
    if (filas.length < TAM) break;
  }
  return out;
}

function lotes<T>(items: readonly T[], tam = LOTE): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += tam) out.push(items.slice(i, i + tam));
  return out;
}

/** Cede el hilo principal para que la UI pinte el progreso. */
function cederTurno(): Promise<void> {
  return new Promise((r) => setTimeout(r, 0));
}

function sinAcentos(texto: string): string {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/** Texto libre de puesto → clave estable: "Vendedor(a) de piso" → "vendedor_a_de_piso". */
export function slugPuesto(texto: string | null | undefined): string {
  const s = sinAcentos((texto ?? "").trim().toLowerCase())
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40)
    .replace(/_+$/g, "");
  return s || "sin_puesto";
}

/** Habilidad exigida por un puesto según palabras clave del texto. */
export function habilidadDePuesto(texto: string | null | undefined): string {
  const t = sinAcentos((texto ?? "").toLowerCase());
  if (/caj/.test(t)) return "caja";
  if (/almac|bodeg|recib/.test(t)) return "almacen";
  if (/superv|gerent|encarg|jefe/.test(t)) return "supervision";
  return "piso";
}

function nombrePuesto(texto: string | null | undefined): string {
  const t = (texto ?? "").trim();
  return t || "Sin puesto";
}

/** "HH:MM[:SS]" → "HH:MM". */
function hhmm(t: string): string {
  return minAHHMM(hhmmAMin(t));
}

// ---------------------------------------------------------------------------
// Filas de la base que usa el motor
// ---------------------------------------------------------------------------

interface EmpleadoDb {
  id: string;
  nombre: string;
  apellido: string;
  puesto: string | null;
  puesto_id: string | null;
  activo: boolean;
  max_horas_semana: number;
  jornada_contratada_horas: number | null;
  tipo_contrato: "tiempo_completo" | "medio_tiempo";
}

interface HorarioDb {
  id: string;
  empleado_id: string;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  cruza_medianoche: boolean;
  minutos_descanso: number;
}

interface PuestoDb {
  id: string;
  clave: string;
  nombre: string;
  habilidad_id: string | null;
}

interface PlantillaDb {
  id: string;
  clave: string;
  hora_inicio: string;
  duracion_min: number;
  descanso_min: number;
  activa: boolean;
}

interface ReglasDb {
  id: string;
  empresa_id: string | null;
  vigente_desde: string;
  tope_semanal: number;
  max_horas_dia: number;
  horas_dobles_max: number;
  factor_doble: number;
  factor_triple: number;
  prima_dominical_pct: number;
  descanso_entre_turnos_horas: number;
  max_dias_semana: number;
}

/** Turno del horario importado, en ms epoch (hora local México). */
interface TurnoImportado {
  empleado_id: string;
  ini: number;
  fin: number;
  descanso_min: number;
  habilidad_clave: string;
}

interface Contexto {
  sb: Cliente;
  empresaId: string;
  sucursalId: string;
  sucursalNombre: string;
  semana: string;
  domingo: string;
  tope: number;
  costoHora: number;
  progreso: (p: ProgresoProgramacion) => void;
}

// ---------------------------------------------------------------------------
// a. Catálogo mínimo
// ---------------------------------------------------------------------------

interface Catalogo_ {
  habilidades: Map<string, string>; // clave → id
  habilidadClavePorId: Map<string, string>;
  puestos: PuestoDb[];
  /** texto de empleados.puesto → puesto */
  puestoPorTexto: Map<string, PuestoDb>;
  tabuladores: { puesto_id: string; vigente_desde: string; salario_hora: number; prima_dominical_pct: number }[];
  plantillas: PlantillaDb[];
  reglas: ReglasDb;
  empleados: EmpleadoDb[];
  /** empleado_id → claves de habilidad vigentes toda la semana */
  habilidadesEmpleado: Map<string, Set<string>>;
  horarios: HorarioDb[];
}

async function leerEmpleados(ctx: Contexto): Promise<EmpleadoDb[]> {
  return paginar<EmpleadoDb>("empleados", (a, b) =>
    ctx.sb
      .from("empleados")
      .select("id, nombre, apellido, puesto, puesto_id, activo, max_horas_semana, jornada_contratada_horas, tipo_contrato")
      .eq("sucursal_id", ctx.sucursalId)
      .order("id")
      .range(a, b),
  );
}

async function leerHorarios(ctx: Contexto): Promise<HorarioDb[]> {
  const filas = await paginar<HorarioDb & { empleados: unknown }>("horarios", (a, b) =>
    ctx.sb
      .from("horarios")
      .select("id, empleado_id, fecha, hora_inicio, hora_fin, cruza_medianoche, minutos_descanso, empleados!inner(sucursal_id)")
      .eq("empleados.sucursal_id", ctx.sucursalId)
      .gte("fecha", ctx.semana)
      .lte("fecha", ctx.domingo)
      .order("id")
      .range(a, b),
  );
  return filas.map((h) => ({
    id: h.id,
    empleado_id: h.empleado_id,
    fecha: h.fecha,
    hora_inicio: h.hora_inicio,
    hora_fin: h.hora_fin,
    cruza_medianoche: h.cruza_medianoche,
    minutos_descanso: h.minutos_descanso,
  }));
}

async function asegurarHabilidades(ctx: Contexto): Promise<Map<string, string>> {
  const { data, error } = await ctx.sb.from("habilidades").select("id, clave").eq("empresa_id", ctx.empresaId);
  if (error) throw fallo("leer habilidades", error);
  const mapa = new Map((data ?? []).map((h) => [h.clave, h.id]));
  const faltan = HABILIDADES_BASE.filter((h) => !mapa.has(h.clave));
  if (faltan.length) {
    const { data: nuevas, error: eIns } = await ctx.sb
      .from("habilidades")
      .insert(faltan.map((h) => ({ empresa_id: ctx.empresaId, clave: h.clave, nombre: h.nombre })))
      .select("id, clave");
    if (eIns) throw fallo("crear habilidades", eIns);
    for (const h of nuevas ?? []) mapa.set(h.clave, h.id);
  }
  return mapa;
}

async function asegurarPuestos(
  ctx: Contexto,
  empleados: EmpleadoDb[],
  habilidades: Map<string, string>,
): Promise<{ puestos: PuestoDb[]; puestoPorTexto: Map<string, PuestoDb> }> {
  const { data, error } = await ctx.sb.from("puestos").select("id, clave, nombre, habilidad_id").eq("empresa_id", ctx.empresaId);
  if (error) throw fallo("leer puestos", error);
  const puestos: PuestoDb[] = data ?? [];
  const porClave = new Map(puestos.map((p) => [p.clave, p]));

  const textos = [...new Set(empleados.map((e) => nombrePuesto(e.puesto)))];
  const nuevos: { empresa_id: string; clave: string; nombre: string; habilidad_id: string }[] = [];
  const vistos = new Set<string>();
  for (const texto of textos) {
    const clave = slugPuesto(texto);
    if (porClave.has(clave) || vistos.has(clave)) continue;
    vistos.add(clave);
    nuevos.push({ empresa_id: ctx.empresaId, clave, nombre: texto, habilidad_id: habilidades.get(habilidadDePuesto(texto))! });
  }
  if (nuevos.length) {
    const { data: creados, error: eIns } = await ctx.sb.from("puestos").insert(nuevos).select("id, clave, nombre, habilidad_id");
    if (eIns) throw fallo("crear puestos", eIns);
    for (const p of creados ?? []) {
      puestos.push(p);
      porClave.set(p.clave, p);
    }
  }
  // Puestos existentes sin habilidad: se completa por palabra clave.
  for (const p of puestos) {
    if (p.habilidad_id) continue;
    const habilidad_id = habilidades.get(habilidadDePuesto(p.nombre))!;
    const { error: eUpd } = await ctx.sb.from("puestos").update({ habilidad_id }).eq("id", p.id);
    if (eUpd) throw fallo(`asignar habilidad al puesto ${p.clave}`, eUpd);
    p.habilidad_id = habilidad_id;
  }
  const puestoPorTexto = new Map<string, PuestoDb>();
  for (const texto of textos) puestoPorTexto.set(texto, porClave.get(slugPuesto(texto))!);
  return { puestos, puestoPorTexto };
}

async function asegurarTabuladores(ctx: Contexto, puestos: PuestoDb[]): Promise<Catalogo_["tabuladores"]> {
  const ids = puestos.map((p) => p.id);
  const filas = await paginar<{ puesto_id: string; vigente_desde: string; salario_hora: number; prima_dominical_pct: number }>(
    "tabuladores",
    (a, b) =>
      ctx.sb
        .from("tabuladores")
        .select("puesto_id, vigente_desde, salario_hora, prima_dominical_pct")
        .in("puesto_id", ids)
        .order("puesto_id")
        .order("vigente_desde")
        .range(a, b),
  );
  const conVigente = new Set(filas.filter((t) => t.vigente_desde <= ctx.semana).map((t) => t.puesto_id));
  // Vigencia del tabulador por defecto: 2026-01-01, o el lunes si la semana es anterior.
  const vigente_desde = ctx.semana < "2026-01-01" ? ctx.semana : "2026-01-01";
  const nuevos = puestos
    .filter((p) => !conVigente.has(p.id))
    .map((p) => ({ puesto_id: p.id, vigente_desde, salario_hora: ctx.costoHora, prima_dominical_pct: 25 }));
  if (nuevos.length) {
    const { data, error } = await ctx.sb.from("tabuladores").insert(nuevos).select("puesto_id, vigente_desde, salario_hora, prima_dominical_pct");
    if (error) throw fallo("crear tabuladores", error);
    filas.push(...(data ?? []));
  }
  return filas;
}

async function asegurarPuestoEmpleados(ctx: Contexto, empleados: EmpleadoDb[], puestoPorTexto: Map<string, PuestoDb>): Promise<void> {
  const porPuesto = new Map<string, string[]>();
  for (const e of empleados) {
    if (e.puesto_id) continue;
    const p = puestoPorTexto.get(nombrePuesto(e.puesto))!;
    porPuesto.set(p.id, [...(porPuesto.get(p.id) ?? []), e.id]);
    e.puesto_id = p.id;
  }
  for (const [puesto_id, ids] of porPuesto) {
    for (const lote of lotes(ids, 200)) {
      const { error } = await ctx.sb.from("empleados").update({ puesto_id }).in("id", lote);
      if (error) throw fallo("asignar puesto_id a empleados", error);
    }
  }
}

async function asegurarHabilidadesEmpleados(
  ctx: Contexto,
  empleados: EmpleadoDb[],
  puestos: PuestoDb[],
  habilidades: Map<string, string>,
  habilidadClavePorId: Map<string, string>,
): Promise<Map<string, Set<string>>> {
  const puestoPorId = new Map(puestos.map((p) => [p.id, p]));
  const ids = empleados.map((e) => e.id);
  const existentes: { empleado_id: string; habilidad_id: string; certificado_hasta: string | null }[] = [];
  for (const lote of lotes(ids, 200)) {
    existentes.push(
      ...(await paginar<{ empleado_id: string; habilidad_id: string; certificado_hasta: string | null }>("empleado_habilidades", (a, b) =>
        ctx.sb
          .from("empleado_habilidades")
          .select("empleado_id, habilidad_id, certificado_hasta")
          .in("empleado_id", lote)
          .order("empleado_id")
          .order("habilidad_id")
          .range(a, b),
      )),
    );
  }
  const tiene = new Set(existentes.map((r) => `${r.empleado_id}|${r.habilidad_id}`));
  const nuevos: { empleado_id: string; habilidad_id: string }[] = [];
  const piso = habilidades.get("piso")!;
  for (const e of empleados) {
    const habPuesto = (e.puesto_id && puestoPorId.get(e.puesto_id)?.habilidad_id) || piso;
    for (const habilidad_id of new Set([habPuesto, piso])) {
      const k = `${e.id}|${habilidad_id}`;
      if (tiene.has(k)) continue;
      tiene.add(k);
      nuevos.push({ empleado_id: e.id, habilidad_id });
      existentes.push({ empleado_id: e.id, habilidad_id, certificado_hasta: null });
    }
  }
  for (const lote of lotes(nuevos)) {
    const { error } = await ctx.sb.from("empleado_habilidades").insert(lote);
    if (error) throw fallo("crear empleado_habilidades", error);
  }
  // Para el motor sólo cuentan las habilidades vigentes toda la semana
  // (el trigger las exige vigentes el día de cada turno).
  const out = new Map<string, Set<string>>();
  for (const r of existentes) {
    if (r.certificado_hasta && r.certificado_hasta < ctx.domingo) continue;
    const clave = habilidadClavePorId.get(r.habilidad_id);
    if (!clave) continue;
    if (!out.has(r.empleado_id)) out.set(r.empleado_id, new Set());
    out.get(r.empleado_id)!.add(clave);
  }
  return out;
}

/** Duración en minutos de un horario importado (considera cruce de medianoche). */
function duracionHorario(h: HorarioDb): number {
  const d = hhmmAMin(h.hora_fin) - hhmmAMin(h.hora_inicio) + (h.cruza_medianoche ? 1440 : 0);
  return d;
}

async function asegurarPlantillas(ctx: Contexto, horarios: HorarioDb[]): Promise<PlantillaDb[]> {
  const { data, error } = await ctx.sb
    .from("plantillas_turno")
    .select("id, clave, hora_inicio, duracion_min, descanso_min, activa")
    .eq("empresa_id", ctx.empresaId);
  if (error) throw fallo("leer plantillas_turno", error);
  if (data && data.length) return data;

  // Sin plantillas: las del propio horario importado (inicio y duración
  // alineados a 30 min) más un juego estándar; sin duplicados.
  const combos = new Map<string, { hora_inicio: string; duracion_min: number; descanso_min: number }>();
  const agregar = (inicioMin: number, duracion: number, descanso: number) => {
    if (duracion < 180 || duracion > 600 || descanso < 0 || descanso >= duracion) return;
    if (inicioMin % 30 !== 0 || duracion % 30 !== 0 || inicioMin + duracion > 1440) return;
    const k = `${inicioMin}|${duracion}|${descanso}`;
    if (!combos.has(k)) combos.set(k, { hora_inicio: minAHHMM(inicioMin), duracion_min: duracion, descanso_min: descanso });
  };
  for (const h of horarios) agregar(hhmmAMin(h.hora_inicio), duracionHorario(h), h.minutos_descanso);
  for (const p of PLANTILLAS_ESTANDAR) agregar(hhmmAMin(p.hora_inicio), hhmmAMin(p.hora_fin) - hhmmAMin(p.hora_inicio), p.descanso_min);

  const filas = [...combos.values()].map((c) => {
    const fin = hhmmAMin(c.hora_inicio) + c.duracion_min;
    return {
      empresa_id: ctx.empresaId,
      clave: `t${c.hora_inicio.replace(":", "")}_${minAHHMM(fin).replace(":", "")}_${c.descanso_min}`,
      hora_inicio: c.hora_inicio,
      duracion_min: c.duracion_min,
      descanso_min: c.descanso_min,
      activa: true,
    };
  });
  const { data: creadas, error: eIns } = await ctx.sb
    .from("plantillas_turno")
    .insert(filas)
    .select("id, clave, hora_inicio, duracion_min, descanso_min, activa");
  if (eIns) throw fallo("crear plantillas_turno", eIns);
  return creadas ?? [];
}

async function asegurarReglas(ctx: Contexto): Promise<ReglasDb> {
  const columnas =
    "id, empresa_id, vigente_desde, tope_semanal, max_horas_dia, horas_dobles_max, factor_doble, factor_triple, prima_dominical_pct, descanso_entre_turnos_horas, max_dias_semana";
  const { data, error } = await ctx.sb
    .from("reglas_laborales")
    .select(columnas)
    .or(`empresa_id.eq.${ctx.empresaId},empresa_id.is.null`)
    .lte("vigente_desde", ctx.semana)
    .order("vigente_desde", { ascending: false });
  if (error) throw fallo("leer reglas_laborales", error);
  const filas: ReglasDb[] = data ?? [];
  const enLunes = filas.find((r) => r.empresa_id === ctx.empresaId && r.vigente_desde === ctx.semana);
  if (enLunes) {
    if (Number(enLunes.tope_semanal) === ctx.tope) return enLunes;
    const { data: upd, error: eUpd } = await ctx.sb
      .from("reglas_laborales")
      .update({ tope_semanal: ctx.tope })
      .eq("id", enLunes.id)
      .select(columnas)
      .single();
    if (eUpd || !upd) throw fallo("actualizar reglas_laborales", eUpd ?? { message: "sin fila" });
    return upd;
  }
  const global = filas.find((r) => r.empresa_id === null);
  if (!global) throw new Error(`No hay reglas laborales globales vigentes al ${ctx.semana}`);
  const { data: nueva, error: eIns } = await ctx.sb
    .from("reglas_laborales")
    .insert({
      empresa_id: ctx.empresaId,
      vigente_desde: ctx.semana,
      tope_semanal: ctx.tope,
      max_horas_dia: global.max_horas_dia,
      horas_dobles_max: global.horas_dobles_max,
      factor_doble: global.factor_doble,
      factor_triple: global.factor_triple,
      prima_dominical_pct: global.prima_dominical_pct,
      descanso_entre_turnos_horas: global.descanso_entre_turnos_horas,
      max_dias_semana: global.max_dias_semana,
    })
    .select(columnas)
    .single();
  if (eIns || !nueva) throw fallo("crear reglas_laborales de la empresa", eIns ?? { message: "sin fila" });
  return nueva;
}

async function asegurarCatalogo(ctx: Contexto): Promise<Catalogo_> {
  ctx.progreso({ paso: "catalogo", pct: 3, detalle: "Leyendo colaboradores y turnos" });
  const [empleados, horarios] = await Promise.all([leerEmpleados(ctx), leerHorarios(ctx)]);
  if (empleados.length === 0) throw new Error("La sucursal no tiene colaboradores; importa primero el CSV de turnos.");
  if (horarios.length === 0) throw new Error(`No hay turnos importados para la semana del ${ctx.semana} en esta sucursal.`);

  ctx.progreso({ paso: "catalogo", pct: 6, detalle: "Habilidades y puestos" });
  const habilidades = await asegurarHabilidades(ctx);
  const habilidadClavePorId = new Map([...habilidades].map(([clave, id]) => [id, clave]));
  const { puestos, puestoPorTexto } = await asegurarPuestos(ctx, empleados, habilidades);
  ctx.progreso({ paso: "catalogo", pct: 10, detalle: "Tabuladores y habilidades por colaborador" });
  const [tabuladores] = await Promise.all([asegurarTabuladores(ctx, puestos), asegurarPuestoEmpleados(ctx, empleados, puestoPorTexto)]);
  const habilidadesEmpleado = await asegurarHabilidadesEmpleados(ctx, empleados, puestos, habilidades, habilidadClavePorId);
  ctx.progreso({ paso: "catalogo", pct: 15, detalle: "Plantillas de turno y reglas" });
  const [plantillas, reglas] = await Promise.all([asegurarPlantillas(ctx, horarios), asegurarReglas(ctx)]);
  return { habilidades, habilidadClavePorId, puestos, puestoPorTexto, tabuladores, plantillas, reglas, empleados, habilidadesEmpleado, horarios };
}

// ---------------------------------------------------------------------------
// b. Demanda
// ---------------------------------------------------------------------------

/** Turnos del horario importado en ms, con la habilidad del puesto del colaborador. */
function turnosImportados(cat: Catalogo_): TurnoImportado[] {
  const puestoPorId = new Map(cat.puestos.map((p) => [p.id, p]));
  const empPorId = new Map(cat.empleados.map((e) => [e.id, e]));
  const out: TurnoImportado[] = [];
  for (const h of cat.horarios) {
    const e = empPorId.get(h.empleado_id);
    const habId = e?.puesto_id ? puestoPorId.get(e.puesto_id)?.habilidad_id : null;
    const ini = fechaHoraAMs(h.fecha, h.hora_inicio);
    const fin = fechaHoraAMs(h.fecha, h.hora_fin) + (h.cruza_medianoche ? MS_DIA : 0);
    if (fin <= ini) continue;
    out.push({
      empleado_id: h.empleado_id,
      ini,
      fin,
      descanso_min: h.minutos_descanso,
      habilidad_clave: (habId && cat.habilidadClavePorId.get(habId)) || "piso",
    });
  }
  return out;
}

/** Horario de tienda (minutos desde medianoche, múltiplos de 30) a partir de los turnos importados. */
function horarioTienda(turnos: TurnoImportado[]): { apertura: number; cierre: number } {
  let apertura = 1440;
  let cierre = 0;
  for (const t of turnos) {
    const a = msAMinDia(t.ini);
    const c = a + (t.fin - t.ini) / MS_MIN;
    apertura = Math.min(apertura, Math.floor(a / 30) * 30);
    cierre = Math.max(cierre, Math.min(1440, Math.ceil(c / 30) * 30));
  }
  if (cierre <= apertura) return { apertura: 9 * 60, cierre: 21 * 60 };
  return { apertura, cierre };
}

/**
 * Demanda "cobertura actual": sin tráfico observado no hay pronóstico posible,
 * así que el requerimiento por intervalo y habilidad es exactamente la
 * cobertura que hoy da el horario importado (turnos que contienen el inicio
 * del intervalo, por habilidad del puesto). `es_pico` = requerido_total ≥
 * percentil 80 (nearest-rank) de la semana. Con esta demanda la propuesta
 * conserva la curva de cobertura de hoy y elimina las horas extra: el ahorro
 * viene de dobles/triples y prima, y si la plantilla no alcanza para cubrir
 * lo mismo bajo el tope aparecen `vacantes` (horas-turno sin cubrir).
 */
export function demandaCoberturaActual(
  turnos: TurnoImportado[],
  semana: string,
  horario: { apertura: number; cierre: number },
  habilidades: string[],
): DemandaFila[] {
  const S = Math.round((horario.cierre - horario.apertura) / 30);
  const inicioSemana = fechaAMs(semana);
  const filas: DemandaFila[] = [];
  for (let d = 0; d < 7; d++) {
    for (let s = 0; s < S; s++) {
      const ms = inicioSemana + d * MS_DIA + (horario.apertura + s * 30) * MS_MIN;
      const porHab: Record<string, number> = {};
      for (const h of habilidades) porHab[h] = 0;
      for (const t of turnos) {
        if (t.ini <= ms && ms < t.fin) porHab[t.habilidad_clave] = (porHab[t.habilidad_clave] ?? 0) + 1;
      }
      const total = Object.values(porHab).reduce((a, b) => a + b, 0);
      filas.push({
        inicio: msAIso(ms),
        fin: msAIso(ms + MS_INTERVALO),
        trafico: 0,
        ventas: 0,
        requerido_total: total,
        requerido_caja: porHab.caja ?? 0,
        es_pico: false,
        requerido_por_habilidad: porHab,
      });
    }
  }
  const umbral = percentilNearestRank(
    filas.map((f) => f.requerido_total),
    PERCENTIL_PICO,
  );
  for (const f of filas) f.es_pico = f.requerido_total >= umbral;
  return filas;
}

async function leerTrafico(ctx: Contexto): Promise<TraficoFila[]> {
  const desde = msAIso(fechaAMs(ctx.semana) - SEMANAS_HISTORIA * 7 * MS_DIA);
  const hasta = msAIso(fechaAMs(ctx.semana));
  return paginar<TraficoFila>("trafico_observado", (a, b) =>
    ctx.sb
      .from("trafico_observado")
      .select("inicio, trafico, ventas")
      .eq("sucursal_id", ctx.sucursalId)
      .gte("inicio", desde)
      .lt("inicio", hasta)
      .order("inicio")
      .range(a, b),
  );
}

async function generarDemanda(
  ctx: Contexto,
  cat: Catalogo_,
  turnos: TurnoImportado[],
  horario: { apertura: number; cierre: number },
): Promise<{ pronosticoId: string; demanda: DemandaFila[]; metodo: string }> {
  ctx.progreso({ paso: "demanda", pct: 20, detalle: "Buscando tráfico observado" });
  const trafico = await leerTrafico(ctx);
  let demanda: DemandaFila[];
  let metodo: string;
  let parametros: Record<string, Json>;
  if (trafico.length > 0) {
    const intervalos = pronosticar(trafico, ctx.semana, { apertura: minAHHMM(horario.apertura), cierre: minAHHMM(horario.cierre) });
    demanda = requerimiento(intervalos, PARAMETROS_DEMANDA_DEFAULT);
    metodo = METODO_PRONOSTICO;
    parametros = {
      semanas_historia: SEMANAS_HISTORIA,
      factor_quincena: FACTOR_QUINCENA,
      es_quincena: esSemanaQuincena(ctx.semana),
      filas_trafico: trafico.length,
      ...PARAMETROS_DEMANDA_DEFAULT,
    };
  } else {
    demanda = demandaCoberturaActual(turnos, ctx.semana, horario, [...cat.habilidades.keys()].sort());
    metodo = METODO_COBERTURA_ACTUAL;
    parametros = {
      descripcion: "Sin tráfico observado: requerido por intervalo y habilidad = cobertura del horario importado; pico = percentil 80.",
      percentil_pico: PERCENTIL_PICO,
      turnos_importados: turnos.length,
      apertura: minAHHMM(horario.apertura),
      cierre: minAHHMM(horario.cierre),
    };
  }
  ctx.progreso({ paso: "demanda", pct: 24, detalle: `Guardando ${demanda.length} intervalos (${metodo})` });
  const { data: pr, error: ePr } = await ctx.sb
    .from("pronosticos")
    .insert({ sucursal_id: ctx.sucursalId, semana_iso: ctx.semana, metodo, parametros })
    .select("id")
    .single();
  if (ePr || !pr) throw fallo("crear pronóstico", ePr ?? { message: "sin id" });
  const filas = demanda.map((d) => ({
    pronostico_id: pr.id,
    sucursal_id: ctx.sucursalId,
    semana_iso: ctx.semana,
    inicio: d.inicio,
    fin: d.fin,
    trafico: d.trafico,
    ventas: d.ventas,
    requerido_total: d.requerido_total,
    requerido_caja: d.requerido_caja,
    es_pico: d.es_pico,
  }));
  for (const lote of lotes(filas)) {
    const { error } = await ctx.sb.from("demanda_intervalo").insert(lote);
    if (error) throw fallo("guardar demanda_intervalo", error);
  }
  return { pronosticoId: pr.id, demanda, metodo };
}

// ---------------------------------------------------------------------------
// d. Entrada del motor y ejecución (Web Worker o en línea)
// ---------------------------------------------------------------------------

function construirEntrada(
  ctx: Contexto,
  cat: Catalogo_,
  demanda: DemandaFila[],
  horario: { apertura: number; cierre: number },
  disponibilidad: Map<string, Empleado["disponibilidad"]>,
): EntradaOptimizacion {
  const puestoPorId = new Map(cat.puestos.map((p) => [p.id, p]));
  const sucursal: Sucursal = {
    clave: ctx.sucursalId,
    nombre: ctx.sucursalNombre,
    hub_clave: "",
    ciudad: "",
    apertura: minAHHMM(horario.apertura),
    cierre: minAHHMM(horario.cierre),
    fte: cat.empleados.length,
  };
  const empleados: Empleado[] = cat.empleados
    .filter((e) => e.activo && e.puesto_id)
    .map((e) => ({
      clave_externa: e.id,
      sucursal_clave: ctx.sucursalId,
      nombre: e.nombre,
      apellido: e.apellido,
      puesto_clave: puestoPorId.get(e.puesto_id!)!.clave,
      tipo_contrato: e.tipo_contrato,
      jornada_contratada: Number(e.jornada_contratada_horas ?? e.max_horas_semana),
      // El trigger aplica least(escenario.tope, empleados.max_horas_semana).
      max_horas_semana: Math.min(ctx.tope, Number(e.max_horas_semana)),
      habilidades: [...(cat.habilidadesEmpleado.get(e.id) ?? [])].sort(),
      disponibilidad: disponibilidad.get(e.id) ?? [],
    }));
  const plantillas: PlantillaTurno[] = cat.plantillas
    .filter((p) => p.activa)
    .map((p) => ({ clave: p.clave, hora_inicio: hhmm(p.hora_inicio), duracion_min: p.duracion_min, descanso_min: p.descanso_min }));
  const reglas: ReglasLaborales = {
    vigente_desde: cat.reglas.vigente_desde,
    tope_semanal: Number(cat.reglas.tope_semanal),
    max_horas_dia: Number(cat.reglas.max_horas_dia),
    horas_dobles_max: Number(cat.reglas.horas_dobles_max),
    factor_doble: Number(cat.reglas.factor_doble),
    factor_triple: Number(cat.reglas.factor_triple),
    prima_dominical_pct: Number(cat.reglas.prima_dominical_pct),
    descanso_entre_turnos_horas: Number(cat.reglas.descanso_entre_turnos_horas),
    max_dias_semana: Number(cat.reglas.max_dias_semana),
  };
  const catalogo: Catalogo = {
    empresa: { nombre: "" },
    hubs: [],
    sucursales: [sucursal],
    puestos: cat.puestos.map((p) => ({
      clave: p.clave,
      nombre: p.nombre,
      habilidad_clave: (p.habilidad_id && cat.habilidadClavePorId.get(p.habilidad_id)) || "piso",
    })),
    habilidades: [...cat.habilidades.keys()].map((clave) => ({ clave, nombre: clave })),
    tabuladores: cat.tabuladores.map((t) => ({
      puesto_clave: puestoPorId.get(t.puesto_id)?.clave ?? "",
      vigente_desde: t.vigente_desde,
      salario_hora: Number(t.salario_hora),
      prima_dominical_pct: Number(t.prima_dominical_pct),
    })),
    plantillas_turno: plantillas,
    reglas_laborales: reglas,
    parametros_demanda: PARAMETROS_DEMANDA_DEFAULT,
  };
  return { sucursal, semana: ctx.semana, empleados, plantillas, reglas, demanda, catalogo, tope_semanal: ctx.tope, presupuesto_ms: PRESUPUESTO_MS };
}

/**
 * Ventanas de disponibilidad por empleado. Se incluyen las que tocan la
 * semana; el motor restringe cada día ISO a su unión, que es lo que el
 * trigger exige para las vigentes ese día.
 */
async function leerDisponibilidad(ctx: Contexto, empleados: EmpleadoDb[]): Promise<Map<string, Empleado["disponibilidad"]>> {
  const out = new Map<string, Empleado["disponibilidad"]>();
  for (const lote of lotes(empleados.map((e) => e.id), 200)) {
    const filas = await paginar<{ empleado_id: string; dia_semana: number; hora_inicio: string; hora_fin: string; vigente_desde: string | null; vigente_hasta: string | null }>(
      "disponibilidad",
      (a, b) =>
        ctx.sb
          .from("disponibilidad")
          .select("empleado_id, dia_semana, hora_inicio, hora_fin, vigente_desde, vigente_hasta")
          .in("empleado_id", lote)
          .order("id")
          .range(a, b),
    );
    for (const f of filas) {
      if (f.vigente_desde && f.vigente_desde > ctx.domingo) continue;
      if (f.vigente_hasta && f.vigente_hasta < ctx.semana) continue;
      if (!out.has(f.empleado_id)) out.set(f.empleado_id, []);
      out.get(f.empleado_id)!.push({ dia_semana: f.dia_semana, hora_inicio: hhmm(f.hora_inicio), hora_fin: hhmm(f.hora_fin) });
    }
  }
  return out;
}

/** Error lanzado por el motor dentro del worker (no es un fallo de infraestructura). */
class ErrorMotor extends Error {}

type MensajeWorker = { ok: true; resultado: ResultadoOptimizacion } | { ok: false; mensaje: string };

function optimizarEnWorker(entrada: EntradaOptimizacion): Promise<ResultadoOptimizacion> {
  return new Promise((resolver, rechazar) => {
    let worker: Worker;
    try {
      worker = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });
    } catch (e) {
      rechazar(e);
      return;
    }
    const cerrar = () => worker.terminate();
    worker.onmessage = (ev: MessageEvent<MensajeWorker>) => {
      cerrar();
      if (ev.data.ok) resolver(ev.data.resultado);
      else rechazar(new ErrorMotor(ev.data.mensaje));
    };
    worker.onerror = (ev) => {
      cerrar();
      rechazar(new Error(ev.message || "worker"));
    };
    worker.postMessage(entrada);
  });
}

async function ejecutarOptimizacion(entrada: EntradaOptimizacion): Promise<ResultadoOptimizacion> {
  if (typeof Worker !== "undefined") {
    try {
      return await optimizarEnWorker(entrada);
    } catch (e) {
      if (e instanceof ErrorMotor) throw e;
      // El worker no pudo arrancar (bundler, CSP…): se corre en el hilo principal.
    }
  }
  await cederTurno();
  return optimizar(entrada);
}

// ---------------------------------------------------------------------------
// e. Guardar la propuesta
// ---------------------------------------------------------------------------

async function siguienteVersion(ctx: Contexto, tipo: "baseline" | "propuesta"): Promise<number> {
  const { data, error } = await ctx.sb
    .from("escenarios")
    .select("version")
    .eq("sucursal_id", ctx.sucursalId)
    .eq("semana_iso", ctx.semana)
    .eq("tipo", tipo)
    .order("version", { ascending: false })
    .limit(1);
  if (error) throw fallo("leer versión de escenarios", error);
  return (data?.[0]?.version ?? 0) + 1;
}

async function guardarPropuesta(
  ctx: Contexto,
  cat: Catalogo_,
  pronosticoId: string,
  metodo: string,
  opt: ResultadoOptimizacion,
): Promise<string> {
  const version = await siguienteVersion(ctx, "propuesta");
  const parametros: Record<string, Json> = {
    motor: "src/lib/motor/optimizar.ts",
    metodo: "voraz+busqueda_local",
    demanda: metodo,
    ms: opt.ms,
    vacantes_horas: opt.vacantes_horas,
    vacantes_pico_horas: opt.vacantes_pico_horas,
    vacantes_por_habilidad: opt.vacantes_por_habilidad,
    iteraciones_greedy: opt.iteraciones_greedy,
    iteraciones_busqueda_local: opt.iteraciones_busqueda_local,
    asignaciones: opt.asignaciones.length,
  };
  const { data: esc, error: eEsc } = await ctx.sb
    .from("escenarios")
    .insert({
      sucursal_id: ctx.sucursalId,
      semana_iso: ctx.semana,
      tipo: "propuesta",
      version,
      estado: "borrador",
      tope_semanal: ctx.tope,
      reglas_id: cat.reglas.id,
      pronostico_id: pronosticoId,
      parametros,
    })
    .select("id")
    .single();
  if (eEsc || !esc) throw fallo("crear escenario propuesta", eEsc ?? { message: "sin id" });
  const escenarioId = esc.id;

  const plantillaPorClave = new Map(cat.plantillas.map((p) => [p.clave, p.id]));
  let publicado = false;
  try {
    const filas = opt.asignaciones.map((a) => {
      const habilidad_id = cat.habilidades.get(a.habilidad_clave);
      if (!habilidad_id) throw new Error(`Habilidad ${a.habilidad_clave} sin id`);
      return {
        escenario_id: escenarioId,
        semana_iso: ctx.semana,
        empleado_id: a.clave_externa,
        plantilla_id: a.plantilla_clave ? (plantillaPorClave.get(a.plantilla_clave) ?? null) : null,
        habilidad_id,
        inicio: a.inicio,
        fin: a.fin,
        descanso_min: a.descanso_min,
      };
    });
    const partes = lotes(filas);
    for (let i = 0; i < partes.length; i++) {
      ctx.progreso({ paso: "guardando", pct: 70 + Math.round((15 * i) / Math.max(partes.length, 1)), detalle: `Turnos ${i * LOTE + 1}–${Math.min((i + 1) * LOTE, filas.length)} de ${filas.length}` });
      const { error } = await ctx.sb.from("asignaciones").insert(partes[i]);
      if (error) throw fallo(`guardar asignaciones (lote ${i + 1}/${partes.length})`, error);
    }
    const { error: ePub } = await ctx.sb.from("escenarios").update({ estado: "publicado" }).eq("id", escenarioId);
    if (ePub) throw fallo("publicar la propuesta", ePub);
    publicado = true;
    return escenarioId;
  } catch (e) {
    if (!publicado) {
      // Borrador: se puede borrar (las asignaciones caen en cascada; se borran antes por claridad).
      await ctx.sb.from("asignaciones").delete().eq("escenario_id", escenarioId).eq("semana_iso", ctx.semana);
      await ctx.sb.from("escenarios").delete().eq("id", escenarioId);
    }
    throw new Error(`No se pudo guardar la propuesta: ${mensajeDe(e)}`);
  }
}

// ---------------------------------------------------------------------------
// Orquestación
// ---------------------------------------------------------------------------

export async function programarSemana(opts: OpcionesProgramacion): Promise<ResultadoProgramacion> {
  const t0 = Date.now();
  const { supabase: sb, sucursalId, semanaIso: semana } = opts;
  const tope = opts.tope ?? TOPE_DEFAULT;
  if (!esLunes(semana)) throw new Error(`La semana debe ser un lunes (ISO): ${semana}`);
  if (!(tope > 0 && tope <= 48)) throw new Error(`Tope semanal inválido: ${tope}`);
  const progreso = opts.onProgreso ?? (() => {});

  const { data: suc, error: eSuc } = await sb.from("sucursales").select("id, nombre, hubs(empresa_id)").eq("id", sucursalId).maybeSingle();
  if (eSuc) throw fallo("leer sucursal", eSuc);
  const empresaId = suc?.hubs?.empresa_id;
  if (!suc || !empresaId) throw new Error("La sucursal no existe o no pertenece a tu empresa.");

  const ctx: Contexto = {
    sb,
    empresaId,
    sucursalId,
    sucursalNombre: suc.nombre,
    semana,
    domingo: sumarDias(semana, 6),
    tope,
    costoHora: opts.costoHoraDefault ?? COSTO_HORA_DEFAULT,
    progreso,
  };

  // a. Catálogo.
  const cat = await asegurarCatalogo(ctx);
  const turnos = turnosImportados(cat);
  const horario = horarioTienda(turnos);

  // b. Demanda.
  const { pronosticoId, demanda, metodo } = await generarDemanda(ctx, cat, turnos, horario);

  // c. Baseline (usa el pronóstico recién creado al resumir).
  ctx.progreso({ paso: "baseline", pct: 30, detalle: "Materializando el horario actual" });
  const { data: baselineId, error: eBase } = await sb.rpc("materializar_baseline", { p_sucursal: sucursalId, p_semana: semana, p_reglas: cat.reglas.id });
  if (eBase || !baselineId) throw fallo("materializar_baseline", eBase ?? { message: "sin id" });
  const { error: eResBase } = await sb.rpc("resumir_escenario", { p_escenario: baselineId });
  if (eResBase) throw fallo("resumir_escenario (baseline)", eResBase);

  // d. Optimización.
  ctx.progreso({ paso: "optimizando", pct: 40, detalle: `Buscando la mejor programación a ${tope} h (hasta ${PRESUPUESTO_MS / 1000} s)` });
  const disponibilidad = await leerDisponibilidad(ctx, cat.empleados);
  const entrada = construirEntrada(ctx, cat, demanda, horario, disponibilidad);
  await cederTurno();
  let opt: ResultadoOptimizacion;
  try {
    opt = await ejecutarOptimizacion(entrada);
  } catch (e) {
    throw new Error(`El motor no pudo generar la propuesta: ${mensajeDe(e)}`);
  }

  // e. Guardar y resumir.
  ctx.progreso({ paso: "guardando", pct: 70, detalle: `${opt.asignaciones.length} turnos` });
  const propuestaId = await guardarPropuesta(ctx, cat, pronosticoId, metodo, opt);

  ctx.progreso({ paso: "resumiendo", pct: 90, detalle: "Calculando costo y cobertura" });
  const { error: eResProp } = await sb.rpc("resumir_escenario", { p_escenario: propuestaId });
  if (eResProp) throw fallo("resumir_escenario (propuesta)", eResProp);

  const [{ data: ahorro, error: eAh }, { data: resBase, error: eRb }] = await Promise.all([
    sb.from("v_ahorro_escenario").select("*").eq("sucursal_id", sucursalId).eq("semana_iso", semana).maybeSingle(),
    sb.from("resumen_escenario").select("horas_dobles").eq("escenario_id", baselineId).maybeSingle(),
  ]);
  if (eAh) throw fallo("leer v_ahorro_escenario", eAh);
  if (eRb) throw fallo("leer resumen_escenario", eRb);
  if (!ahorro) throw new Error("v_ahorro_escenario no devolvió la comparación baseline vs propuesta.");

  ctx.progreso({ paso: "listo", pct: 100 });
  return {
    escenarioBaselineId: ahorro.escenario_baseline_id ?? baselineId,
    escenarioPropuestaId: ahorro.escenario_propuesta_id ?? propuestaId,
    tope,
    ahorroMxn: Number(ahorro.ahorro_mxn ?? 0),
    ahorroPct: Number(ahorro.ahorro_pct ?? 0),
    costoBaseline: Number(ahorro.costo_total_baseline ?? 0),
    costoPropuesta: Number(ahorro.costo_total_propuesta ?? 0),
    horasDoblesBaseline: Number(resBase?.horas_dobles ?? 0),
    coberturaPicoBaselinePct: ahorro.cobertura_pico_baseline_pct === null ? null : Number(ahorro.cobertura_pico_baseline_pct),
    coberturaPicoPropuestaPct: ahorro.cobertura_pico_propuesta_pct === null ? null : Number(ahorro.cobertura_pico_propuesta_pct),
    deficitPicoHoras: Number(ahorro.deficit_pico_horas_propuesta ?? 0),
    vacantesHoras: opt.vacantes_horas,
    asignaciones: opt.asignaciones.length,
    ms: Date.now() - t0,
  };
}
