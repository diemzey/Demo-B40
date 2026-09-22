/**
 * Generador determinista de datos sintéticos · "Almacenes del Valle"
 * (tienda departamental mexicana tipo Coppel / Liverpool).
 *
 *   npx tsx scripts/sintetico/generar.ts --tiendas 50 --semanas-historia 8 --semanas-objetivo 4
 *
 * Escribe en `scripts/sintetico/salida/` (o `--salida <dir>`):
 *   catalogo.json                  empresa, hubs, sucursales, puestos, habilidades,
 *                                  tabuladores, plantillas_turno, reglas_laborales,
 *                                  parametros_demanda
 *   empleados.json                 plantilla de todas las tiendas
 *   trafico/<sucursal>.json        tráfico y ventas por intervalo de 30 min
 *                                  (historia + semanas objetivo)
 *   turnos_vigentes/<sucursal>.json horario rígido vigente (baseline) de las
 *                                  semanas objetivo
 *   resumen.json                   conteos y cifras de calibración
 *
 * Todo es reproducible: PRNG mulberry32 con semilla 40 (`--semilla`), y cada
 * tienda deriva sus propios flujos aleatorios de su índice, de modo que la
 * tienda T001 es idéntica con `--tiendas 1` y con `--tiendas 50`.
 *
 * Horas en America/Mexico_City (UTC-06:00, sin horario de verano); los
 * timestamps se serializan como ISO con desfase: `2026-07-06T09:00:00-06:00`.
 * Los supuestos están documentados en `docs/calibracion-datos.md`.
 */

import fs from "node:fs";
import path from "node:path";
import type { Catalogo, Disponibilidad, Empleado, FilaTrafico, PlantillaTurno, Sucursal, Turno } from "./contrato";

// -----------------------------------------------------------------------------
// CLI
// -----------------------------------------------------------------------------

type Opciones = {
  tiendas: number;
  semanasHistoria: number;
  semanasObjetivo: number;
  /** Lunes ISO de la última semana objetivo (coincide con el seed demo). */
  semanaFinal: string;
  semilla: number;
  salida: string;
  clientesPorColaborador: number;
  transaccionesPorCajero: number;
};

function leerArgumentos(argv: readonly string[]): Opciones {
  const valores = new Map<string, string>();
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;
    const igual = a.indexOf("=");
    if (igual > 0) {
      valores.set(a.slice(2, igual), a.slice(igual + 1));
    } else {
      const siguiente = argv[i + 1];
      if (siguiente !== undefined && !siguiente.startsWith("--")) {
        valores.set(a.slice(2), siguiente);
        i++;
      } else {
        valores.set(a.slice(2), "true");
      }
    }
  }
  const num = (clave: string, def: number) => {
    const v = valores.get(clave);
    if (v === undefined) return def;
    const n = Number(v);
    if (!Number.isFinite(n)) throw new Error(`--${clave} debe ser numérico (recibí "${v}")`);
    return n;
  };
  return {
    tiendas: Math.max(1, Math.floor(num("tiendas", 50))),
    semanasHistoria: Math.max(0, Math.floor(num("semanas-historia", 8))),
    semanasObjetivo: Math.max(1, Math.floor(num("semanas-objetivo", 4))),
    semanaFinal: valores.get("semana-final") ?? "2026-07-27",
    semilla: Math.floor(num("semilla", 40)),
    salida: path.resolve(process.cwd(), valores.get("salida") ?? path.join(__dirname, "salida")),
    clientesPorColaborador: num("clientes-por-colaborador", 10),
    transaccionesPorCajero: num("transacciones-por-cajero", 16),
  };
}

// -----------------------------------------------------------------------------
// PRNG determinista (mulberry32)
// -----------------------------------------------------------------------------

type Rng = () => number;

function mulberry32(semilla: number): Rng {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const entre = (r: Rng, a: number, b: number) => a + r() * (b - a);
/** Entero uniforme en [a, b] (inclusive). */
const entero = (r: Rng, a: number, b: number) => a + Math.floor(r() * (b - a + 1));
const elegir = <T>(r: Rng, xs: readonly T[]): T => xs[Math.floor(r() * xs.length)];
function barajar<T>(r: Rng, xs: readonly T[]): T[] {
  const out = [...xs];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// -----------------------------------------------------------------------------
// Fechas (todo en fecha local de México; aritmética sobre Date.UTC para no
// depender de la zona horaria del proceso)
// -----------------------------------------------------------------------------

const DESFASE = "-06:00";

function aFecha(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) throw new Error(`Fecha inválida: ${iso}`);
  return new Date(Date.UTC(y, m - 1, d));
}
const sumarDias = (d: Date, n: number) => new Date(d.getTime() + n * 86_400_000);
const dos = (n: number) => String(n).padStart(2, "0");
function fechaIso(d: Date): string {
  return `${d.getUTCFullYear()}-${dos(d.getUTCMonth() + 1)}-${dos(d.getUTCDate())}`;
}
/** 1 = lunes … 7 = domingo. */
const diaSemanaIso = (d: Date) => ((d.getUTCDay() + 6) % 7) + 1;
function ultimoDiaDelMes(d: Date): number {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
}
/** Semana (lunes a domingo) que contiene el día 15 o el último día del mes. */
function esSemanaDeQuincena(lunes: Date): boolean {
  for (let i = 0; i < 7; i++) {
    const d = sumarDias(lunes, i);
    const dia = d.getUTCDate();
    if (dia === 15 || dia === ultimoDiaDelMes(d)) return true;
  }
  return false;
}
const horaTexto = (min: number) => `${dos(Math.floor(min / 60))}:${dos(min % 60)}`;
const minutosDe = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};
const marcaTiempo = (fecha: string, minutos: number) => `${fecha}T${horaTexto(minutos)}:00${DESFASE}`;

// -----------------------------------------------------------------------------
// Catálogos fijos
// -----------------------------------------------------------------------------

const EMPRESA = { nombre: "Almacenes del Valle" };

