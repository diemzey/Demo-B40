/**
 * Cargador de los datos sintéticos a Supabase a través de PostgREST, con la
 * sesión de un usuario *owner* de la empresa (sin service role: aplican las
 * políticas RLS de `0003_rls.sql`).
 *
 *   SINTETICO_EMAIL=… SINTETICO_PASSWORD=… npx tsx scripts/sintetico/cargar.ts \
 *       [--solo catalogo|empleados|trafico|turnos] [--tiendas N] \
 *       [--dir scripts/sintetico/salida] [--lote 1000]
 *
 * URL y llave pública se leen de `.env.local` (NEXT_PUBLIC_SUPABASE_URL y
 * NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY; nunca se imprimen). La empresa destino
 * es la del perfil del usuario (`perfiles.empresa_id`).
 *
 * Idempotente: upserts por las llaves naturales que define el DDL
 * (docs/arquitectura.md §3.1); volver a correrlo actualiza en vez de duplicar.
 * `empleados` sólo tiene un índice único PARCIAL en (sucursal_id,
 * clave_externa), por lo que ahí se hace select → insert nuevos → update
 * existentes por id (mismo patrón que src/lib/importacion/importar.ts).
 *
 * Tablas destino: hubs, sucursales, habilidades, puestos, tabuladores,
 * plantillas_turno, reglas_laborales, empleados, empleado_habilidades,
 * disponibilidad, trafico_observado y horarios (baseline, origen 'manual').
 */

import fs from "node:fs";
import path from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Catalogo, Empleado, FilaTrafico, Turno } from "./contrato";

// -----------------------------------------------------------------------------
// CLI y entorno
// -----------------------------------------------------------------------------

type Paso = "catalogo" | "empleados" | "trafico" | "turnos";
const PASOS: Paso[] = ["catalogo", "empleados", "trafico", "turnos"];

type Opciones = { solo: Set<Paso>; tiendas: number | null; dir: string; lote: number };

const RAIZ = path.resolve(__dirname, "..", "..");

function leerArgumentos(argv: readonly string[]): Opciones {
  const valores = new Map<string, string>();
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;
    const igual = a.indexOf("=");
    if (igual > 0) valores.set(a.slice(2, igual), a.slice(igual + 1));
    else if (argv[i + 1] !== undefined && !argv[i + 1].startsWith("--")) valores.set(a.slice(2), argv[++i]);
    else valores.set(a.slice(2), "true");
  }
  if (valores.has("ayuda") || valores.has("help")) {
    console.log(
      "Uso: SINTETICO_EMAIL=… SINTETICO_PASSWORD=… npx tsx scripts/sintetico/cargar.ts " +
        "[--solo catalogo|empleados|trafico|turnos] [--tiendas N] [--dir <carpeta>] [--lote 1000]",
    );
    process.exit(0);
  }
  const solo = new Set<Paso>();
  const textoSolo = valores.get("solo");
  if (textoSolo) {
    for (const p of textoSolo.split(",").map((x) => x.trim())) {
      if (!PASOS.includes(p as Paso)) throw new Error(`--solo admite ${PASOS.join("|")} (recibí "${p}")`);
      solo.add(p as Paso);
    }
  }
  const tiendas = valores.has("tiendas") ? Number(valores.get("tiendas")) : null;
  if (tiendas !== null && (!Number.isInteger(tiendas) || tiendas < 1)) throw new Error("--tiendas debe ser un entero ≥ 1");
  const lote = Number(valores.get("lote") ?? 1000);
  if (!Number.isInteger(lote) || lote < 1 || lote > 1000) throw new Error("--lote debe ser un entero entre 1 y 1000");
  return {
    solo,
    tiendas,
    dir: path.resolve(process.cwd(), valores.get("dir") ?? path.join(__dirname, "salida")),
    lote,
  };
}

