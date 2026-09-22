/**
 * Carga a Supabase (modo `--cargar` de index.ts) de los resultados del motor,
 * a través de PostgREST con la sesión de un usuario de la empresa (aplican
 * RLS y los constraint triggers de 0006_programacion.sql).
 *
 * Entorno: SINTETICO_EMAIL / SINTETICO_PASSWORD; URL y llave pública desde
 * `.env.local` (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
 * o NEXT_PUBLIC_SUPABASE_ANON_KEY). Nunca se imprimen.
 *
 * Por tienda-semana:
 *   1. `pronosticos` (metodo, parametros) + 168 filas de `demanda_intervalo`.
 *   2. Baseline: si hay filas en `horarios` para la semana → rpc
 *      `materializar_baseline(p_sucursal, p_semana)`; si no, se inserta el
 *      escenario baseline y sus asignaciones directamente desde turnos_vigentes.
 *   3. Propuesta: `escenarios` (tipo propuesta, estado borrador, tope 40,
 *      reglas_id, pronostico_id, parametros) + `asignaciones` en lotes de 1000
 *      → estado 'publicado'.
 *   4. rpc `resumir_escenario` para ambos escenarios.
 *   5. Lee `v_ahorro_escenario` y `resumen_escenario` y los compara con la
 *      evaluación local: deben coincidir al peso.
 */

import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Asignacion, Catalogo, Empleado, Evaluacion } from './tipos';
import type { ResultadoTiendaSemana } from './pipeline';
import { sumarDias } from './tiempo';

type Fila = Record<string, unknown>;
type ErrorPg = { message: string; code?: string; details?: string | null; hint?: string | null } | null;

const LOTE = 1000;
const TOLERANCIA = 0.005; // medio centavo

function fallo(contexto: string, error: ErrorPg): Error {
  const partes = [error?.message, error?.details, error?.hint].filter(Boolean);
  return new Error(`${contexto}${error?.code ? ` [${error.code}]` : ''}${partes.length ? `: ${partes.join(' · ')}` : ''}`);
}

function cargarEnvLocal(raiz: string): void {
  const ruta = join(raiz, '.env.local');
  if (!existsSync(ruta)) return;
  for (const linea of readFileSync(ruta, 'utf8').split(/\r?\n/)) {
    const m = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(linea);
    if (!m) continue;
    let v = m[2];
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (process.env[m[1]] === undefined) process.env[m[1]] = v;
  }
}

async function seleccionar<T extends Fila>(
  sb: SupabaseClient,
  tabla: string,
  columnas: string,
  filtro: (q: ReturnType<ReturnType<SupabaseClient['from']>['select']>) => typeof q = (q) => q,
): Promise<T[]> {
  const out: T[] = [];
  for (let desde = 0; ; desde += LOTE) {
    const { data, error } = await filtro(sb.from(tabla).select(columnas)).range(desde, desde + LOTE - 1);
    if (error) throw fallo(`select en ${tabla}`, error);
    const filas = (data ?? []) as unknown as T[];
    out.push(...filas);
    if (filas.length < LOTE) break;
  }
  return out;
}

async function insertarLotes(sb: SupabaseClient, tabla: string, filas: Fila[], etiqueta: string): Promise<void> {
  for (let i = 0; i < filas.length; i += LOTE) {
    const { error } = await sb.from(tabla).insert(filas.slice(i, i + LOTE));
    if (error) throw fallo(`insert en ${tabla} (${etiqueta}, filas ${i + 1}–${Math.min(i + LOTE, filas.length)})`, error);
  }
}

interface Contexto {
  sb: SupabaseClient;
  empresaId: string;
  sucursales: Map<string, string>;
  habilidades: Map<string, string>;
  plantillas: Map<string, string>;
  /** clave_externa → id, por sucursal. */
  empleados: Map<string, Map<string, string>>;
}

interface ResumenDb {
  horas_totales: number;
  horas_regulares: number;
  horas_dobles: number;
  horas_triples: number;
  horas_domingo: number;
  costo_regular: number;
  costo_dobles: number;
  costo_triples: number;
  costo_prima_dominical: number;
  horas_sobrestaffing: number;
  costo_sobrestaffing: number;
  costo_total: number;
  intervalos_pico: number;
  intervalos_pico_cubiertos: number;
  deficit_pico_horas: number;
}