const HUBS = [
  { clave: "H-VAL", nombre: "Valle de México", ciudad: "Ciudad de México", estado: "Ciudad de México" },
  { clave: "H-NTE", nombre: "Noreste", ciudad: "Monterrey", estado: "Nuevo León" },
  { clave: "H-OCC", nombre: "Occidente", ciudad: "Guadalajara", estado: "Jalisco" },
  { clave: "H-BAJ", nombre: "Bajío", ciudad: "León", estado: "Guanajuato" },
  { clave: "H-CEN", nombre: "Centro-Sur", ciudad: "Puebla", estado: "Puebla" },
  { clave: "H-GOL", nombre: "Golfo", ciudad: "Veracruz", estado: "Veracruz" },
  { clave: "H-SUR", nombre: "Sureste", ciudad: "Mérida", estado: "Yucatán" },
  { clave: "H-NOR", nombre: "Noroeste", ciudad: "Culiacán", estado: "Sinaloa" },
] as const;

type Localidad = { hub: string; nombre: string; ciudad: string; estado: string };

const LOCALIDADES: Localidad[] = [
  // Valle de México
  { hub: "H-VAL", nombre: "Coapa", ciudad: "Ciudad de México", estado: "Ciudad de México" },
  { hub: "H-VAL", nombre: "Iztapalapa", ciudad: "Ciudad de México", estado: "Ciudad de México" },
  { hub: "H-VAL", nombre: "Ecatepec", ciudad: "Ecatepec de Morelos", estado: "Estado de México" },
  { hub: "H-VAL", nombre: "Nezahualcóyotl", ciudad: "Nezahualcóyotl", estado: "Estado de México" },
  { hub: "H-VAL", nombre: "Tlalpan", ciudad: "Ciudad de México", estado: "Ciudad de México" },
  { hub: "H-VAL", nombre: "Naucalpan", ciudad: "Naucalpan de Juárez", estado: "Estado de México" },
  { hub: "H-VAL", nombre: "Toluca", ciudad: "Toluca", estado: "Estado de México" },
  { hub: "H-VAL", nombre: "Tlalnepantla", ciudad: "Tlalnepantla de Baz", estado: "Estado de México" },
  { hub: "H-VAL", nombre: "Azcapotzalco", ciudad: "Ciudad de México", estado: "Ciudad de México" },
  { hub: "H-VAL", nombre: "Cuautitlán", ciudad: "Cuautitlán Izcalli", estado: "Estado de México" },
  { hub: "H-VAL", nombre: "Chalco", ciudad: "Chalco", estado: "Estado de México" },
  { hub: "H-VAL", nombre: "Texcoco", ciudad: "Texcoco", estado: "Estado de México" },
  { hub: "H-VAL", nombre: "Tacubaya", ciudad: "Ciudad de México", estado: "Ciudad de México" },
  { hub: "H-VAL", nombre: "Xochimilco", ciudad: "Ciudad de México", estado: "Ciudad de México" },
  // Noreste
  { hub: "H-NTE", nombre: "Monterrey Centro", ciudad: "Monterrey", estado: "Nuevo León" },
  { hub: "H-NTE", nombre: "Guadalupe", ciudad: "Guadalupe", estado: "Nuevo León" },
  { hub: "H-NTE", nombre: "San Nicolás", ciudad: "San Nicolás de los Garza", estado: "Nuevo León" },
  { hub: "H-NTE", nombre: "Apodaca", ciudad: "Apodaca", estado: "Nuevo León" },
  { hub: "H-NTE", nombre: "Saltillo", ciudad: "Saltillo", estado: "Coahuila" },
  { hub: "H-NTE", nombre: "Torreón", ciudad: "Torreón", estado: "Coahuila" },
  { hub: "H-NTE", nombre: "Reynosa", ciudad: "Reynosa", estado: "Tamaulipas" },
  { hub: "H-NTE", nombre: "Tampico", ciudad: "Tampico", estado: "Tamaulipas" },
  { hub: "H-NTE", nombre: "Santa Catarina", ciudad: "Santa Catarina", estado: "Nuevo León" },
  // Occidente
  { hub: "H-OCC", nombre: "Guadalajara Centro", ciudad: "Guadalajara", estado: "Jalisco" },
  { hub: "H-OCC", nombre: "Zapopan", ciudad: "Zapopan", estado: "Jalisco" },
  { hub: "H-OCC", nombre: "Tlaquepaque", ciudad: "San Pedro Tlaquepaque", estado: "Jalisco" },
  { hub: "H-OCC", nombre: "Tonalá", ciudad: "Tonalá", estado: "Jalisco" },
  { hub: "H-OCC", nombre: "Morelia", ciudad: "Morelia", estado: "Michoacán" },
  { hub: "H-OCC", nombre: "Puerto Vallarta", ciudad: "Puerto Vallarta", estado: "Jalisco" },
  { hub: "H-OCC", nombre: "Colima", ciudad: "Colima", estado: "Colima" },
  // Bajío
  { hub: "H-BAJ", nombre: "León Centro", ciudad: "León", estado: "Guanajuato" },
  { hub: "H-BAJ", nombre: "Querétaro", ciudad: "Santiago de Querétaro", estado: "Querétaro" },
  { hub: "H-BAJ", nombre: "Celaya", ciudad: "Celaya", estado: "Guanajuato" },
  { hub: "H-BAJ", nombre: "Irapuato", ciudad: "Irapuato", estado: "Guanajuato" },
  { hub: "H-BAJ", nombre: "Aguascalientes", ciudad: "Aguascalientes", estado: "Aguascalientes" },
  { hub: "H-BAJ", nombre: "San Luis Potosí", ciudad: "San Luis Potosí", estado: "San Luis Potosí" },
  { hub: "H-BAJ", nombre: "Salamanca", ciudad: "Salamanca", estado: "Guanajuato" },
  // Centro-Sur
  { hub: "H-CEN", nombre: "Puebla Centro", ciudad: "Puebla", estado: "Puebla" },
  { hub: "H-CEN", nombre: "Angelópolis", ciudad: "Puebla", estado: "Puebla" },
  { hub: "H-CEN", nombre: "Cuernavaca", ciudad: "Cuernavaca", estado: "Morelos" },
  { hub: "H-CEN", nombre: "Pachuca", ciudad: "Pachuca de Soto", estado: "Hidalgo" },
  { hub: "H-CEN", nombre: "Tlaxcala", ciudad: "Tlaxcala", estado: "Tlaxcala" },
  // Golfo
  { hub: "H-GOL", nombre: "Veracruz Puerto", ciudad: "Veracruz", estado: "Veracruz" },
  { hub: "H-GOL", nombre: "Xalapa", ciudad: "Xalapa", estado: "Veracruz" },
  { hub: "H-GOL", nombre: "Coatzacoalcos", ciudad: "Coatzacoalcos", estado: "Veracruz" },
  { hub: "H-GOL", nombre: "Villahermosa", ciudad: "Villahermosa", estado: "Tabasco" },
  // Sureste
  { hub: "H-SUR", nombre: "Mérida Norte", ciudad: "Mérida", estado: "Yucatán" },
  { hub: "H-SUR", nombre: "Mérida Centro", ciudad: "Mérida", estado: "Yucatán" },
  { hub: "H-SUR", nombre: "Cancún", ciudad: "Cancún", estado: "Quintana Roo" },
  { hub: "H-SUR", nombre: "Tuxtla Gutiérrez", ciudad: "Tuxtla Gutiérrez", estado: "Chiapas" },
  // Noroeste
  { hub: "H-NOR", nombre: "Culiacán", ciudad: "Culiacán", estado: "Sinaloa" },
  { hub: "H-NOR", nombre: "Hermosillo", ciudad: "Hermosillo", estado: "Sonora" },
  { hub: "H-NOR", nombre: "Tijuana", ciudad: "Tijuana", estado: "Baja California" },
  { hub: "H-NOR", nombre: "Mexicali", ciudad: "Mexicali", estado: "Baja California" },
  { hub: "H-NOR", nombre: "Chihuahua", ciudad: "Chihuahua", estado: "Chihuahua" },
  { hub: "H-NOR", nombre: "Ciudad Juárez", ciudad: "Ciudad Juárez", estado: "Chihuahua" },
  { hub: "H-NOR", nombre: "Mazatlán", ciudad: "Mazatlán", estado: "Sinaloa" },
];