/** Carga `.env.local` en process.env sin sobrescribir variables ya definidas. */
function cargarEnvLocal() {
  const ruta = path.join(RAIZ, ".env.local");
  if (!fs.existsSync(ruta)) return;
  for (const linea of fs.readFileSync(ruta, "utf8").split(/\r?\n/)) {
    const m = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(linea);
    if (!m) continue;
    let v = m[2];
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (process.env[m[1]] === undefined) process.env[m[1]] = v;
  }
}

// -----------------------------------------------------------------------------
// Utilidades
// -----------------------------------------------------------------------------

type Cliente = SupabaseClient;
type Fila = Record<string, unknown>;
type ErrorPg = { message: string; code?: string; details?: string | null; hint?: string | null } | null;

function fallo(contexto: string, error: ErrorPg): Error {
  const partes = [error?.message, error?.details, error?.hint].filter(Boolean);
  return new Error(`${contexto}${error?.code ? ` [${error.code}]` : ""}${partes.length ? `: ${partes.join(" · ")}` : ""}`);
}

function lotes<T>(items: readonly T[], tamano: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += tamano) out.push(items.slice(i, i + tamano));
  return out;
}

function leerJson<T>(ruta: string): T {
  if (!fs.existsSync(ruta)) throw new Error(`No existe ${ruta}; ejecuta primero \`npm run sintetico:generar\`.`);
  return JSON.parse(fs.readFileSync(ruta, "utf8")) as T;
}

const dos = (n: number) => String(n).padStart(2, "0");

/** Lunes ISO (`YYYY-MM-DD`) de una fecha local `YYYY-MM-DD`. */
function lunesIso(fecha: string): string {
  const [y, m, d] = fecha.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const iso = ((dt.getUTCDay() + 6) % 7) + 1;
  dt.setUTCDate(dt.getUTCDate() - (iso - 1));
  return `${dt.getUTCFullYear()}-${dos(dt.getUTCMonth() + 1)}-${dos(dt.getUTCDate())}`;
}

/** `inicio` + 30 min, conservando el desfase -06:00 del origen. */
function fin30(inicio: string): string {
  const desfase = inicio.slice(19); // "-06:00"
  const horasDesfase = Number(desfase.slice(0, 3));
  const ms = Date.parse(inicio) + 30 * 60_000 + horasDesfase * 3_600_000;
  return `${new Date(ms).toISOString().slice(0, 19)}${desfase}`;
}

/** Ejecuta `fn` por lotes y va imprimiendo el avance. */
async function porLotes<T>(etiqueta: string, filas: readonly T[], tamano: number, fn: (lote: T[]) => Promise<void>) {
  let hechas = 0;
  for (const lote of lotes(filas, tamano)) {
    await fn(lote);
    hechas += lote.length;
    if (filas.length > tamano) process.stdout.write(`\r  ${etiqueta}: ${hechas}/${filas.length}`);
  }
  if (filas.length > tamano) process.stdout.write("\n");
}

async function upsert(sb: Cliente, tabla: string, filas: readonly Fila[], onConflict: string, tamano: number, etiqueta = tabla) {
  await porLotes(etiqueta, filas, tamano, async (lote) => {
    const { error } = await sb.from(tabla).upsert(lote, { onConflict });
    if (error) throw fallo(`upsert en ${tabla}`, error);
  });
}

/** Select paginado (PostgREST limita a 1000 filas por petición). */
async function seleccionar<T extends Fila>(
  sb: Cliente,
  tabla: string,
  columnas: string,
  filtro: (q: ReturnType<ReturnType<Cliente["from"]>["select"]>) => typeof q = (q) => q,
): Promise<T[]> {
  const out: T[] = [];
  for (let desde = 0; ; desde += 1000) {
    const { data, error } = await filtro(sb.from(tabla).select(columnas)).range(desde, desde + 999);
    if (error) throw fallo(`select en ${tabla}`, error);
    const filas = (data ?? []) as unknown as T[];
    out.push(...filas);
    if (filas.length < 1000) break;
  }
  return out;
}

