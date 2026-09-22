/**
 * Exporta una tienda-semana real de la corrida del motor como ejemplo
 * estático para la portada (src/components/demo/ejemplo-tienda.json).
 *
 *   npx tsx scripts/motor/exportar-ejemplo.ts [--tienda T012] [--semana 2026-07-27]
 *
 * Sin argumentos elige la tienda-semana con déficit pico 0 y sin vacantes
 * cuyo ahorro % esté más cerca de la mediana de las 200.
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const RAIZ = path.resolve(import.meta.dirname, "../..");
const SALIDA = path.join(RAIZ, "scripts/motor/salida");
const SINTETICO = path.join(RAIZ, "scripts/sintetico/salida");

type Fila = {
  sucursal_clave: string;
  sucursal_nombre: string;
  semana_iso: string;
  ahorro_pct: number;
  propuesta: { deficit_pico_horas: number };
  vacantes_horas: number;
};

const args = new Map<string, string>();
for (let i = 2; i < process.argv.length; i += 2) args.set(process.argv[i], process.argv[i + 1] ?? "");

const resumen = JSON.parse(readFileSync(path.join(SALIDA, "resumen.json"), "utf8")) as { filas: Fila[] };
let fila: Fila | undefined;
if (args.has("--tienda")) {
  fila = resumen.filas.find(
    (f) => f.sucursal_clave === args.get("--tienda") && (!args.has("--semana") || f.semana_iso === args.get("--semana")),
  );
} else {
  const pcts = resumen.filas.map((f) => f.ahorro_pct).sort((a, b) => a - b);
  const mediana = pcts[Math.floor(pcts.length / 2)];
  fila = resumen.filas
    .filter((f) => f.propuesta.deficit_pico_horas === 0 && f.vacantes_horas === 0)
    .sort((a, b) => Math.abs(a.ahorro_pct - mediana) - Math.abs(b.ahorro_pct - mediana))[0];
}
if (!fila) throw new Error("No se encontró la tienda-semana pedida");

const detalle = JSON.parse(
  readFileSync(path.join(SALIDA, fila.sucursal_clave, `${fila.semana_iso}.json`), "utf8"),
) as {
  baseline: { asignaciones: { clave_externa: string; inicio: string; fin: string; descanso_min: number }[]; evaluacion: Record<string, number> };
  propuesta: { asignaciones: { clave_externa: string; inicio: string; fin: string; descanso_min: number }[]; evaluacion: Record<string, number>; vacantes_horas: number };
  ahorro: { ahorro_mxn: number; ahorro_pct: number };
};

type Empleado = { clave_externa: string; sucursal_clave: string; nombre: string; apellido: string; puesto_clave: string; tipo_contrato: string; jornada_contratada: number };
const empleados = (JSON.parse(readFileSync(path.join(SINTETICO, "empleados.json"), "utf8")) as Empleado[]).filter(
  (e) => e.sucursal_clave === fila.sucursal_clave,
);
const catalogo = JSON.parse(readFileSync(path.join(SINTETICO, "catalogo.json"), "utf8")) as {
  puestos: { clave: string; nombre: string }[];
  tabuladores: { puesto_clave: string; salario_hora: number }[];
};
const nombrePuesto = new Map(catalogo.puestos.map((p) => [p.clave, p.nombre]));
const tarifa = new Map(catalogo.tabuladores.map((t) => [t.puesto_clave, t.salario_hora]));

const horas = (a: { inicio: string; fin: string; descanso_min: number }) =>
  Math.round(((new Date(a.fin).getTime() - new Date(a.inicio).getTime()) / 3_600_000 - a.descanso_min / 60) * 100) / 100;
const suma = (lista: typeof detalle.baseline.asignaciones) => {
  const m = new Map<string, number>();
  for (const a of lista) m.set(a.clave_externa, Math.round(((m.get(a.clave_externa) ?? 0) + horas(a)) * 10) / 10);
  return m;
};
const hoy = suma(detalle.baseline.asignaciones);
const despues = suma(detalle.propuesta.asignaciones);

// Retratos disponibles en /public/avatars (30); el resto usa iniciales.
const AVATARES = [
  "ortega-bruno", "cardenas-ismael", "quintero-diego", "tellez-rodrigo", "najera-paola", "olvera-hector",
  "escobar-tomas", "molina-rocio", "aguilar-mateo", "beltran-sofia", "castro-julian", "dominguez-valeria",
  "espinoza-andres", "flores-camila", "garcia-emilio", "herrera-daniela", "ibarra-sebastian", "jimenez-fernanda",
  "lara-nicolas", "mendoza-regina", "navarro-santiago", "ochoa-ximena", "pacheco-leonardo", "ramirez-mariana",
  "salinas-gabriel", "torres-renata", "urbina-alejandro", "vargas-lucia", "zamora-diego", "zuniga-abril",
];

const personas = empleados
  .map((e) => ({
    clave: e.clave_externa,
    nombre: `${e.apellido} ${e.nombre}`,
    puesto: nombrePuesto.get(e.puesto_clave) ?? e.puesto_clave,
    contrato: e.jornada_contratada,
    tarifa: tarifa.get(e.puesto_clave) ?? 0,
    hoy: hoy.get(e.clave_externa) ?? 0,
    reacomodada: despues.get(e.clave_externa) ?? 0,
  }))
  .sort((a, b) => b.hoy - a.hoy || b.reacomodada - a.reacomodada || a.nombre.localeCompare(b.nombre))
  .map((p, i) => ({ ...p, foto: i < AVATARES.length ? `/avatars/${AVATARES[i]}.jpg` : "" }));

const ev = (x: Record<string, number>) => ({
  horasTotales: x.horas_totales,
  horasDobles: x.horas_dobles,
  horasDomingo: x.horas_domingo,
  costoRegular: x.costo_regular,
  costoDobles: x.costo_dobles,
  costoPrimaDominical: x.costo_prima_dominical,
  horasSobrestaffing: x.horas_sobrestaffing,
  costoSobrestaffing: x.costo_sobrestaffing,
  costoTotal: x.costo_total,
  intervalosPico: x.intervalos_pico,
  intervalosPicoCubiertos: x.intervalos_pico_cubiertos,
  coberturaPicoPct: x.cobertura_pico_pct,
  deficitPicoHoras: x.deficit_pico_horas,
  empleadosConTurno: x.empleados_con_turno,
});

const salida = {
  origen: "scripts/motor (corrida sobre datos sintéticos calibrados; ver docs/reporte-resultados.md)",
  sucursal: fila.sucursal_nombre,
  clave: fila.sucursal_clave,
  semana: fila.semana_iso,
  tope: 40,
  personas,
  baseline: ev(detalle.baseline.evaluacion),
  propuesta: { ...ev(detalle.propuesta.evaluacion), vacantesHoras: detalle.propuesta.vacantes_horas },
  ahorro: { mxn: detalle.ahorro.ahorro_mxn, pct: detalle.ahorro.ahorro_pct },
};

const destino = path.join(RAIZ, "src/components/demo/ejemplo-tienda.json");
writeFileSync(destino, JSON.stringify(salida, null, 2) + "\n");
console.log(
  `${fila.sucursal_clave} ${fila.sucursal_nombre} · ${fila.semana_iso} · ${personas.length} personas · ahorro ${salida.ahorro.pct} % ($${salida.ahorro.mxn}) · dobles ${salida.baseline.horasDobles} h → ${salida.propuesta.horasDobles} h · pico ${salida.propuesta.coberturaPicoPct} % → ${destino}`,
);