const HABILIDADES = [
  { clave: "caja", nombre: "Caja" },
  { clave: "piso", nombre: "Piso de venta" },
  { clave: "almacen", nombre: "Almacén" },
  { clave: "supervision", nombre: "Supervisión" },
] as const;

type ClaveHabilidad = (typeof HABILIDADES)[number]["clave"];

type Puesto = {
  clave: string;
  nombre: string;
  habilidad_clave: ClaveHabilidad;
  /** Proporción de la plantilla de la tienda. */
  proporcion: number;
  salario_hora: number;
  /** Habilidades siempre presentes además de la principal. */
  extras: ClaveHabilidad[];
  /** Habilidad opcional (probabilidad). */
  opcional?: { habilidad: ClaveHabilidad; probabilidad: number };
  /** Puede tener contrato de medio tiempo. */
  medioTiempo: boolean;
};

const PUESTOS: Puesto[] = [
  { clave: "cajero", nombre: "Cajero(a)", habilidad_clave: "caja", proporcion: 0.22, salario_hora: 58, extras: ["piso"], medioTiempo: true },
  { clave: "vendedor", nombre: "Vendedor(a) de piso", habilidad_clave: "piso", proporcion: 0.48, salario_hora: 60, extras: [], medioTiempo: true },
  { clave: "almacenista", nombre: "Almacenista", habilidad_clave: "almacen", proporcion: 0.15, salario_hora: 55, extras: [], opcional: { habilidad: "piso", probabilidad: 0.5 }, medioTiempo: true },
  { clave: "supervisor", nombre: "Supervisor(a) de piso", habilidad_clave: "supervision", proporcion: 0.08, salario_hora: 95, extras: ["piso", "caja"], medioTiempo: false },
  { clave: "gerente", nombre: "Gerente de tienda", habilidad_clave: "supervision", proporcion: 0.02, salario_hora: 160, extras: ["piso", "caja"], medioTiempo: false },
  { clave: "asesor_credito", nombre: "Asesor(a) de crédito", habilidad_clave: "piso", proporcion: 0.05, salario_hora: 62, extras: [], medioTiempo: true },
];

/**
 * Plantillas de turno de la empresa. Las cuatro primeras son las que usa el
 * horario rígido vigente; el resto están disponibles para el optimizador
 * (duración 180–600 min, como exige el DDL). `duracion_min` es tiempo de
 * presencia; las horas efectivas son `duracion_min - descanso_min`.
 */
const PLANTILLAS: PlantillaTurno[] = [
  { clave: "apertura", hora_inicio: "09:00", duracion_min: 510, descanso_min: 30 }, // 09:00–17:30 · 8 h
  { clave: "cierre", hora_inicio: "12:30", duracion_min: 510, descanso_min: 30 }, // 12:30–21:00 · 8 h
  { clave: "medio_manana", hora_inicio: "09:00", duracion_min: 360, descanso_min: 0 }, // 09:00–15:00 · 6 h
  { clave: "medio_tarde", hora_inicio: "15:00", duracion_min: 360, descanso_min: 0 }, // 15:00–21:00 · 6 h
  { clave: "intermedio", hora_inicio: "11:00", duracion_min: 510, descanso_min: 30 }, // 11:00–19:30 · 8 h
  { clave: "medio_intermedio", hora_inicio: "12:00", duracion_min: 360, descanso_min: 0 }, // 12:00–18:00 · 6 h
  { clave: "corto_manana", hora_inicio: "09:00", duracion_min: 240, descanso_min: 0 }, // 09:00–13:00 · 4 h
  { clave: "corto_comida", hora_inicio: "11:30", duracion_min: 240, descanso_min: 0 }, // 11:30–15:30 · 4 h
  { clave: "corto_cierre", hora_inicio: "17:00", duracion_min: 240, descanso_min: 0 }, // 17:00–21:00 · 4 h
  { clave: "cinco_manana", hora_inicio: "09:00", duracion_min: 300, descanso_min: 0 }, // 09:00–14:00 · 5 h
  { clave: "cinco_cierre", hora_inicio: "16:00", duracion_min: 300, descanso_min: 0 }, // 16:00–21:00 · 5 h
  { clave: "siete_cierre", hora_inicio: "13:30", duracion_min: 450, descanso_min: 30 }, // 13:30–21:00 · 7 h
  // Cubren a la vez el pico de comida (12:00) y el de cierre (20:00) con una
  // sola persona-día; sin ellas los fines de semana exigen dos empleados
  // distintos por cada posición de pico.
  { clave: "cierre_temprano", hora_inicio: "12:00", duracion_min: 510, descanso_min: 30 }, // 12:00–20:30 · 8 h
  { clave: "medio_cierre", hora_inicio: "14:30", duracion_min: 360, descanso_min: 0 }, // 14:30–20:30 · 6 h
  { clave: "corto_pico", hora_inicio: "16:30", duracion_min: 240, descanso_min: 0 }, // 16:30–20:30 · 4 h
];