// -----------------------------------------------------------------------------
// Ids resueltos del catálogo (clave → uuid)
// -----------------------------------------------------------------------------

type Ids = {
  hubs: Map<string, string>;
  sucursales: Map<string, string>;
  habilidades: Map<string, string>;
  puestos: Map<string, string>;
};

async function resolverIds(sb: Cliente, empresaId: string, catalogo: Catalogo, sucursalesElegidas: Catalogo["sucursales"]): Promise<Ids> {
  const hubsDb = await seleccionar<{ id: string; nombre: string }>(sb, "hubs", "id, nombre", (q) => q.eq("empresa_id", empresaId));
  const hubPorNombre = new Map(hubsDb.map((h) => [h.nombre, h.id]));
  const hubs = new Map<string, string>();
  for (const h of catalogo.hubs) {
    const id = hubPorNombre.get(h.nombre);
    if (id) hubs.set(h.clave, id);
  }

  const sucursales = new Map<string, string>();
  const hubIds = [...hubs.values()];
  if (hubIds.length > 0) {
    const sucDb = await seleccionar<{ id: string; nombre: string; hub_id: string }>(sb, "sucursales", "id, nombre, hub_id", (q) =>
      q.in("hub_id", hubIds),
    );
    const porLlave = new Map(sucDb.map((s) => [`${s.hub_id}|${s.nombre}`, s.id]));
    for (const s of sucursalesElegidas) {
      const hubId = hubs.get(s.hub_clave);
      const id = hubId ? porLlave.get(`${hubId}|${s.nombre}`) : undefined;
      if (id) sucursales.set(s.clave, id);
    }
  }

  const habDb = await seleccionar<{ id: string; clave: string }>(sb, "habilidades", "id, clave", (q) => q.eq("empresa_id", empresaId));
  const puestosDb = await seleccionar<{ id: string; clave: string }>(sb, "puestos", "id, clave", (q) => q.eq("empresa_id", empresaId));

  return {
    hubs,
    sucursales,
    habilidades: new Map(habDb.map((h) => [h.clave, h.id])),
    puestos: new Map(puestosDb.map((p) => [p.clave, p.id])),
  };
}

function exigir(ids: Ids, catalogo: Catalogo, sucursalesElegidas: Catalogo["sucursales"]) {
  const faltan: string[] = [];
  const hubsNecesarios = new Set(sucursalesElegidas.map((s) => s.hub_clave));
  for (const h of catalogo.hubs) if (hubsNecesarios.has(h.clave) && !ids.hubs.has(h.clave)) faltan.push(`hub ${h.clave}`);
  for (const s of sucursalesElegidas) if (!ids.sucursales.has(s.clave)) faltan.push(`sucursal ${s.clave}`);
  for (const h of catalogo.habilidades) if (!ids.habilidades.has(h.clave)) faltan.push(`habilidad ${h.clave}`);
  for (const p of catalogo.puestos) if (!ids.puestos.has(p.clave)) faltan.push(`puesto ${p.clave}`);
  if (faltan.length > 0) {
    throw new Error(`Faltan en la base: ${faltan.slice(0, 5).join(", ")}${faltan.length > 5 ? "…" : ""}. Ejecuta primero --solo catalogo.`);
  }
}

// -----------------------------------------------------------------------------
// Pasos
// -----------------------------------------------------------------------------

type Conteos = Record<string, number>;

