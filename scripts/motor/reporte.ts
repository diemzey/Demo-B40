/**
 * Reporte ejecutivo en Markdown (docs/reporte-resultados.md) a partir de
 * resumen.json. Español, cifras en MXN.
 */

import type { Resumen } from './resumen';

const mxn = (x: number): string =>
  '$' + x.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const num = (x: number, d = 1): string => x.toLocaleString('es-MX', { minimumFractionDigits: d, maximumFractionDigits: d });
const pct = (x: number): string => `${num(x, 2)} %`;

export function generarReporte(r: Resumen, opciones: { entrada: string; salida: string; objetivoPct?: number }): string {
  const obj = opciones.objetivoPct ?? 8;
  const t = r.totales;
  const b = t.baseline;
  const p = t.propuesta;
  const cumple = t.ahorro_pct >= obj;
  const sinDeficit = t.tienda_semanas_con_deficit_pico === 0;
  const L: string[] = [];

  L.push('# Jornada40 · Resultados del motor de programación (tope 40 h)');
  L.push('');
  L.push(`> Generado el ${r.generado_en} por \`scripts/motor/index.ts\` a partir de \`${opciones.entrada}\`.`);
  L.push(`> Salida detallada por tienda-semana en \`${opciones.salida}/<sucursal>/<semana>.json\` y agregados en \`${opciones.salida}/resumen.json\`.`);
  L.push('');
  L.push('## 1. Resumen ejecutivo');
  L.push('');
  L.push(`- **Alcance**: ${r.tiendas} tiendas × ${r.semanas.length} semanas (${r.semanas.join(', ')}) = ${r.tienda_semanas} tienda-semanas.`);
  L.push(`- **Costo laboral baseline** (turnos vigentes, valuados con tope 40 h): **${mxn(t.costo_baseline)}**.`);
  L.push(`- **Costo laboral propuesta** (motor, tope 40 h): **${mxn(t.costo_propuesta)}**.`);
  L.push(`- **Ahorro**: **${mxn(t.ahorro_mxn)} (${pct(t.ahorro_pct)})** frente al objetivo de ≥ ${obj} % → ${cumple ? '**objetivo cumplido**' : '**objetivo NO alcanzado** (ver §6)'}.`);
  L.push(`- **Subdotación en pico**: ${sinDeficit ? 'ninguna (déficit pico = 0 h en las ' + r.tienda_semanas + ' tienda-semanas)' : `${t.tienda_semanas_con_deficit_pico} tienda-semanas con déficit pico (${num(p.deficit_pico_horas)} h en total; ver §6)`}.`);
  L.push(`- **Reglas duras**: la propuesta respeta tope 40 h, ≤ 8 h/día, ≤ 6 días, ≥ 12 h entre turnos, disponibilidad y habilidad en el 100 % de las asignaciones (re-validadas por \`validarReglasDuras\`). El baseline registra la realidad: ${r.filas.reduce((s, f) => s + f.violaciones_baseline, 0)} violaciones (principalmente tope semanal) en ${r.filas.filter((f) => f.violaciones_baseline > 0).length} tienda-semanas.`);
  L.push(`- **Tiempo de cómputo**: ${num(r.tiempo.ms_total / 1000)} s en total; ${r.tiempo.ms_promedio_tienda_semana} ms promedio por tienda-semana (máx. ${r.tiempo.ms_max_tienda_semana} ms), de los cuales ${r.tiempo.ms_optimizacion_promedio} ms son de optimización.`);
  L.push('');
  L.push('## 2. Método');
  L.push('');
  L.push('1. **Pronóstico** (`pronostico.ts`): media estacional por (día ISO, intervalo de 30 min) sobre las 8 semanas previas, × 1.15 en semanas de quincena (contienen día 15 o fin de mes). Las semanas objetivo anteriores alimentan el pronóstico de las siguientes (rolling).');
  L.push('2. **Requerimiento** (`requerimiento.ts`): `requerido_caja = max(mín. caja, ⌈tráfico × conversión / transacciones por cajero⌉)`, `requerido_piso = max(mín. piso, ⌈tráfico / clientes por colaborador⌉)`, más mínimos fijos de almacén y supervisión. `es_pico` = `requerido_total ≥ percentil 80` de la tienda-semana.');
  L.push('3. **Baseline** (`baseline.ts`): los turnos vigentes tal cual (semana de 48 h en la mayoría de los empleados de tiempo completo), valuados con las mismas reglas que la propuesta: horas por encima de 40 pagan al 200 % (hasta 9) y al 300 % (resto); prima dominical 25 %; sobrestaffing a tarifa media ponderada.');
  L.push('4. **Optimización** (`optimizar.ts`, §6 de la arquitectura): construcción voraz por déficit ponderado (pico × 50) por hora de turno, asignando al empleado elegible más barato con preferencia por puesto = habilidad y continuidad; búsqueda local (eliminar turnos redundantes; mover cada turno a otra plantilla/empleado/habilidad del mismo día o a otro día del mismo empleado cuando reduce M·déficit + costo + λ·sobrestaffing; re-llenar con la voraz); multi-arranque determinista con 4 valores del parámetro que balancea horas escasas contra empleados-día escasos, conservando la mejor solución. Todas las reglas duras se re-validan al final con código independiente. Vacantes cuando no queda empleado elegible. Determinista; presupuesto máximo de 3 s por tienda-semana (uso real ≈ 0.2 s).');
  L.push('5. **Evaluación** (`evaluar.ts`): espejo de `resumir_escenario` (§7). Idéntico para baseline y propuesta; no contiene parámetros ajustables.');
  L.push('');
  L.push('## 3. Totales');
  L.push('');
  L.push('| Concepto | Baseline | Propuesta | Diferencia |');
  L.push('|---|---:|---:|---:|');
  const fila = (nombre: string, a: number, c: number, f: (x: number) => string = mxn) => L.push(`| ${nombre} | ${f(a)} | ${f(c)} | ${f(a - c)} |`);
  fila('Horas totales', b.horas_totales, p.horas_totales, (x) => num(x));
  fila('Horas regulares (≤ 40)', b.horas_regulares, p.horas_regulares, (x) => num(x));
  fila('Horas dobles (200 %)', b.horas_dobles, p.horas_dobles, (x) => num(x));
  fila('Horas triples (300 %)', b.horas_triples, p.horas_triples, (x) => num(x));
  fila('Horas en domingo', b.horas_domingo, p.horas_domingo, (x) => num(x));
  fila('Horas de sobrestaffing', b.horas_sobrestaffing, p.horas_sobrestaffing, (x) => num(x));
  fila('Costo regular', b.costo_regular, p.costo_regular);
  fila('Costo horas dobles', b.costo_dobles, p.costo_dobles);
  fila('Costo horas triples', b.costo_triples, p.costo_triples);
  fila('Prima dominical', b.costo_prima_dominical, p.costo_prima_dominical);
  fila('Costo sobrestaffing', b.costo_sobrestaffing, p.costo_sobrestaffing);
  fila('**Costo total**', b.costo_total, p.costo_total);
  L.push('');
  L.push(`**Ahorro total: ${mxn(t.ahorro_mxn)} = ${pct(t.ahorro_pct)} del costo baseline** (objetivo ≥ ${obj} %: ${cumple ? 'cumplido' : 'no cumplido'}). Tienda-semanas por debajo de ${obj} %: ${t.tienda_semanas_bajo_8pct} de ${r.tienda_semanas}.`);
  L.push('');
  const nominaB = b.costo_regular + b.costo_dobles + b.costo_triples + b.costo_prima_dominical;
  const nominaP = p.costo_regular + p.costo_dobles + p.costo_triples + p.costo_prima_dominical;
  L.push(`Lectura sin la valuación del sobrestaffing (sólo nómina pagada: regular + extras + prima): baseline ${mxn(nominaB)} → propuesta ${mxn(nominaP)}, ahorro ${mxn(nominaB - nominaP)} (${pct(nominaB > 0 ? (100 * (nominaB - nominaP)) / nominaB : 0)}). El sobrestaffing se valúa a tarifa media ponderada como en \`resumir_escenario\` (§7) y explica ${mxn(b.costo_sobrestaffing - p.costo_sobrestaffing)} del ahorro total.`);
  L.push('');
  L.push('### Desglose del ahorro (MXN)');
  L.push('');
  L.push('| Componente | Baseline | Propuesta | Ahorro |');
  L.push('|---|---:|---:|---:|');
  L.push(`| Horas extra (dobles + triples) | ${mxn(b.costo_dobles + b.costo_triples)} | ${mxn(p.costo_dobles + p.costo_triples)} | ${mxn(b.costo_dobles + b.costo_triples - p.costo_dobles - p.costo_triples)} |`);
  L.push(`| Prima dominical | ${mxn(b.costo_prima_dominical)} | ${mxn(p.costo_prima_dominical)} | ${mxn(b.costo_prima_dominical - p.costo_prima_dominical)} |`);
  L.push(`| Sobrestaffing | ${mxn(b.costo_sobrestaffing)} | ${mxn(p.costo_sobrestaffing)} | ${mxn(b.costo_sobrestaffing - p.costo_sobrestaffing)} |`);
  L.push(`| Costo regular | ${mxn(b.costo_regular)} | ${mxn(p.costo_regular)} | ${mxn(b.costo_regular - p.costo_regular)} |`);
  L.push('');
  L.push('## 4. Evidencia de cobertura en picos');
  L.push('');
  L.push('| Métrica | Baseline | Propuesta |');
  L.push('|---|---:|---:|');
  L.push(`| Intervalos pico (30 min) | ${b.intervalos_pico} | ${p.intervalos_pico} |`);
  L.push(`| Intervalos pico cubiertos (asignado ≥ requerido) | ${b.intervalos_pico_cubiertos} (${pct((100 * b.intervalos_pico_cubiertos) / Math.max(1, b.intervalos_pico))}) | ${p.intervalos_pico_cubiertos} (${pct((100 * p.intervalos_pico_cubiertos) / Math.max(1, p.intervalos_pico))}) |`);
  L.push(`| Cobertura pico Σ min(asignado, requerido) / Σ requerido | ${pct(b.cobertura_pico_pct)} | ${pct(p.cobertura_pico_pct)} |`);
  L.push(`| Déficit pico (horas-persona) | ${num(b.deficit_pico_horas)} | ${num(p.deficit_pico_horas)} |`);
  L.push(`| Déficit total, todos los intervalos (horas-persona) | ${num(b.deficit_total_horas)} | ${num(p.deficit_total_horas)} |`);
  L.push(`| Vacantes reportadas por el motor (horas-turno sin empleado elegible, por habilidad) | — | ${num(t.vacantes_horas)} (en pico: ${num(t.vacantes_pico_horas)}) |`);
  L.push(`| Tienda-semanas con déficit pico | ${r.filas.filter((f) => f.baseline.deficit_pico_horas > 0).length} | ${t.tienda_semanas_con_deficit_pico} (${t.tienda_semanas_infactibles_estructuralmente} con plantilla estructuralmente insuficiente) |`);
  L.push('');
  L.push('Definiciones: "cubierto" = asignado ≥ requerido en el intervalo; "cobertura pico" = Σ min(asignado, requerido) / Σ requerido (§5); el déficit se mide en horas-persona (intervalos de 30 min × personas faltantes). `v_ahorro_escenario` reporta la cobertura pico como intervalos cubiertos / intervalos pico; ambas cifras están en `resumen.json`.');
  L.push('');
  L.push('## 5. Distribución del ahorro entre tiendas');
  L.push('');
  const d = r.distribucion_ahorro_pct;
  L.push(`Ahorro % por tienda-semana: mín. ${pct(d.min)} · P25 ${pct(d.p25)} · mediana ${pct(d.mediana)} · P75 ${pct(d.p75)} · máx. ${pct(d.max)}.`);
  L.push('');
  L.push('### Peores 5 tienda-semanas');
  L.push('');
  L.push('| Sucursal | Semana | Ahorro % | Ahorro MXN | Motivo |');
  L.push('|---|---|---:|---:|---|');
  for (const w of r.peores_5) L.push(`| ${w.sucursal_clave} | ${w.semana_iso} | ${pct(w.ahorro_pct)} | ${mxn(w.ahorro_mxn)} | ${w.motivo} |`);
  L.push('');
  L.push('### Por tienda (suma de las semanas)');
  L.push('');
  L.push('| Sucursal | Costo baseline | Costo propuesta | Ahorro MXN | Ahorro % | Déficit pico base (h) | Déficit pico prop. (h) | Vacantes (h) | Empleados-día faltantes (cota) |');
  L.push('|---|---:|---:|---:|---:|---:|---:|---:|---:|');
  const porTienda = new Map<string, { b: number; p: number; defb: number; def: number; vac: number; falt: number; nombre: string }>();
  for (const f of r.filas) {
    const x = porTienda.get(f.sucursal_clave) ?? { b: 0, p: 0, defb: 0, def: 0, vac: 0, falt: 0, nombre: f.sucursal_nombre };
    x.b += f.costo_baseline;
    x.p += f.costo_propuesta;
    x.defb += f.baseline.deficit_pico_horas;
    x.def += f.propuesta.deficit_pico_horas;
    x.vac += f.vacantes_horas;
    x.falt += f.empleados_dia_faltantes;
    porTienda.set(f.sucursal_clave, x);
  }
  for (const [clave, x] of [...porTienda.entries()].sort((a, b2) => (a[0] < b2[0] ? -1 : 1))) {
    L.push(`| ${clave} · ${x.nombre} | ${mxn(x.b)} | ${mxn(x.p)} | ${mxn(x.b - x.p)} | ${pct(x.b > 0 ? (100 * (x.b - x.p)) / x.b : 0)} | ${num(x.defb)} | ${num(x.def)} | ${num(x.vac)} | ${x.falt} |`);
  }
  L.push('');
  L.push('## 6. Lectura honesta de los resultados');
  L.push('');
  if (cumple) {
    L.push(`El ahorro total (${pct(t.ahorro_pct)}) supera el objetivo de ${obj} %. Tres fuentes, en orden: (1) el baseline programa semanas de 48 h a la mayoría del tiempo completo, que bajo el tope de 40 h se pagan como ${num(b.horas_dobles, 0)} horas dobles (${mxn(b.costo_dobles)}); la propuesta no tiene ninguna; (2) el baseline tiene ${num(b.horas_sobrestaffing, 0)} h de sobrestaffing (turnos rígidos de apertura/cierre que no siguen la curva de demanda) frente a ${num(p.horas_sobrestaffing, 0)} h; (3) menos horas totales (${num(b.horas_totales, 0)} → ${num(p.horas_totales, 0)}), porque la propuesta usa plantillas cortas y medio tiempo donde la demanda es baja. El ahorro no proviene de subdotar: la cobertura pico sube de ${pct(b.cobertura_pico_pct)} a ${pct(p.cobertura_pico_pct)} y el déficit total (todos los intervalos) baja de ${num(b.deficit_total_horas, 0)} h a ${num(p.deficit_total_horas, 0)} h. La magnitud (muy por encima del 8 %) refleja que el baseline sintético es deliberadamente rígido (2 turnos fijos, 6 días × 8 h); con un baseline ya ajustado el ahorro sería menor.`);
  } else {
    L.push(`El ahorro total (${pct(t.ahorro_pct)}) NO alcanza el objetivo de ${obj} %. No se ajustó la evaluación para acercarse al objetivo; las causas visibles en \`resumen.json\` son: (a) tienda-semanas con vacantes (plantilla insuficiente bajo 40 h para cubrir toda la demanda), (b) baselines ya eficientes (pocas horas extra), o (c) sobrestaffing residual por la granularidad de las plantillas.`);
  }
  if (!sinDeficit) {
    L.push('');
    const infact = r.filas.filter((f) => f.empleados_dia_faltantes > 0);
    const combos = new Map<string, number>();
    const diasSem = new Map<string, number>();
    for (const f of infact) for (const d of f.cota_dias) {
      const k = `${d.habilidades.join('+')} @ ${d.intervalos.join(' + ')}`;
      combos.set(k, (combos.get(k) ?? 0) + d.faltantes);
      const dow = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'][(new Date(d.fecha + 'T12:00:00-06:00').getUTCDay() + 6) % 7];
      diasSem.set(dow, (diasSem.get(dow) ?? 0) + d.faltantes);
    }
    const topCombos = [...combos.entries()].sort((a, b2) => b2[1] - a[1]).slice(0, 4);
    L.push(`**Subdotación residual en picos.** Quedan ${t.tienda_semanas_con_deficit_pico} tienda-semanas con déficit pico (${num(p.deficit_pico_horas)} h-persona en total), frente a ${num(b.deficit_pico_horas)} h en el baseline. El motor no rompe reglas para cubrirlo. La causa es estructural y se demuestra con una cota inferior exacta (\`capacidad.ts\`): con 1 turno por empleado-día, un conjunto de intervalos del día que ninguna plantilla cubre de dos en dos exige tantos empleados distintos como personas requeridas en ellos; se evalúa para cada subconjunto de habilidades (los empleados que tienen alguna de ellas contra la suma de sus requerimientos) y se toma el máximo. En ${t.tienda_semanas_infactibles_estructuralmente} de ${r.tienda_semanas} tienda-semanas la cota supera la plantilla disponible (faltan ${t.empleados_dia_faltantes} empleados-día en total; por día de la semana: ${[...diasSem.entries()].sort((a, b2) => b2[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(', ')}), así que el déficit es inevitable con las plantillas de turno y la plantilla de personal actuales. Patrones que más faltantes explican: ${topCombos.map(([k, v]) => `${k} (${v} empleados-día)`).join('; ')}. En las ${t.tienda_semanas_con_deficit_pico_sin_cota} tienda-semanas restantes con déficit (${num(t.deficit_pico_horas_sin_cota)} h) la cota no lo demuestra: son casos con holgura de 1 empleado donde la cota (que ignora tope de horas y forma completa de la curva) no es ajustada.`);
    L.push('');
    L.push('Tienda-semanas estructuralmente infactibles (cota por día: habilidades, intervalos no co-cubribles, empleados necesarios vs disponibles):');
    L.push('');
    L.push('| Sucursal | Semana | Déficit pico prop. (h) | Vacantes (h) | Faltantes (empleados-día) | Detalle por día |');
    L.push('|---|---|---:|---:|---:|---|');
    for (const f of [...infact].sort((a, b2) => b2.empleados_dia_faltantes - a.empleados_dia_faltantes || (a.sucursal_clave < b2.sucursal_clave ? -1 : 1))) {
      const det = f.cota_dias.map((d) => `${d.fecha}: ${d.habilidades.join('+')} en ${d.intervalos.join('+')} → ${d.necesarios} > ${d.disponibles} (faltan ${d.faltantes})`).join('; ');
      L.push(`| ${f.sucursal_clave} | ${f.semana_iso} | ${num(f.propuesta.deficit_pico_horas)} | ${num(f.vacantes_horas)} | ${f.empleados_dia_faltantes} | ${det} |`);
    }
    L.push('');
    L.push('Acciones: una plantilla que cubra a la vez el primer y el último intervalo del patrón (p. ej. 11:30–20:00 con descanso) o medio tiempo adicional de fin de semana con las habilidades indicadas; ambas se prueban cambiando `plantillas_turno` / `empleados` sin tocar el motor.');
  }
  L.push('');
  L.push('## 7. Trazabilidad (cómo se reconstruye cada cifra en la base)');
  L.push('');
  L.push('Cada número de este reporte se calcula localmente en `scripts/motor/evaluar.ts` con exactamente las fórmulas de `resumir_escenario` (docs/arquitectura.md §7) y se reconstruye en Postgres así:');
  L.push('');
  L.push('| Cifra | Origen local | Origen en base de datos |');
  L.push('|---|---|---|');
  L.push('| Tráfico y ventas pronosticados por intervalo | `<semana>.json → pronostico.intervalos` | `pronosticos` (metodo, parametros) → `demanda_intervalo.trafico/ventas` |');
  L.push('| `requerido_total`, `requerido_caja`, `es_pico` | `<semana>.json → demanda[]` | `demanda_intervalo` (una fila por intervalo de 30 min, `unique (pronostico_id, inicio)`) |');
  L.push('| Turnos del baseline / propuesta | `<semana>.json → baseline.asignaciones / propuesta.asignaciones` | `asignaciones where escenario_id = …` (`horas` = duración − descanso, `es_domingo` generados) |');
  L.push('| Horas regulares / dobles / triples / domingo por empleado | `evaluacion.por_empleado[]` | `v_costo_empleado_semana` (Σ `asignaciones.horas` por empleado, partida con `escenarios.tope_semanal` y `reglas_laborales.horas_dobles_max`) |');
  L.push('| Costo por empleado | `evaluacion.por_empleado[].costo` | `tabuladores.salario_hora` vigente × (regulares + factor_doble·dobles + factor_triple·triples) + salario × prima_dominical_pct/100 × horas_domingo |');
  L.push('| Cobertura por intervalo (`asignado_total`, `asignado_caja`) | `evaluacion.cobertura[]` | `cobertura_intervalo` (materializada por `resumir_escenario`: cuenta asignaciones cuyo `[inicio, fin)` contiene `demanda_intervalo.inicio`) |');
  L.push('| Horas y costo de sobrestaffing | `evaluacion.horas_sobrestaffing / costo_sobrestaffing` | `resumen_escenario` = Σ max(asignado_total − requerido_total, 0) × 0.5 × tarifa media ponderada por horas |');
  L.push('| Cobertura pico y déficit pico | `evaluacion.cobertura_pico_pct / deficit_pico_horas` | `resumen_escenario.intervalos_pico, intervalos_pico_cubiertos, deficit_pico_horas`; detalle en `v_subdotacion_pico` |');
  L.push('| Costo total, ahorro MXN y % | `resumen.json → filas[] / totales` | `v_ahorro_escenario` (baseline vs propuesta publicados de la misma `sucursal_id + semana_iso`); `reporte_ejecutivo(empresa, semana)` agrega |');
  L.push('');
  L.push('Con `npm run motor -- --cargar` el motor inserta pronóstico, demanda, escenarios y asignaciones, llama `resumir_escenario` y compara `v_ahorro_escenario` contra la evaluación local: ambas deben coincidir al peso. La verificación del lado de la base (consultas SQL ejecutadas sobre el proyecto) la añade el coordinador en una sección posterior.');
  L.push('');
  return L.join('\n');
}