const plantilla = (clave: string): PlantillaTurno => {
  const p = PLANTILLAS.find((x) => x.clave === clave);
  if (!p) throw new Error(`Plantilla desconocida: ${clave}`);
  return p;
};

const REGLAS_LABORALES = {
  vigente_desde: "2026-01-01",
  tope_semanal: 40,
  max_horas_dia: 8,
  horas_dobles_max: 9,
  factor_doble: 2,
  factor_triple: 3,
  prima_dominical_pct: 25,
  descanso_entre_turnos_horas: 12,
  max_dias_semana: 6,
};

const TABULADOR_VIGENTE_DESDE = "2026-01-01";
const PRIMA_DOMINICAL_PCT = 25;
const APERTURA = "09:00";
const CIERRE = "21:00";
const CONVERSION = 0.35;
const TICKET_PROMEDIO = 650;
const INTERVALO_MIN = 30;

// Curva intradía (hora decimal → multiplicador); se interpola linealmente en
// el punto medio de cada intervalo. Valle 09–11 (×0.6), pico de comida
// 13:30–15:00 (×1.4), pico de cierre 18:30–20:30 (×1.5).
const CURVA_INTRADIA: ReadonlyArray<readonly [number, number]> = [
  [9.0, 0.6],
  [10.75, 0.6],
  [12.0, 1.0],
  [13.5, 1.4],
  [15.0, 1.4],
  [16.0, 1.0],
  [17.5, 1.1],
  [18.5, 1.5],
  [20.5, 1.5],
  [21.0, 1.1],
];

/** Multiplicador por día de la semana ISO (1 = lunes … 7 = domingo). */
const FACTOR_DIA: Record<number, number> = { 1: 1.0, 2: 0.95, 3: 0.95, 4: 1.0, 5: 1.15, 6: 1.6, 7: 1.4 };
const FACTOR_QUINCENA = 1.15;
const RUIDO_TRAFICO = 0.08;
const RUIDO_VENTAS = 0.05;

function factorIntradia(horaDecimal: number): number {
  const c = CURVA_INTRADIA;
  if (horaDecimal <= c[0][0]) return c[0][1];
  for (let i = 1; i < c.length; i++) {
    const [h1, f1] = c[i];
    if (horaDecimal <= h1) {
      const [h0, f0] = c[i - 1];
      return f0 + ((horaDecimal - h0) / (h1 - h0)) * (f1 - f0);
    }
  }
  return c[c.length - 1][1];
}

// -----------------------------------------------------------------------------
// Nombres
// -----------------------------------------------------------------------------

const NOMBRES = [
  "José", "Juan", "Luis", "Carlos", "Miguel", "Jorge", "Francisco", "Antonio", "Alejandro", "Ricardo",
  "Fernando", "Eduardo", "Javier", "Roberto", "Daniel", "Raúl", "Manuel", "Sergio", "Arturo", "Óscar",
  "Héctor", "Andrés", "Diego", "Rodrigo", "Iván", "Emmanuel", "Gerardo", "Ramón", "Enrique", "Alberto",
  "Cristian", "Bruno", "Ismael", "Tomás", "Julio", "Adrián", "Mauricio", "Rubén", "Guillermo", "Pablo",
  "María", "Guadalupe", "Juana", "Margarita", "Verónica", "Alejandra", "Leticia", "Patricia", "Rosa", "Teresa",
  "Gabriela", "Claudia", "Adriana", "Martha", "Elizabeth", "Araceli", "Lucía", "Paola", "Rocío", "Norma",
  "Karla", "Fernanda", "Daniela", "Mariana", "Ana", "Sofía", "Ximena", "Valeria", "Andrea", "Jimena",
  "Brenda", "Diana", "Laura", "Mónica", "Sandra", "Beatriz", "Yolanda", "Silvia", "Carmen", "Estela",
];

const APELLIDOS = [
  "Hernández", "García", "Martínez", "López", "González", "Pérez", "Rodríguez", "Sánchez", "Ramírez", "Cruz",
  "Flores", "Gómez", "Morales", "Vázquez", "Reyes", "Jiménez", "Torres", "Díaz", "Gutiérrez", "Ruiz",
  "Mendoza", "Aguilar", "Ortiz", "Castillo", "Moreno", "Romero", "Álvarez", "Chávez", "Rivera", "Juárez",
  "Ramos", "Domínguez", "Herrera", "Medina", "Castro", "Vargas", "Guzmán", "Méndez", "Rojas", "Salazar",
  "Contreras", "Luna", "Ortega", "Estrada", "Delgado", "Cortés", "Guerrero", "Santiago", "Núñez", "Cárdenas",
  "Espinoza", "Ríos", "Ávila", "Fuentes", "Cervantes", "Solís", "Velázquez", "Navarro", "Campos", "Peña",
  "Lara", "Padilla", "Meza", "Escobar", "Molina", "Nájera", "Quintero", "Téllez", "Olvera", "Bautista",
  "Camacho", "Carrillo", "Ibarra", "Valdez", "Zamora", "Cabrera", "Acosta", "Pacheco", "Serrano", "Trejo",
];

// -----------------------------------------------------------------------------
// Patrones de disponibilidad restringida
// -----------------------------------------------------------------------------

type PatronDisponibilidad = "estudiante_tarde" | "fin_de_semana" | "solo_manana" | "sin_domingo" | "hasta_18";

const TODO_EL_DIA = { hora_inicio: APERTURA, hora_fin: CIERRE };