async function cargarCatalogo(sb: Cliente, empresaId: string, catalogo: Catalogo, sucursales: Catalogo["sucursales"], lote: number, conteos: Conteos) {
  console.log("[catalogo]");

  const hubsUsados = new Set(sucursales.map((s) => s.hub_clave));
  const hubs = catalogo.hubs.filter((h) => hubsUsados.has(h.clave));
  await upsert(sb, "hubs", hubs.map((h) => ({ empresa_id: empresaId, nombre: h.nombre, ciudad: h.ciudad, estado: h.estado })), "empresa_id,nombre", lote);
  conteos.hubs = hubs.length;
  console.log(`  hubs: ${hubs.length}`);

  let ids = await resolverIds(sb, empresaId, catalogo, sucursales);
  await upsert(
    sb,
    "sucursales",
    sucursales.map((s) => {
      const hubId = ids.hubs.get(s.hub_clave);
      if (!hubId) throw new Error(`No se resolvió el hub ${s.hub_clave} después del upsert.`);
      return { hub_id: hubId, nombre: s.nombre, ciudad: s.ciudad };
    }),
    "hub_id,nombre",
    lote,
  );
  conteos.sucursales = sucursales.length;
  console.log(`  sucursales: ${sucursales.length}`);

  await upsert(sb, "habilidades", catalogo.habilidades.map((h) => ({ empresa_id: empresaId, clave: h.clave, nombre: h.nombre })), "empresa_id,clave", lote);
  conteos.habilidades = catalogo.habilidades.length;
  console.log(`  habilidades: ${catalogo.habilidades.length}`);

  ids = await resolverIds(sb, empresaId, catalogo, sucursales);
  await upsert(
    sb,
    "puestos",
    catalogo.puestos.map((p) => {
      const habilidadId = ids.habilidades.get(p.habilidad_clave);
      if (!habilidadId) throw new Error(`No se resolvió la habilidad ${p.habilidad_clave} del puesto ${p.clave}.`);
      return { empresa_id: empresaId, clave: p.clave, nombre: p.nombre, habilidad_id: habilidadId };
    }),
    "empresa_id,clave",
    lote,
  );
  conteos.puestos = catalogo.puestos.length;
  console.log(`  puestos: ${catalogo.puestos.length}`);

  ids = await resolverIds(sb, empresaId, catalogo, sucursales);
  exigir(ids, catalogo, sucursales);
  await upsert(
    sb,
    "tabuladores",
    catalogo.tabuladores.map((t) => ({
      puesto_id: ids.puestos.get(t.puesto_clave)!,
      vigente_desde: t.vigente_desde,
      salario_hora: t.salario_hora,
      prima_dominical_pct: t.prima_dominical_pct,
    })),
    "puesto_id,vigente_desde",
    lote,
  );
  conteos.tabuladores = catalogo.tabuladores.length;
  console.log(`  tabuladores: ${catalogo.tabuladores.length}`);

  await upsert(
    sb,
    "plantillas_turno",
    catalogo.plantillas_turno.map((p) => ({
      empresa_id: empresaId,
      clave: p.clave,
      hora_inicio: p.hora_inicio,
      duracion_min: p.duracion_min,
      descanso_min: p.descanso_min,
      activa: true,
    })),
    "empresa_id,clave",
    lote,
  );
  conteos.plantillas_turno = catalogo.plantillas_turno.length;
  console.log(`  plantillas_turno: ${catalogo.plantillas_turno.length}`);

  // reglas_laborales: la unicidad es por índice de expresión
  // (coalesce(empresa_id, …), vigente_desde), que PostgREST no acepta en
  // on_conflict → select + insert/update.
  const reglas = catalogo.reglas_laborales;
  const { data: existente, error: errorReglas } = await sb
    .from("reglas_laborales")
    .select("id")
    .eq("empresa_id", empresaId)
    .eq("vigente_desde", reglas.vigente_desde)
    .maybeSingle();
  if (errorReglas) throw fallo("select en reglas_laborales", errorReglas);
  const filaReglas = { empresa_id: empresaId, ...reglas };
  if (existente?.id) {
    const { error } = await sb.from("reglas_laborales").update(filaReglas).eq("id", existente.id);
    if (error) throw fallo("update en reglas_laborales", error);
  } else {
    const { error } = await sb.from("reglas_laborales").insert(filaReglas);
    if (error) throw fallo("insert en reglas_laborales", error);
  }
  conteos.reglas_laborales = 1;
  console.log(`  reglas_laborales: 1 (${existente?.id ? "actualizada" : "creada"})`);
}