const CAMPOS_RESUMEN: (keyof ResumenDb)[] = [
  'horas_totales', 'horas_regulares', 'horas_dobles', 'horas_triples', 'horas_domingo',
  'costo_regular', 'costo_dobles', 'costo_triples', 'costo_prima_dominical',
  'horas_sobrestaffing', 'costo_sobrestaffing', 'costo_total',
  'intervalos_pico', 'intervalos_pico_cubiertos', 'deficit_pico_horas',
];

async function conectar(catalogo: Catalogo, empleados: Empleado[], sucursalesClave: string[]): Promise<Contexto> {
  const raiz = resolve(__dirname, '..', '..');
  cargarEnvLocal(raiz);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const llave = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const email = process.env.SINTETICO_EMAIL;
  const password = process.env.SINTETICO_PASSWORD;
  if (!url || !llave) throw new Error('Faltan NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY en .env.local');
  if (!email || !password) throw new Error('Define SINTETICO_EMAIL y SINTETICO_PASSWORD en el entorno');

  const sb = createClient(url, llave, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: auth, error: eAuth } = await sb.auth.signInWithPassword({ email, password });
  if (eAuth || !auth.user) throw fallo('signInWithPassword', eAuth ?? { message: 'sin usuario' });
  const { data: perfil, error: ePerfil } = await sb.from('perfiles').select('empresa_id').eq('id', auth.user.id).single();
  if (ePerfil || !perfil?.empresa_id) throw fallo('perfiles.empresa_id', ePerfil ?? { message: 'el usuario no tiene empresa' });
  const empresaId = perfil.empresa_id as string;

  const hubsDb = await seleccionar<{ id: string; nombre: string }>(sb, 'hubs', 'id, nombre', (q) => q.eq('empresa_id', empresaId));
  const hubPorNombre = new Map(hubsDb.map((h) => [h.nombre, h.id]));
  const hubClaveId = new Map<string, string>();
  for (const h of catalogo.hubs) {
    const id = hubPorNombre.get(h.nombre);
    if (id) hubClaveId.set(h.clave, id);
  }
  const sucDb = hubClaveId.size
    ? await seleccionar<{ id: string; nombre: string; hub_id: string }>(sb, 'sucursales', 'id, nombre, hub_id', (q) => q.in('hub_id', [...hubClaveId.values()]))
    : [];
  const sucPorLlave = new Map(sucDb.map((s) => [`${s.hub_id}|${s.nombre}`, s.id]));
  const sucursales = new Map<string, string>();
  for (const s of catalogo.sucursales) {
    if (!sucursalesClave.includes(s.clave)) continue;
    const hubId = hubClaveId.get(s.hub_clave);
    const id = hubId ? sucPorLlave.get(`${hubId}|${s.nombre}`) : undefined;
    if (!id) throw new Error(`Sucursal ${s.clave} (${s.nombre}) no existe en la base; corre primero npm run sintetico:cargar`);
    sucursales.set(s.clave, id);
  }
  const habDb = await seleccionar<{ id: string; clave: string }>(sb, 'habilidades', 'id, clave', (q) => q.eq('empresa_id', empresaId));
  const plDb = await seleccionar<{ id: string; clave: string }>(sb, 'plantillas_turno', 'id, clave', (q) => q.eq('empresa_id', empresaId));
  const empleadosMap = new Map<string, Map<string, string>>();
  for (const [clave, id] of sucursales) {
    const filas = await seleccionar<{ id: string; clave_externa: string | null }>(sb, 'empleados', 'id, clave_externa', (q) => q.eq('sucursal_id', id));
    const m = new Map<string, string>();
    for (const f of filas) if (f.clave_externa) m.set(f.clave_externa, f.id);
    for (const e of empleados) {
      if (e.sucursal_clave === clave && !m.has(e.clave_externa)) throw new Error(`Empleado ${e.clave_externa} no existe en la base`);
    }
    empleadosMap.set(clave, m);
  }
  return {
    sb,
    empresaId,
    sucursales,
    habilidades: new Map(habDb.map((h) => [h.clave, h.id])),
    plantillas: new Map(plDb.map((p) => [p.clave, p.id])),
    empleados: empleadosMap,
  };
}