function ventanas(patron: PatronDisponibilidad): Disponibilidad[] {
  switch (patron) {
    case "estudiante_tarde":
      // Clases por la mañana entre semana; fines de semana completos.
      return [
        ...[1, 2, 3, 4, 5].map((d) => ({ dia_semana: d, hora_inicio: "15:00", hora_fin: CIERRE })),
        ...[6, 7].map((d) => ({ dia_semana: d, ...TODO_EL_DIA })),
      ];
    case "fin_de_semana":
      return [
        { dia_semana: 4, hora_inicio: "15:00", hora_fin: CIERRE },
        { dia_semana: 5, hora_inicio: "15:00", hora_fin: CIERRE },
        { dia_semana: 6, ...TODO_EL_DIA },
        { dia_semana: 7, ...TODO_EL_DIA },
      ];
    case "solo_manana":
      return [1, 2, 3, 4, 5, 6].map((d) => ({ dia_semana: d, hora_inicio: APERTURA, hora_fin: "15:00" }));
    case "sin_domingo":
      return [1, 2, 3, 4, 5, 6].map((d) => ({ dia_semana: d, ...TODO_EL_DIA }));
    case "hasta_18":
      return [1, 2, 3, 4, 5, 6, 7].map((d) => ({ dia_semana: d, hora_inicio: APERTURA, hora_fin: "18:00" }));
  }
}

// -----------------------------------------------------------------------------
// Generación por tienda
// -----------------------------------------------------------------------------

/** Estado interno de un empleado para producir su horario rígido. */
type PerfilBaseline = {
  empleado: Empleado;
  habilidadPrincipal: string;
  patron: PatronDisponibilidad | null;
  /** Plantilla fija del empleado (baseline rígido). */
  plantillaClave: string;
  /** Desplazamiento del día de descanso / de los días trabajados. */
  desplazamiento: number;
};

function repartirPuestos(n: number): string[] {
  // Redondeo por mayor resto con gerente ≥ 1; el resto se asigna a vendedor.
  const objetivo = PUESTOS.map((p) => ({ clave: p.clave, exacto: p.proporcion * n }));
  const base = objetivo.map((o) => ({ clave: o.clave, cantidad: Math.floor(o.exacto), resto: o.exacto - Math.floor(o.exacto) }));
  let asignados = base.reduce((s, b) => s + b.cantidad, 0);
  const porResto = [...base].sort((a, b) => b.resto - a.resto);
  for (const b of porResto) {
    if (asignados >= n) break;
    b.cantidad++;
    asignados++;
  }
  const gerente = base.find((b) => b.clave === "gerente")!;
  if (gerente.cantidad === 0) {
    gerente.cantidad = 1;
    base.find((b) => b.clave === "vendedor")!.cantidad--;
  }
  const out: string[] = [];
  for (const b of base) for (let i = 0; i < b.cantidad; i++) out.push(b.clave);
  while (out.length < n) out.push("vendedor");
  return out.slice(0, n);
}

function generarEmpleados(sucursal: Sucursal, r: Rng): PerfilBaseline[] {
  const n = sucursal.fte;
  const claves = barajar(r, repartirPuestos(n));
  const puestoDe = (clave: string) => PUESTOS.find((p) => p.clave === clave)!;

  // 30 % medio tiempo, sólo en puestos que lo admiten.
  const objetivoPT = Math.round(n * 0.3);
  const candidatosPT = barajar(
    r,
    claves.map((c, i) => i).filter((i) => puestoDe(claves[i]).medioTiempo),
  );
  const esPT = new Set(candidatosPT.slice(0, objetivoPT));

  const perfiles: PerfilBaseline[] = [];
  for (let i = 0; i < n; i++) {
    const puesto = puestoDe(claves[i]);
    const medioTiempo = esPT.has(i);
    const habilidades = [puesto.habilidad_clave, ...puesto.extras];
    if (puesto.opcional && r() < puesto.opcional.probabilidad) habilidades.push(puesto.opcional.habilidad);

    // Disponibilidad restringida: ~40 % de los medio tiempo (estudiantes),
    // ~4 % de los tiempo completo → ≈ 15 % de la plantilla.
    let patron: PatronDisponibilidad | null = null;
    if (medioTiempo) {
      if (r() < 0.4) {
        const u = r();
        patron = u < 0.5 ? "estudiante_tarde" : u < 0.75 ? "fin_de_semana" : "solo_manana";
      }
    } else if (puesto.clave !== "gerente" && puesto.clave !== "supervisor" && r() < 0.04) {
      patron = r() < 0.6 ? "sin_domingo" : "hasta_18";
    }

    // Plantilla rígida vigente.
    let plantillaClave: string;
    if (medioTiempo) {
      if (patron === "estudiante_tarde" || patron === "fin_de_semana") plantillaClave = "medio_tarde";
      else if (patron === "solo_manana") plantillaClave = "medio_manana";
      else plantillaClave = r() < 0.7 ? "medio_manana" : "medio_tarde";
    } else if (patron === "hasta_18") {
      plantillaClave = "apertura";
    } else {
      plantillaClave = r() < 0.5 ? "apertura" : "cierre";
    }

    const empleado: Empleado = {
      clave_externa: `${sucursal.clave}-${String(i + 1).padStart(3, "0")}`,
      sucursal_clave: sucursal.clave,
      nombre: elegir(r, NOMBRES),
      apellido: `${elegir(r, APELLIDOS)} ${elegir(r, APELLIDOS)}`,
      puesto_clave: puesto.clave,
      tipo_contrato: medioTiempo ? "medio_tiempo" : "tiempo_completo",
      jornada_contratada: medioTiempo ? 24 : 48,
      max_horas_semana: medioTiempo ? 24 : 40,
      habilidades: [...new Set(habilidades)],
      disponibilidad: patron ? ventanas(patron) : [],
    };

    perfiles.push({
      empleado,
      habilidadPrincipal: puesto.habilidad_clave,
      patron,
      plantillaClave,
      desplazamiento: entero(r, 0, 6),
    });
  }
  return perfiles;
}

