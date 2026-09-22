import type { JornadaPersona, JornadaResumen } from "@/components/ui/jornada-artefacto";
import { reacomodar, type ResumenReacomodo } from "@/lib/reacomodo";
import ejemplo from "./ejemplo-tienda.json";

/**
 * Ejemplo real de la portada: una tienda-semana tomada de la corrida del
 * motor de programación (scripts/motor) sobre los datos sintéticos
 * calibrados de 50 tiendas. Se regenera con
 * `npx tsx scripts/motor/exportar-ejemplo.ts`. Ninguna persona es real.
 */
export const EJEMPLO = ejemplo;

/** Tope con el que se programó el ejemplo (2030: 40 h). */
export const TOPE = ejemplo.tope;
/** Tope final de la reforma, desde enero de 2030. */
export const TOPE_2030 = 40;

/** Colaborador sin la columna reacomodada: el motor la calcula. */
export type PersonaBase = Omit<JornadaPersona, "reacomodada">;

/** Plantilla de la tienda del ejemplo con las horas de su semana como está. */
export const PLANTILLA_BASE: PersonaBase[] = ejemplo.personas.map((p) => ({
  nombre: p.nombre,
  foto: p.foto,
  detalle: p.puesto,
  hoy: p.hoy,
}));

/**
 * Corre el motor de reacomodo sobre la plantilla y devuelve a cada persona
 * con su `reacomodada`, más el resumen (absorbidas, sin cubrir, vacantes).
 * Las horas no desaparecen: Σ reacomodada + sin cubrir = Σ hoy.
 */
export function reacomodoDe<T extends PersonaBase>(
  personas: T[],
  tope: number,
): { personas: (T & { reacomodada: number })[]; resumen: ResumenReacomodo } {
  const { personas: salida, resumen } = reacomodar(
    personas.map((p, i) => ({ ...p, id: String(i) })),
    { tope },
  );
  return {
    personas: personas.map((p, i) => ({ ...p, reacomodada: salida[i].reacomodada })),
    resumen,
  };
}

/**
 * Plantilla del ejemplo con la semana que programó el motor: `reacomodada`
 * son las horas reales de la propuesta (tope 40 h, misma plantilla).
 */
export const PLANTILLA_COAPA: JornadaPersona[] = ejemplo.personas.map((p) => ({
  nombre: p.nombre,
  foto: p.foto,
  detalle: p.puesto,
  hoy: p.hoy,
  reacomodada: p.reacomodada,
}));
/** Reacomodo de horas (motor simple) sobre la misma plantilla, para el panel de muestra. */
export const REACOMODO_COAPA: ResumenReacomodo = reacomodoDe(PLANTILLA_BASE, TOPE).resumen;
/** Mismos turnos de hoy reacomodados con el tope de 2030 (40 h). */
export const REACOMODO_COAPA_2030: ResumenReacomodo = reacomodoDe(PLANTILLA_BASE, TOPE_2030).resumen;

/** Suma de horas por encima del tope y cuántas personas lo exceden. */
export function resumenDe(
  personas: JornadaPersona[],
  clave: "hoy" | "reacomodada",
  tope: number,
) {
  return personas.reduce(
    (acc, p) => {
      const exceso = Math.max(0, p[clave] - tope);
      return {
        horasAlDoble: Math.round((acc.horasAlDoble + exceso) * 10) / 10,
        fueraDeNorma: acc.fueraDeNorma + (exceso > 0 ? 1 : 0),
      };
    },
    { horasAlDoble: 0, fueraDeNorma: 0 },
  );
}

/**
 * Resumen "Después" para la tabla: el exceso que queda tras el reacomodo más
 * lo que no cupo en la plantilla (horas sin cubrir → vacantes sugeridas).
 */
export function resumenDespues(
  personas: JornadaPersona[],
  reacomodo: ResumenReacomodo,
): JornadaResumen {
  return {
    ...resumenDe(personas, "reacomodada", reacomodo.tope),
    horasAbsorbidas: reacomodo.horasAbsorbidas,
    horasSinCubrir: reacomodo.horasSinCubrir,
    vacantes: reacomodo.vacantesSugeridas,
  };
}

/** Resumen "Antes" del ejemplo: horas al doble y su costo semanal real. */
export function resumenAntesEjemplo(): JornadaResumen {
  return {
    ...resumenDe(PLANTILLA_COAPA, "hoy", TOPE),
    costoExtraMxn: ejemplo.baseline.costoDobles,
  };
}

/** Resumen "Después" del ejemplo: lo que queda al doble (0) y el ahorro semanal del motor. */
export function resumenDespuesEjemplo(): JornadaResumen {
  return {
    ...resumenDe(PLANTILLA_COAPA, "reacomodada", TOPE),
    horasSinCubrir: ejemplo.propuesta.vacantesHoras,
    vacantes: Math.ceil(ejemplo.propuesta.vacantesHoras / TOPE),
    ahorroMxn: ejemplo.ahorro.mxn,
    ahorroPct: ejemplo.ahorro.pct,
  };
}