async function reglasVigentes(ctx: Contexto, semana: string): Promise<{ id: string; tope_semanal: number }> {
  const { data, error } = await ctx.sb
    .from('reglas_laborales')
    .select('id, empresa_id, vigente_desde, tope_semanal')
    .or(`empresa_id.eq.${ctx.empresaId},empresa_id.is.null`)
    .lte('vigente_desde', semana)
    .order('vigente_desde', { ascending: false });
  if (error) throw fallo('reglas_laborales', error);
  const filas = (data ?? []) as { id: string; empresa_id: string | null; vigente_desde: string; tope_semanal: number }[];
  const fila = filas.find((r) => r.empresa_id === ctx.empresaId) ?? filas[0];
  if (!fila) throw new Error(`No hay reglas_laborales vigentes al ${semana}`);
  return { id: fila.id, tope_semanal: Number(fila.tope_semanal) };
}

function filasAsignaciones(ctx: Contexto, sucursalClave: string, escenarioId: string, semana: string, asignaciones: Asignacion[]): Fila[] {
  const emps = ctx.empleados.get(sucursalClave)!;
  return asignaciones.map((a) => {
    const empleado_id = emps.get(a.clave_externa);
    const habilidad_id = ctx.habilidades.get(a.habilidad_clave);
    if (!empleado_id) throw new Error(`Empleado ${a.clave_externa} sin id`);
    if (!habilidad_id) throw new Error(`Habilidad ${a.habilidad_clave} sin id`);
    return {
      escenario_id: escenarioId,
      semana_iso: semana,
      empleado_id,
      plantilla_id: a.plantilla_clave ? (ctx.plantillas.get(a.plantilla_clave) ?? null) : null,
      habilidad_id,
      inicio: a.inicio,
      fin: a.fin,
      descanso_min: a.descanso_min,
    };
  });
}

async function siguienteVersion(ctx: Contexto, sucursalId: string, semana: string, tipo: 'baseline' | 'propuesta'): Promise<number> {
  const { data, error } = await ctx.sb
    .from('escenarios')
    .select('version')
    .eq('sucursal_id', sucursalId)
    .eq('semana_iso', semana)
    .eq('tipo', tipo)
    .order('version', { ascending: false })
    .limit(1);
  if (error) throw fallo('escenarios.version', error);
  return ((data?.[0]?.version as number | undefined) ?? 0) + 1;
}

async function crearEscenario(
  ctx: Contexto,
  r: ResultadoTiendaSemana,
  tipo: 'baseline' | 'propuesta',
  reglas: { id: string; tope_semanal: number },
  pronosticoId: string,
  asignaciones: Asignacion[],
  parametros: Fila,
): Promise<string> {
  const sucursalId = ctx.sucursales.get(r.sucursal_clave)!;
  const version = await siguienteVersion(ctx, sucursalId, r.semana_iso, tipo);
  const { data, error } = await ctx.sb
    .from('escenarios')
    .insert({
      sucursal_id: sucursalId,
      semana_iso: r.semana_iso,
      tipo,
      version,
      estado: 'borrador',
      tope_semanal: reglas.tope_semanal,
      reglas_id: reglas.id,
      pronostico_id: pronosticoId,
      parametros,
    })
    .select('id')
    .single();
  if (error || !data) throw fallo(`insert escenario ${tipo}`, error ?? { message: 'sin id' });
  const id = data.id as string;
  await insertarLotes(ctx.sb, 'asignaciones', filasAsignaciones(ctx, r.sucursal_clave, id, r.semana_iso, asignaciones), `${tipo} ${r.sucursal_clave}/${r.semana_iso}`);
  const { error: ePub } = await ctx.sb.from('escenarios').update({ estado: 'publicado' }).eq('id', id);
  if (ePub) throw fallo(`publicar escenario ${tipo}`, ePub);
  return id;
}