/** Mapa clave_externa → id de los empleados de una sucursal. */
async function empleadosDeSucursal(sb: Cliente, sucursalId: string): Promise<Map<string, string>> {
  const filas = await seleccionar<{ id: string; clave_externa: string | null }>(sb, "empleados", "id, clave_externa", (q) =>
    q.eq("sucursal_id", sucursalId),
  );
  const out = new Map<string, string>();
  for (const f of filas) if (f.clave_externa) out.set(f.clave_externa, f.id);
  return out;
}

async function cargarEmpleados(sb: Cliente, ids: Ids, catalogo: Catalogo, sucursales: Catalogo["sucursales"], empleados: Empleado[], lote: number, conteos: Conteos) {
  console.log("[empleados]");
  const nombrePuesto = new Map(catalogo.puestos.map((p) => [p.clave, p.nombre]));
  const porSucursal = new Map<string, Empleado[]>();
  for (const e of empleados) porSucursal.set(e.sucursal_clave, [...(porSucursal.get(e.sucursal_clave) ?? []), e]);

  let nuevosTotal = 0;
  let actualizadosTotal = 0;
  let habilidadesTotal = 0;
  let disponibilidadTotal = 0;

  for (const [i, s] of sucursales.entries()) {
    const sucursalId = ids.sucursales.get(s.clave)!;
    const lista = porSucursal.get(s.clave) ?? [];
    const existentes = await empleadosDeSucursal(sb, sucursalId);

    const filaDe = (e: Empleado): Fila => ({
      sucursal_id: sucursalId,
      clave_externa: e.clave_externa,
      nombre: e.nombre,
      apellido: e.apellido,
      puesto: nombrePuesto.get(e.puesto_clave) ?? e.puesto_clave,
      puesto_id: ids.puestos.get(e.puesto_clave)!,
      tipo_contrato: e.tipo_contrato,
      max_horas_semana: e.max_horas_semana,
      jornada_contratada_horas: e.jornada_contratada,
      activo: true,
    });

    const nuevos = lista.filter((e) => !existentes.has(e.clave_externa)).map(filaDe);
    const actualizados = lista.filter((e) => existentes.has(e.clave_externa)).map((e) => ({ id: existentes.get(e.clave_externa)!, ...filaDe(e) }));

    await porLotes(`${s.clave} nuevos`, nuevos, lote, async (parte) => {
      const { data, error } = await sb.from("empleados").insert(parte).select("id, clave_externa");
      if (error) throw fallo(`insert en empleados (${s.clave})`, error);
      for (const f of (data ?? []) as { id: string; clave_externa: string | null }[]) {
        if (f.clave_externa) existentes.set(f.clave_externa, f.id);
      }
    });
    await porLotes(`${s.clave} actualizados`, actualizados, lote, async (parte) => {
      const { error } = await sb.from("empleados").upsert(parte, { onConflict: "id" });
      if (error) throw fallo(`update en empleados (${s.clave})`, error);
    });
    nuevosTotal += nuevos.length;
    actualizadosTotal += actualizados.length;

    // Habilidades (pk empleado_id, habilidad_id).
    const filasHab: Fila[] = [];
    const filasDisp: Fila[] = [];
    const idsEmpleados: string[] = [];
    for (const e of lista) {
      const empleadoId = existentes.get(e.clave_externa);
      if (!empleadoId) throw new Error(`No se encontró ${e.clave_externa} después de crearlo.`);
      idsEmpleados.push(empleadoId);
      for (const h of e.habilidades) {
        const habilidadId = ids.habilidades.get(h);
        if (!habilidadId) throw new Error(`Habilidad desconocida ${h} en ${e.clave_externa}.`);
        filasHab.push({ empleado_id: empleadoId, habilidad_id: habilidadId });
      }
      for (const d of e.disponibilidad) {
        filasDisp.push({
          empleado_id: empleadoId,
          dia_semana: d.dia_semana,
          hora_inicio: d.hora_inicio,
          hora_fin: d.hora_fin,
          vigente_desde: catalogo.reglas_laborales.vigente_desde,
        });
      }
    }
    await upsert(sb, "empleado_habilidades", filasHab, "empleado_id,habilidad_id", lote, `${s.clave} habilidades`);
    habilidadesTotal += filasHab.length;

    // Disponibilidad: sin llave natural en el DDL → se reemplaza por empleado.
    await porLotes(`${s.clave} disponibilidad (limpieza)`, idsEmpleados, 200, async (parte) => {
      const { error } = await sb.from("disponibilidad").delete().in("empleado_id", parte);
      if (error) throw fallo(`delete en disponibilidad (${s.clave})`, error);
    });
    await porLotes(`${s.clave} disponibilidad`, filasDisp, lote, async (parte) => {
      const { error } = await sb.from("disponibilidad").insert(parte);
      if (error) throw fallo(`insert en disponibilidad (${s.clave})`, error);
    });
    disponibilidadTotal += filasDisp.length;

    console.log(`  ${s.clave} (${i + 1}/${sucursales.length}): ${nuevos.length} nuevos, ${actualizados.length} actualizados, ${filasHab.length} habilidades, ${filasDisp.length} ventanas`);
  }

  conteos.empleados_nuevos = nuevosTotal;
  conteos.empleados_actualizados = actualizadosTotal;
  conteos.empleado_habilidades = habilidadesTotal;
  conteos.disponibilidad = disponibilidadTotal;
}