function turnoDe(perfil: PerfilBaseline, fecha: string, plantillaClave: string): Turno {
  const p = plantilla(plantillaClave);
  const ini = minutosDe(p.hora_inicio);
  return {
    clave_externa: perfil.empleado.clave_externa,
    fecha,
    hora_inicio: horaTexto(ini),
    hora_fin: horaTexto(ini + p.duracion_min),
    descanso_min: p.descanso_min,
    habilidad_clave: perfil.habilidadPrincipal,
  };
}

/**
 * Horario rígido vigente (baseline) de una semana:
 *  - tiempo completo: 6 días × 8 h en su plantilla fija (apertura o cierre),
 *    con un día de descanso que rota cada semana; el domingo se cubre como
 *    cualquier otro día;
 *  - medio tiempo: 4 días × 6 h (mañana en su mayoría), días que rotan.
 */
function generarTurnosSemana(perfiles: PerfilBaseline[], lunes: Date, indiceSemana: number): Turno[] {
  const turnos: Turno[] = [];
  const fechas = Array.from({ length: 7 }, (_, i) => fechaIso(sumarDias(lunes, i)));
  for (const perfil of perfiles) {
    const { empleado, patron, plantillaClave, desplazamiento } = perfil;
    if (empleado.tipo_contrato === "tiempo_completo") {
      const descanso = patron === "sin_domingo" ? 7 : ((desplazamiento + indiceSemana) % 7) + 1;
      for (let d = 1; d <= 7; d++) {
        if (d === descanso) continue;
        turnos.push(turnoDe(perfil, fechas[d - 1], plantillaClave));
      }
      continue;
    }
    // Medio tiempo.
    let dias: number[];
    if (patron === "fin_de_semana") {
      dias = [4, 5, 6, 7];
    } else if (patron === "solo_manana") {
      dias = Array.from({ length: 4 }, (_, k) => ((desplazamiento + indiceSemana + k) % 6) + 1);
    } else {
      dias = Array.from({ length: 4 }, (_, k) => ((desplazamiento + indiceSemana + k) % 7) + 1);
    }
    for (const d of dias) {
      let clave = plantillaClave;
      // Fin de semana: en sábado y domingo el horario vigente los pone por la mañana.
      if (patron === "fin_de_semana" && d >= 6) clave = "medio_manana";
      turnos.push(turnoDe(perfil, fechas[d - 1], clave));
    }
  }
  turnos.sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : a.clave_externa < b.clave_externa ? -1 : 1));
  return turnos;
}

type ParametrosTienda = { baseHora: number; ticket: number; conversion: number };

function generarTrafico(
  sucursal: Sucursal,
  parametros: ParametrosTienda,
  semanas: readonly Date[],
  r: Rng,
): FilaTrafico[] {
  const filas: FilaTrafico[] = [];
  const apertura = minutosDe(sucursal.apertura);
  const cierre = minutosDe(sucursal.cierre);
  const base30 = (parametros.baseHora * INTERVALO_MIN) / 60;
  for (const lunes of semanas) {
    const quincena = esSemanaDeQuincena(lunes) ? FACTOR_QUINCENA : 1;
    for (let d = 0; d < 7; d++) {
      const fecha = sumarDias(lunes, d);
      const dia = FACTOR_DIA[diaSemanaIso(fecha)];
      for (let m = apertura; m < cierre; m += INTERVALO_MIN) {
        const medio = (m + INTERVALO_MIN / 2) / 60;
        const esperado = base30 * factorIntradia(medio) * dia * quincena;
        const trafico = Math.max(0, Math.round(esperado * (1 + entre(r, -RUIDO_TRAFICO, RUIDO_TRAFICO))));
        const ventas = trafico * parametros.conversion * parametros.ticket * (1 + entre(r, -RUIDO_VENTAS, RUIDO_VENTAS));
        filas.push({ inicio: marcaTiempo(fechaIso(fecha), m), trafico, ventas: Math.round(ventas * 100) / 100 });
      }
    }
  }
  return filas;
}

// -----------------------------------------------------------------------------
// Escritura
// -----------------------------------------------------------------------------

function escribirJson(ruta: string, valor: unknown) {
  fs.mkdirSync(path.dirname(ruta), { recursive: true });
  fs.writeFileSync(ruta, JSON.stringify(valor, null, 2) + "\n");
}

/** Arreglo grande: un objeto por línea (diffs legibles, archivo compacto). */
function escribirFilas(ruta: string, filas: readonly unknown[]) {
  fs.mkdirSync(path.dirname(ruta), { recursive: true });
  const cuerpo = filas.map((f) => "  " + JSON.stringify(f)).join(",\n");
  fs.writeFileSync(ruta, `[\n${cuerpo}\n]\n`);
}

function limpiarCarpeta(dir: string) {
  if (!fs.existsSync(dir)) return;
  for (const nombre of fs.readdirSync(dir)) {
    if (nombre.endsWith(".json")) fs.rmSync(path.join(dir, nombre));
  }
}

// -----------------------------------------------------------------------------
// Principal
// -----------------------------------------------------------------------------