async function hayHorarios(ctx: Contexto, sucursalClave: string, semana: string): Promise<boolean> {
  const ids = [...ctx.empleados.get(sucursalClave)!.values()];
  for (let i = 0; i < ids.length; i += 100) {
    const { count, error } = await ctx.sb
      .from('horarios')
      .select('id', { count: 'exact', head: true })
      .in('empleado_id', ids.slice(i, i + 100))
      .gte('fecha', semana)
      .lte('fecha', sumarDias(semana, 6));
    if (error) throw fallo('horarios', error);
    if ((count ?? 0) > 0) return true;
  }
  return false;
}

function comparar(
  etiqueta: string,
  local: Evaluacion,
  db: ResumenDb,
  log: (...m: unknown[]) => void,
): number {
  let diferencias = 0;
  for (const campo of CAMPOS_RESUMEN) {
    const a = Number(local[campo]);
    const b = Number(db[campo]);
    const ok = Math.abs(a - b) <= TOLERANCIA;
    if (!ok) diferencias += 1;
    log(`    ${ok ? 'OK ' : '!! '} ${campo.padEnd(26)} local ${a.toFixed(2).padStart(14)}  db ${b.toFixed(2).padStart(14)}`);
  }
  log(`    ${etiqueta}: ${diferencias === 0 ? 'coincide al peso' : `${diferencias} campos difieren`}`);
  return diferencias;
}