async function cargarTrafico(sb: Cliente, ids: Ids, sucursales: Catalogo["sucursales"], dir: string, lote: number, conteos: Conteos) {
  console.log("[trafico]");
  // La tabla está particionada por semana_iso, así que la llave única del DDL
  // (0006) incluye la columna de partición. Si el DDL cambiara a la forma
  // del diccionario (sucursal_id, inicio), se reintenta con ella.
  const LLAVES = ["sucursal_id,semana_iso,inicio", "sucursal_id,inicio"];
  let onConflict = LLAVES[0];
  let total = 0;
  for (const [i, s] of sucursales.entries()) {
    const sucursalId = ids.sucursales.get(s.clave)!;
    const filas = leerJson<FilaTrafico[]>(path.join(dir, "trafico", `${s.clave}.json`)).map((f) => ({
      sucursal_id: sucursalId,
      semana_iso: lunesIso(f.inicio.slice(0, 10)),
      inicio: f.inicio,
      fin: fin30(f.inicio),
      trafico: f.trafico,
      ventas: f.ventas,
    }));
    try {
      await upsert(sb, "trafico_observado", filas, onConflict, lote, s.clave);
    } catch (e) {
      const mensaje = e instanceof Error ? e.message : String(e);
      const alterna = LLAVES.find((k) => k !== onConflict);
      if (alterna && /42P10|no unique or exclusion constraint/i.test(mensaje)) {
        console.log(`  (la llave única no coincide; reintentando con ${alterna})`);
        onConflict = alterna;
        await upsert(sb, "trafico_observado", filas, onConflict, lote, s.clave);
      } else {
        throw e;
      }
    }
    total += filas.length;
    console.log(`  ${s.clave} (${i + 1}/${sucursales.length}): ${filas.length} filas`);
  }
  conteos.trafico_observado = total;
}