function main() {
  const t0 = Date.now();
  const op = leerArgumentos(process.argv.slice(2));

  const lunesFinal = aFecha(op.semanaFinal);
  if (diaSemanaIso(lunesFinal) !== 1) throw new Error(`--semana-final debe ser lunes (${op.semanaFinal})`);
  const semanasObjetivo = Array.from({ length: op.semanasObjetivo }, (_, i) =>
    sumarDias(lunesFinal, -7 * (op.semanasObjetivo - 1 - i)),
  );
  const primerObjetivo = semanasObjetivo[0];
  const semanasHistoria = Array.from({ length: op.semanasHistoria }, (_, i) =>
    sumarDias(primerObjetivo, -7 * (op.semanasHistoria - i)),
  );
  const todasLasSemanas = [...semanasHistoria, ...semanasObjetivo];

  // Sucursales: round-robin por hub para que un subconjunto pequeño ya tenga
  // varias regiones; si se piden más de las localidades disponibles, se
  // repiten con sufijo.
  const porHub = new Map<string, Localidad[]>();
  for (const l of LOCALIDADES) porHub.set(l.hub, [...(porHub.get(l.hub) ?? []), l]);
  const SUFIJOS = ["", " II", " III", " IV", " V", " VI", " VII", " VIII"];
  const seleccion: Localidad[] = [];
  for (let vuelta = 0; seleccion.length < op.tiendas; vuelta++) {
    for (const hub of HUBS) {
      const lista = porHub.get(hub.clave) ?? [];
      if (lista.length === 0) continue;
      const base = lista[vuelta % lista.length];
      const ciclo = Math.floor(vuelta / lista.length);
      const sufijo = SUFIJOS[ciclo] ?? ` ${ciclo + 1}`;
      seleccion.push({ ...base, nombre: `${base.nombre}${sufijo}` });
      if (seleccion.length >= op.tiendas) break;
    }
  }

  const sucursales: Sucursal[] = seleccion.map((l, i) => ({
    clave: `T${String(i + 1).padStart(3, "0")}`,
    nombre: l.nombre,
    hub_clave: l.hub,
    ciudad: l.ciudad,
    apertura: APERTURA,
    cierre: CIERRE,
    fte: entero(mulberry32(op.semilla * 1000 + i + 1), 65, 95),
  }));

  const hubsUsados = new Set(sucursales.map((s) => s.hub_clave));
  const puestosPorClave = new Map(PUESTOS.map((p) => [p.clave, p]));

  const catalogo: Catalogo = {
    empresa: EMPRESA,
    hubs: HUBS.filter((h) => hubsUsados.has(h.clave)).map(({ clave, nombre, ciudad, estado }) => ({ clave, nombre, ciudad, estado })),
    sucursales,
    puestos: PUESTOS.map(({ clave, nombre, habilidad_clave }) => ({ clave, nombre, habilidad_clave })),
    habilidades: HABILIDADES.map(({ clave, nombre }) => ({ clave, nombre })),
    tabuladores: PUESTOS.map((p) => ({
      puesto_clave: p.clave,
      vigente_desde: TABULADOR_VIGENTE_DESDE,
      salario_hora: p.salario_hora,
      prima_dominical_pct: PRIMA_DOMINICAL_PCT,
    })),
    plantillas_turno: PLANTILLAS,
    reglas_laborales: REGLAS_LABORALES,
    parametros_demanda: {
      clientes_por_colaborador_30min: op.clientesPorColaborador,
      conversion: CONVERSION,
      transacciones_por_cajero_30min: op.transaccionesPorCajero,
      minimo_apertura: { caja: 1, piso: 2, almacen: 1, supervision: 1 },
    },
  };

  // Salida.
  fs.mkdirSync(op.salida, { recursive: true });
  limpiarCarpeta(path.join(op.salida, "trafico"));
  limpiarCarpeta(path.join(op.salida, "turnos_vigentes"));
  escribirJson(path.join(op.salida, "catalogo.json"), catalogo);

  // Acumuladores para el resumen.
  const empleados: Empleado[] = [];
  let filasTrafico = 0;
  let filasTurnos = 0;
  let sumaTrafico = 0;
  let sumaVentas = 0;
  let sumaValle = 0;
  let nValle = 0;
  let sumaPico = 0;
  let nPico = 0;
  let maxTrafico30 = 0;
  let horasFT = 0;
  let horasPT = 0;
  let nominaTotal = 0;
  let horasRequeridas = 0;
  const conRestriccion = { total: 0, medio_tiempo: 0, tiempo_completo: 0 };
  const porPuesto: Record<string, number> = {};
  const porPlantilla: Record<string, number> = {};
  const porHubConteo: Record<string, number> = {};

  const cpc = op.clientesPorColaborador;
  const tpc = op.transaccionesPorCajero;
  const minimo = catalogo.parametros_demanda.minimo_apertura;

  for (const [i, sucursal] of sucursales.entries()) {
    const semillaTienda = op.semilla * 1000 + i + 1;
    const rEmpleados = mulberry32(semillaTienda * 7 + 1);
    const rTrafico = mulberry32(semillaTienda * 7 + 2);
    const rParametros = mulberry32(semillaTienda * 7 + 3);

    porHubConteo[sucursal.hub_clave] = (porHubConteo[sucursal.hub_clave] ?? 0) + 1;

    // Parámetros comerciales de la tienda: tráfico proporcional al tamaño,
    // ticket ±20 % alrededor de $650.
    const parametros: ParametrosTienda = {
      baseHora: Math.round(220 + ((sucursal.fte - 65) / 30) * 100),
      ticket: Math.round(TICKET_PROMEDIO * entre(rParametros, 0.8, 1.2)),
      conversion: CONVERSION,
    };

    const perfiles = generarEmpleados(sucursal, rEmpleados);
    for (const p of perfiles) {
      empleados.push(p.empleado);
      porPuesto[p.empleado.puesto_clave] = (porPuesto[p.empleado.puesto_clave] ?? 0) + 1;
      porPlantilla[p.plantillaClave] = (porPlantilla[p.plantillaClave] ?? 0) + 1;
      if (p.patron) {
        conRestriccion.total++;
        conRestriccion[p.empleado.tipo_contrato]++;
      }
    }

    const trafico = generarTrafico(sucursal, parametros, todasLasSemanas, rTrafico);
    escribirFilas(path.join(op.salida, "trafico", `${sucursal.clave}.json`), trafico);
    filasTrafico += trafico.length;
    for (const f of trafico) {
      sumaTrafico += f.trafico;
      sumaVentas += f.ventas;
      const hhmm = f.inicio.slice(11, 16);
      if (hhmm >= "09:00" && hhmm < "11:00") {
        sumaValle += f.trafico;
        nValle++;
      }
      if (hhmm >= "18:30" && hhmm < "20:30") {
        sumaPico += f.trafico;
        nPico++;
      }
      if (f.trafico > maxTrafico30) maxTrafico30 = f.trafico;
      // Requerimiento según docs/arquitectura.md §5 (sólo semanas objetivo).
      if (f.inicio.slice(0, 10) >= fechaIso(primerObjetivo)) {
        const piso = Math.max(minimo.piso, Math.ceil(f.trafico / cpc));
        const caja = Math.max(minimo.caja, Math.ceil((f.trafico * CONVERSION) / tpc));
        horasRequeridas += (piso + caja + minimo.almacen + minimo.supervision) * (INTERVALO_MIN / 60);
      }
    }

    const turnos: Turno[] = [];
    for (const [w, lunes] of semanasObjetivo.entries()) {
      turnos.push(...generarTurnosSemana(perfiles, lunes, w + op.semanasHistoria));
    }
    escribirFilas(path.join(op.salida, "turnos_vigentes", `${sucursal.clave}.json`), turnos);
    filasTurnos += turnos.length;

    const tipoDe = new Map(perfiles.map((p) => [p.empleado.clave_externa, p.empleado]));
    for (const t of turnos) {
      const horas = (minutosDe(t.hora_fin) - minutosDe(t.hora_inicio) - t.descanso_min) / 60;
      const e = tipoDe.get(t.clave_externa)!;
      if (e.tipo_contrato === "tiempo_completo") horasFT += horas;
      else horasPT += horas;
      const tarifa = puestosPorClave.get(e.puesto_clave)!.salario_hora;
      const domingo = diaSemanaIso(aFecha(t.fecha)) === 7 ? 1 + PRIMA_DOMINICAL_PCT / 100 : 1;
      nominaTotal += horas * tarifa * domingo;
    }
  }

  escribirFilas(path.join(op.salida, "empleados.json"), empleados);

  const nFT = empleados.filter((e) => e.tipo_contrato === "tiempo_completo").length;
  const nPT = empleados.length - nFT;
  const nSemanasObjetivo = semanasObjetivo.length;
  const nTiendas = sucursales.length;
  const diasTrafico = todasLasSemanas.length * 7;
  const tarifaMedia =
    empleados.reduce((s, e) => s + puestosPorClave.get(e.puesto_clave)!.salario_hora, 0) / Math.max(1, empleados.length);
  const redondear = (x: number, d = 1) => Math.round(x * 10 ** d) / 10 ** d;

  const horasBaselineSemanaTienda = (horasFT + horasPT) / nSemanasObjetivo / nTiendas;
  const resumen = {
    empresa: EMPRESA.nombre,
    semilla: op.semilla,
    parametros: {
      tiendas: op.tiendas,
      semanas_historia: op.semanasHistoria,
      semanas_objetivo: op.semanasObjetivo,
      semana_final: op.semanaFinal,
      clientes_por_colaborador_30min: cpc,
      transacciones_por_cajero_30min: tpc,
    },
    semanas: {
      historia: semanasHistoria.map(fechaIso),
      objetivo: semanasObjetivo.map(fechaIso),
      quincena: todasLasSemanas.filter(esSemanaDeQuincena).map(fechaIso),
    },
    tiendas: nTiendas,
    hubs: catalogo.hubs.length,
    tiendas_por_hub: porHubConteo,
    fte_promedio: redondear(sucursales.reduce((s, x) => s + x.fte, 0) / nTiendas),
    empleados: {
      total: empleados.length,
      tiempo_completo: nFT,
      medio_tiempo: nPT,
      pct_tiempo_completo: redondear((100 * nFT) / empleados.length),
      por_puesto: porPuesto,
      plantilla_baseline: porPlantilla,
      con_disponibilidad_restringida: {
        ...conRestriccion,
        pct: redondear((100 * conRestriccion.total) / empleados.length),
      },
    },
    trafico: {
      filas: filasTrafico,
      filas_por_tienda: filasTrafico / nTiendas,
      clientes_por_hora_promedio: redondear(sumaTrafico / filasTrafico / (INTERVALO_MIN / 60)),
      clientes_por_dia_tienda: redondear(sumaTrafico / nTiendas / diasTrafico),
      clientes_por_semana_tienda: redondear(sumaTrafico / nTiendas / todasLasSemanas.length),
      max_30min: maxTrafico30,
      valle_09_11_promedio_30min: redondear(sumaValle / nValle),
      pico_1830_2030_promedio_30min: redondear(sumaPico / nPico),
      ratio_pico_valle: redondear(sumaPico / nPico / (sumaValle / nValle), 2),
      ventas_semana_tienda_mxn: redondear(sumaVentas / nTiendas / todasLasSemanas.length, 0),
      ticket_promedio_mxn: redondear(sumaVentas / (sumaTrafico * CONVERSION), 0),
    },
    turnos_vigentes: {
      filas: filasTurnos,
      horas_semana_promedio_tiempo_completo: redondear(horasFT / nSemanasObjetivo / nFT, 2),
      horas_semana_promedio_medio_tiempo: redondear(horasPT / nSemanasObjetivo / Math.max(1, nPT), 2),
      horas_semana_tienda: redondear(horasBaselineSemanaTienda),
      horas_semana_tienda_con_tope_40: redondear((nFT * 40 + horasPT / nSemanasObjetivo) / nTiendas),
    },
    requerimiento: {
      horas_requeridas_semana_tienda: redondear(horasRequeridas / nSemanasObjetivo / nTiendas),
      cobertura_horas_baseline_pct: redondear((100 * horasRequeridas) / (horasFT + horasPT)),
    },
    nomina: {
      tarifa_media_hora_mxn: redondear(tarifaMedia, 2),
      semanal_promedio_tienda_mxn: redondear(nominaTotal / nSemanasObjetivo / nTiendas, 0),
      semanal_total_mxn: redondear(nominaTotal / nSemanasObjetivo, 0),
      anual_estimada_tienda_mxn: redondear((nominaTotal / nSemanasObjetivo / nTiendas) * 52, 0),
    },
    segundos: redondear((Date.now() - t0) / 1000, 2),
  };
  escribirJson(path.join(op.salida, "resumen.json"), resumen);

  console.log(`Almacenes del Valle · ${nTiendas} tiendas · ${empleados.length} empleados (${nFT} TC / ${nPT} MT)`);
  console.log(
    `tráfico: ${filasTrafico} filas · turnos vigentes: ${filasTurnos} filas · ` +
      `${redondear(resumen.turnos_vigentes.horas_semana_promedio_tiempo_completo, 1)} h/sem TC · ` +
      `${redondear(resumen.turnos_vigentes.horas_semana_promedio_medio_tiempo, 1)} h/sem MT`,
  );
  console.log(`salida: ${op.salida} (${resumen.segundos} s)`);
}

main();
