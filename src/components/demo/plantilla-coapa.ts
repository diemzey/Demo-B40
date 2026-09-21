import type { JornadaPersona, JornadaResumen } from "@/components/ui/jornada-artefacto";
import { reacomodar, type ResumenReacomodo } from "@/lib/reacomodo";

/** Tope transitorio que usa la portada y el panel de muestra (2027). */
export const TOPE = 46;
/** Tope final de la reforma, desde enero de 2030. */
export const TOPE_2030 = 40;

/** Colaborador sin la columna reacomodada: el motor la calcula. */
export type PersonaBase = Omit<JornadaPersona, "reacomodada">;

/**
 * Plantilla sintética de la sucursal Coapa: 30 colaboradores con las horas
 * de la semana 31 como está (`hoy`). La columna `reacomodada` no se escribe
 * a mano: sale de `reacomodar` con el tope vigente. Ninguna persona es real.
 */
export const PLANTILLA_BASE: PersonaBase[] = [
  { nombre: "Ortega Bruno", foto: "/avatars/ortega-bruno.jpg", hoy: 49.0 },
  { nombre: "Cárdenas Ismael", foto: "/avatars/cardenas-ismael.jpg", hoy: 49.0 },
  { nombre: "Quintero Diego", foto: "/avatars/quintero-diego.jpg", hoy: 49.0 },
  { nombre: "Téllez Rodrigo", foto: "/avatars/tellez-rodrigo.jpg", hoy: 49.0 },
  { nombre: "Nájera Paola", foto: "/avatars/najera-paola.jpg", hoy: 48.5 },
  { nombre: "Olvera Héctor", foto: "/avatars/olvera-hector.jpg", hoy: 44.0 },
  { nombre: "Escobar Tomás", foto: "/avatars/escobar-tomas.jpg", hoy: 25.0 },
  { nombre: "Molina Rocío", foto: "/avatars/molina-rocio.jpg", hoy: 24.5 },
  { nombre: "Aguilar Mateo", foto: "/avatars/aguilar-mateo.jpg", hoy: 52.0 },
  { nombre: "Beltrán Sofía", foto: "/avatars/beltran-sofia.jpg", hoy: 50.5 },
  { nombre: "Castro Julián", foto: "/avatars/castro-julian.jpg", hoy: 51.0 },
  { nombre: "Domínguez Valeria", foto: "/avatars/dominguez-valeria.jpg", hoy: 49.5 },
  { nombre: "Espinoza Andrés", foto: "/avatars/espinoza-andres.jpg", hoy: 53.0 },
  { nombre: "Flores Camila", foto: "/avatars/flores-camila.jpg", hoy: 48.0 },
  { nombre: "García Emilio", foto: "/avatars/garcia-emilio.jpg", hoy: 50.0 },
  { nombre: "Herrera Daniela", foto: "/avatars/herrera-daniela.jpg", hoy: 51.5 },
  { nombre: "Ibarra Sebastián", foto: "/avatars/ibarra-sebastian.jpg", hoy: 52.5 },
  { nombre: "Jiménez Fernanda", foto: "/avatars/jimenez-fernanda.jpg", hoy: 49.0 },
  { nombre: "Lara Nicolás", foto: "/avatars/lara-nicolas.jpg", hoy: 54.0 },
  { nombre: "Mendoza Regina", foto: "/avatars/mendoza-regina.jpg", hoy: 50.5 },
  { nombre: "Navarro Santiago", foto: "/avatars/navarro-santiago.jpg", hoy: 51.0 },
  { nombre: "Ochoa Ximena", foto: "/avatars/ochoa-ximena.jpg", hoy: 48.5 },
  { nombre: "Pacheco Leonardo", foto: "/avatars/pacheco-leonardo.jpg", hoy: 53.5 },
  { nombre: "Ramírez Mariana", foto: "/avatars/ramirez-mariana.jpg", hoy: 50.0 },
  { nombre: "Salinas Gabriel", foto: "/avatars/salinas-gabriel.jpg", hoy: 52.0 },
  { nombre: "Torres Renata", foto: "/avatars/torres-renata.jpg", hoy: 49.5 },
  { nombre: "Urbina Alejandro", foto: "/avatars/urbina-alejandro.jpg", hoy: 55.0 },
  { nombre: "Vargas Lucía", foto: "/avatars/vargas-lucia.jpg", hoy: 51.5 },
  { nombre: "Zamora Diego", foto: "/avatars/zamora-diego.jpg", hoy: 50.0 },
  { nombre: "Zúñiga Abril", foto: "/avatars/zuniga-abril.jpg", hoy: 48.5 },
];

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

const coapa = reacomodoDe(PLANTILLA_BASE, TOPE);

/** Plantilla de Coapa ya reacomodada con el tope de 46 h. */
export const PLANTILLA_COAPA: JornadaPersona[] = coapa.personas;
/** Resumen del reacomodo de Coapa con el tope de 46 h. */
export const REACOMODO_COAPA: ResumenReacomodo = coapa.resumen;
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