async function cargarTurnos(sb: Cliente, ids: Ids, sucursales: Catalogo["sucursales"], dir: string, lote: number, conteos: Conteos) {
  console.log("[turnos] → horarios (origen 'manual')");
  let total = 0;
  for (const [i, s] of sucursales.entries()) {
    const sucursalId = ids.sucursales.get(s.clave)!;
    const empleados = await empleadosDeSucursal(sb, sucursalId);
    const turnos = leerJson<Turno[]>(path.join(dir, "turnos_vigentes", `${s.clave}.json`));
    const filas = turnos.map((t) => {
      const empleadoId = empleados.get(t.clave_externa);
      if (!empleadoId) throw new Error(`El empleado ${t.clave_externa} no existe en la base; carga primero --solo empleados.`);
      return {
        empleado_id: empleadoId,
        fecha: t.fecha,
        hora_inicio: t.hora_inicio,
        hora_fin: t.hora_fin,
        cruza_medianoche: false,
        minutos_descanso: t.descanso_min,
        origen: "manual",
      };
    });
    await upsert(sb, "horarios", filas, "empleado_id,fecha,hora_inicio", lote, s.clave);
    total += filas.length;
    console.log(`  ${s.clave} (${i + 1}/${sucursales.length}): ${filas.length} turnos`);
  }
  conteos.horarios = total;
}

// -----------------------------------------------------------------------------
// Principal
// -----------------------------------------------------------------------------

async function main() {
  const t0 = Date.now();
  const op = leerArgumentos(process.argv.slice(2));
  cargarEnvLocal();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY en .env.local.");
  const email = process.env.SINTETICO_EMAIL;
  const password = process.env.SINTETICO_PASSWORD;
  if (!email || !password) throw new Error("Define SINTETICO_EMAIL y SINTETICO_PASSWORD en el entorno.");

  const catalogo = leerJson<Catalogo>(path.join(op.dir, "catalogo.json"));
  const sucursales = [...catalogo.sucursales].sort((a, b) => a.clave.localeCompare(b.clave)).slice(0, op.tiendas ?? undefined);
  const clavesElegidas = new Set(sucursales.map((s) => s.clave));
  const empleados = leerJson<Empleado[]>(path.join(op.dir, "empleados.json")).filter((e) => clavesElegidas.has(e.sucursal_clave));
  const pasos = op.solo.size > 0 ? PASOS.filter((p) => op.solo.has(p)) : PASOS;
  console.log(`Datos: ${op.dir}\nTiendas: ${sucursales.length} · empleados: ${empleados.length} · pasos: ${pasos.join(", ")} · lote: ${op.lote}`);

  const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: sesion, error: errorSesion } = await sb.auth.signInWithPassword({ email, password });
  if (errorSesion || !sesion.user) throw fallo("No se pudo iniciar sesión", errorSesion);
  const { data: perfil, error: errorPerfil } = await sb.from("perfiles").select("empresa_id, rol").eq("id", sesion.user.id).single();
  if (errorPerfil || !perfil) throw fallo("No se pudo leer el perfil", errorPerfil);
  const empresaId = (perfil as { empresa_id: string | null; rol: string }).empresa_id;
  if (!empresaId) throw new Error("El usuario no tiene empresa asignada (perfiles.empresa_id es null).");
  console.log(`Sesión: ${email} · rol ${(perfil as { rol: string }).rol} · empresa ${empresaId}`);

  const conteos: Conteos = {};
  try {
    if (pasos.includes("catalogo")) await cargarCatalogo(sb, empresaId, catalogo, sucursales, op.lote, conteos);

    if (pasos.some((p) => p !== "catalogo")) {
      const ids = await resolverIds(sb, empresaId, catalogo, sucursales);
      exigir(ids, catalogo, sucursales);
      if (pasos.includes("empleados")) await cargarEmpleados(sb, ids, catalogo, sucursales, empleados, op.lote, conteos);
      if (pasos.includes("trafico")) await cargarTrafico(sb, ids, sucursales, op.dir, op.lote, conteos);
      if (pasos.includes("turnos")) await cargarTurnos(sb, ids, sucursales, op.dir, op.lote, conteos);
    }
  } finally {
    await sb.auth.signOut().catch(() => undefined);
  }

  console.log("\nListo. Conteos:");
  for (const [k, v] of Object.entries(conteos)) console.log(`  ${k}: ${v}`);
  console.log(`Tiempo: ${((Date.now() - t0) / 1000).toFixed(1)} s`);
}

main().catch((e: unknown) => {
  console.error(`Error: ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
});