export async function cargar(entrada: {
  catalogo: Catalogo;
  empleados: Empleado[];
  resultados: ResultadoTiendaSemana[];
  log: (...m: unknown[]) => void;
}): Promise<void> {
  const { catalogo, empleados, resultados, log } = entrada;
  const claves = [...new Set(resultados.map((r) => r.sucursal_clave))];
  log(`\n--cargar: conectando a Supabase (${claves.length} tiendas, ${resultados.length} tienda-semanas)`);
  const ctx = await conectar(catalogo, empleados, claves);
  const reglasCache = new Map<string, { id: string; tope_semanal: number }>();
  let diferenciasTotales = 0;

  for (const r of resultados) {
    const sucursalId = ctx.sucursales.get(r.sucursal_clave)!;
    const semana = r.semana_iso;
    let reglas = reglasCache.get(semana);
    if (!reglas) {
      reglas = await reglasVigentes(ctx, semana);
      reglasCache.set(semana, reglas);
    }
    log(`\n${r.sucursal_clave} ${semana}`);

    // 1. Pronóstico + demanda.
    const { data: pr, error: ePr } = await ctx.sb
      .from('pronosticos')
      .insert({ sucursal_id: sucursalId, semana_iso: semana, metodo: r.pronostico.metodo, parametros: r.pronostico.parametros })
      .select('id')
      .single();
    if (ePr || !pr) throw fallo('insert pronosticos', ePr ?? { message: 'sin id' });
    const pronosticoId = pr.id as string;
    await insertarLotes(
      ctx.sb,
      'demanda_intervalo',
      r.demanda.map((d) => ({
        pronostico_id: pronosticoId,
        sucursal_id: sucursalId,
        semana_iso: semana,
        inicio: d.inicio,
        fin: d.fin,
        trafico: d.trafico,
        ventas: d.ventas,
        requerido_total: d.requerido_total,
        requerido_caja: d.requerido_caja,
        es_pico: d.es_pico,
      })),
      `demanda ${r.sucursal_clave}/${semana}`,
    );
    log(`  pronóstico ${pronosticoId} + ${r.demanda.length} intervalos`);

    // 2. Baseline.
    let baselineId: string;
    if (await hayHorarios(ctx, r.sucursal_clave, semana)) {
      const { data, error } = await ctx.sb.rpc('materializar_baseline', { p_sucursal: sucursalId, p_semana: semana });
      if (error) throw fallo('rpc materializar_baseline', error);
      baselineId = data as string;
      log(`  baseline materializado desde horarios: ${baselineId}`);
    } else {
      baselineId = await crearEscenario(ctx, r, 'baseline', reglas, pronosticoId, r.baseline.asignaciones, {
        origen: 'turnos_vigentes',
        asignaciones: r.baseline.asignaciones.length,
      });
      log(`  baseline insertado desde turnos_vigentes: ${baselineId} (${r.baseline.asignaciones.length} asignaciones)`);
    }

    // 3. Propuesta.
    const propuestaId = await crearEscenario(ctx, r, 'propuesta', reglas, pronosticoId, r.propuesta.asignaciones, {
      motor: 'scripts/motor/optimizar.ts',
      metodo: 'voraz+busqueda_local',
      vacantes_horas: r.propuesta.vacantes_horas,
      vacantes_por_habilidad: r.propuesta.vacantes_por_habilidad,
      iteraciones_greedy: r.propuesta.iteraciones_greedy,
      iteraciones_busqueda_local: r.propuesta.iteraciones_busqueda_local,
      ms: r.ms,
    });
    log(`  propuesta publicada: ${propuestaId} (${r.propuesta.asignaciones.length} asignaciones)`);

    // 4. Resúmenes.
    for (const id of [baselineId, propuestaId]) {
      const { error } = await ctx.sb.rpc('resumir_escenario', { p_escenario: id });
      if (error) throw fallo('rpc resumir_escenario', error);
    }

    // 5. Comparación con la evaluación local.
    const { data: res, error: eRes } = await ctx.sb.from('resumen_escenario').select('*').in('escenario_id', [baselineId, propuestaId]);
    if (eRes) throw fallo('resumen_escenario', eRes);
    const porId = new Map((res ?? []).map((f) => [f.escenario_id as string, f as unknown as ResumenDb]));
    const rb = porId.get(baselineId);
    const rp = porId.get(propuestaId);
    if (!rb || !rp) throw new Error('resumen_escenario incompleto');
    log('  baseline (local vs resumen_escenario):');
    diferenciasTotales += comparar('baseline', r.baseline.evaluacion, rb, log);
    log('  propuesta (local vs resumen_escenario):');
    diferenciasTotales += comparar('propuesta', r.propuesta.evaluacion, rp, log);

    const { data: v, error: eV } = await ctx.sb
      .from('v_ahorro_escenario')
      .select('costo_total_baseline, costo_total_propuesta, ahorro_mxn, ahorro_pct, cobertura_pico_baseline_pct, cobertura_pico_propuesta_pct, deficit_pico_horas_propuesta')
      .eq('sucursal_id', sucursalId)
      .eq('semana_iso', semana)
      .maybeSingle();
    if (eV) throw fallo('v_ahorro_escenario', eV);
    if (!v) {
      log('  !! v_ahorro_escenario no devolvió fila');
      diferenciasTotales += 1;
    } else {
      const pares: [string, number, number][] = [
        ['costo_total_baseline', r.baseline.evaluacion.costo_total, Number(v.costo_total_baseline)],
        ['costo_total_propuesta', r.propuesta.evaluacion.costo_total, Number(v.costo_total_propuesta)],
        ['ahorro_mxn', r.ahorro.ahorro_mxn, Number(v.ahorro_mxn)],
        ['ahorro_pct', r.ahorro.ahorro_pct, Number(v.ahorro_pct)],
        ['cobertura_pico_baseline_pct', r.baseline.evaluacion.intervalos_pico_cubiertos_pct, Number(v.cobertura_pico_baseline_pct)],
        ['cobertura_pico_propuesta_pct', r.propuesta.evaluacion.intervalos_pico_cubiertos_pct, Number(v.cobertura_pico_propuesta_pct)],
        ['deficit_pico_horas_propuesta', r.propuesta.evaluacion.deficit_pico_horas, Number(v.deficit_pico_horas_propuesta)],
      ];
      log('  v_ahorro_escenario (local vs db):');
      for (const [campo, a, b] of pares) {
        const ok = Math.abs(a - b) <= (campo.endsWith('pct') ? 0.011 : TOLERANCIA);
        if (!ok) diferenciasTotales += 1;
        log(`    ${ok ? 'OK ' : '!! '} ${campo.padEnd(30)} local ${a.toFixed(2).padStart(14)}  db ${b.toFixed(2).padStart(14)}`);
      }
    }
  }
  log(`\n--cargar terminado: ${resultados.length} tienda-semanas; ${diferenciasTotales === 0 ? 'todas las cifras coinciden al peso con la base' : `${diferenciasTotales} discrepancias (revisar arriba)`}`);
  if (diferenciasTotales > 0) process.exitCode = 2;
}
