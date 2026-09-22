/**
 * CLI del motor Jornada40.
 *
 *   npx tsx scripts/motor/index.ts --entrada scripts/sintetico/salida --salida scripts/motor/salida \
 *     --semanas 2026-07-06,2026-07-13,2026-07-20,2026-07-27 [--tiendas 50] [--presupuesto 3000] \
 *     [--reporte docs/reporte-resultados.md] [--cargar] [--desde-resumen]
 *
 * Por cada tienda-semana: pronóstico → requerimiento → baseline (turnos
 * vigentes) → optimización → evaluación de ambos → <salida>/<sucursal>/<semana>.json.
 * Al final: <salida>/resumen.json y el reporte ejecutivo en Markdown.
 * Con --cargar, además sube todo a Supabase y compara v_ahorro_escenario
 * con la evaluación local (ver cargar.ts).
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { Catalogo, Empleado, TraficoFila, TurnoVigente } from './tipos';
import { procesarTiendaSemana, type ResultadoTiendaSemana } from './pipeline';
import { construirResumen, type Resumen } from './resumen';
import { generarReporte } from './reporte';
import { esLunes } from './tiempo';

interface Args {
  entrada: string;
  salida: string;
  semanas: string[];
  tiendas: number;
  presupuesto: number;
  reporte: string | null;
  cargar: boolean;
  silencioso: boolean;
  /** Sólo regenerar el reporte a partir de <salida>/resumen.json. */
  desdeResumen: boolean;
}

function parseArgs(argv: string[]): Args {
  const a: Args = {
    entrada: 'scripts/sintetico/salida',
    salida: 'scripts/motor/salida',
    semanas: ['2026-07-06', '2026-07-13', '2026-07-20', '2026-07-27'],
    tiendas: Number.MAX_SAFE_INTEGER,
    presupuesto: 3000,
    reporte: 'docs/reporte-resultados.md',
    cargar: false,
    silencioso: false,
    desdeResumen: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    const v = argv[i + 1];
    switch (k) {
      case '--entrada': a.entrada = v; i++; break;
      case '--salida': a.salida = v; i++; break;
      case '--semanas': a.semanas = v.split(',').map((s) => s.trim()).filter(Boolean); i++; break;
      case '--semana': a.semanas = [v]; i++; break;
      case '--tiendas': a.tiendas = Number(v); i++; break;
      case '--presupuesto': a.presupuesto = Number(v); i++; break;
      case '--reporte': a.reporte = v === 'no' ? null : v; i++; break;
      case '--cargar': a.cargar = true; break;
      case '--silencioso': a.silencioso = true; break;
      case '--desde-resumen': a.desdeResumen = true; break;
      case '--help': case '-h':
        console.log(readFileSync(__filename, 'utf8').split('*/')[0]);
        process.exit(0);
        break;
      default:
        throw new Error(`Argumento desconocido: ${k}`);
    }
  }
  for (const s of a.semanas) if (!esLunes(s)) throw new Error(`La semana ${s} no es lunes`);
  return a;
}

function leerJson<T>(ruta: string): T {
  return JSON.parse(readFileSync(ruta, 'utf8')) as T;
}

export async function main(argv = process.argv.slice(2)): Promise<void> {
  const args = parseArgs(argv);
  const entrada = resolve(args.entrada);
  const salida = resolve(args.salida);
  const log = (...m: unknown[]) => { if (!args.silencioso) console.log(...m); };

  if (args.desdeResumen) {
    const resumen = leerJson<Resumen>(join(salida, 'resumen.json'));
    if (!args.reporte) throw new Error('--desde-resumen requiere --reporte');
    writeFileSync(resolve(args.reporte), generarReporte(resumen, { entrada: args.entrada, salida: args.salida }));
    log(`Reporte regenerado desde ${join(salida, 'resumen.json')}: ${resolve(args.reporte)}`);
    return;
  }

  const catalogo = leerJson<Catalogo>(join(entrada, 'catalogo.json'));
  const empleados = leerJson<Empleado[]>(join(entrada, 'empleados.json'));
  const sucursales = [...catalogo.sucursales].sort((a, b) => (a.clave < b.clave ? -1 : 1)).slice(0, args.tiendas);
  log(`Motor Jornada40 · ${sucursales.length} tiendas × ${args.semanas.length} semanas · entrada ${entrada}`);

  const t0 = Date.now();
  const resultados: ResultadoTiendaSemana[] = [];
  for (const sucursal of sucursales) {
    const rutaTrafico = join(entrada, 'trafico', `${sucursal.clave}.json`);
    const rutaTurnos = join(entrada, 'turnos_vigentes', `${sucursal.clave}.json`);
    if (!existsSync(rutaTrafico)) throw new Error(`Falta ${rutaTrafico}`);
    const trafico = leerJson<TraficoFila[]>(rutaTrafico);
    const turnos = existsSync(rutaTurnos) ? leerJson<TurnoVigente[]>(rutaTurnos) : [];
    const emps = empleados.filter((e) => e.sucursal_clave === sucursal.clave);
    mkdirSync(join(salida, sucursal.clave), { recursive: true });
    for (const semana of args.semanas) {
      const r = procesarTiendaSemana({ catalogo, sucursal, semana, empleados: emps, trafico, turnos, presupuesto_ms: args.presupuesto });
      resultados.push(r);
      writeFileSync(join(salida, sucursal.clave, `${semana}.json`), JSON.stringify(r));
      const eb = r.baseline.evaluacion;
      const ep = r.propuesta.evaluacion;
      log(
        `${sucursal.clave} ${semana}: baseline $${eb.costo_total.toFixed(2)} → propuesta $${ep.costo_total.toFixed(2)} ` +
          `(ahorro ${r.ahorro.ahorro_pct.toFixed(2)} %) · pico ${ep.cobertura_pico_pct}% déficit ${ep.deficit_pico_horas} h · ` +
          `vacantes ${r.propuesta.vacantes_horas} h · ${r.ms.total} ms (opt ${r.ms.optimizacion} ms)`,
      );
    }
  }
  const resumen = construirResumen(resultados, args.semanas, Date.now() - t0);
  writeFileSync(join(salida, 'resumen.json'), JSON.stringify(resumen, null, 2));
  log(
    `\nTOTAL: baseline $${resumen.totales.costo_baseline.toFixed(2)} → propuesta $${resumen.totales.costo_propuesta.toFixed(2)} ` +
      `· ahorro $${resumen.totales.ahorro_mxn.toFixed(2)} (${resumen.totales.ahorro_pct.toFixed(2)} %) · ` +
      `déficit pico ${resumen.totales.propuesta.deficit_pico_horas} h en ${resumen.totales.tienda_semanas_con_deficit_pico} tienda-semanas · ` +
      `${resumen.tiempo.ms_total} ms (${resumen.tiempo.ms_promedio_tienda_semana} ms/tienda-semana)`,
  );
  if (args.reporte) {
    const md = generarReporte(resumen, { entrada: args.entrada, salida: args.salida });
    mkdirSync(resolve(args.reporte, '..'), { recursive: true });
    writeFileSync(resolve(args.reporte), md);
    log(`Reporte: ${resolve(args.reporte)}`);
  }
  if (args.cargar) {
    const { cargar } = await import('./cargar');
    await cargar({ catalogo, empleados, resultados, log });
  }
}

if (require.main === module) {
  main().catch((e) => {
    console.error(e instanceof Error ? e.stack ?? e.message : e);
    process.exit(1);
  });
}
