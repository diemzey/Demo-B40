import type { JornadaPersona } from "@/components/ui/jornada-artefacto";

/**
 * Plantilla sintética de la sucursal Coapa: 30 colaboradores.
 * `hoy` son las horas de la semana 31 como está; `reacomodada`, la propuesta
 * del motor con los mismos contratos. Ninguna persona es real.
 */
export const PLANTILLA_COAPA: JornadaPersona[] = [
  { nombre: "Ortega Bruno", foto: "/avatars/ortega-bruno.jpg", hoy: 49.0, reacomodada: 40.0 },
  { nombre: "Cárdenas Ismael", foto: "/avatars/cardenas-ismael.jpg", hoy: 49.0, reacomodada: 39.5 },
  { nombre: "Quintero Diego", foto: "/avatars/quintero-diego.jpg", hoy: 49.0, reacomodada: 31.5 },
  { nombre: "Téllez Rodrigo", foto: "/avatars/tellez-rodrigo.jpg", hoy: 49.0, reacomodada: 40.0 },
  { nombre: "Nájera Paola", foto: "/avatars/najera-paola.jpg", hoy: 48.5, reacomodada: 46.0 },
  { nombre: "Olvera Héctor", foto: "/avatars/olvera-hector.jpg", hoy: 44.0, reacomodada: 36.0 },
  { nombre: "Escobar Tomás", foto: "/avatars/escobar-tomas.jpg", hoy: 25.0, reacomodada: 23.5 },
  { nombre: "Molina Rocío", foto: "/avatars/molina-rocio.jpg", hoy: 24.5, reacomodada: 21.0 },
  { nombre: "Aguilar Mateo", foto: "/avatars/aguilar-mateo.jpg", hoy: 52.0, reacomodada: 44.0 },
  { nombre: "Beltrán Sofía", foto: "/avatars/beltran-sofia.jpg", hoy: 50.5, reacomodada: 42.5 },
  { nombre: "Castro Julián", foto: "/avatars/castro-julian.jpg", hoy: 51.0, reacomodada: 45.0 },
  { nombre: "Domínguez Valeria", foto: "/avatars/dominguez-valeria.jpg", hoy: 49.5, reacomodada: 41.0 },
  { nombre: "Espinoza Andrés", foto: "/avatars/espinoza-andres.jpg", hoy: 53.0, reacomodada: 46.0 },
  { nombre: "Flores Camila", foto: "/avatars/flores-camila.jpg", hoy: 48.0, reacomodada: 40.5 },
  { nombre: "García Emilio", foto: "/avatars/garcia-emilio.jpg", hoy: 50.0, reacomodada: 43.0 },
  { nombre: "Herrera Daniela", foto: "/avatars/herrera-daniela.jpg", hoy: 51.5, reacomodada: 44.5 },
  { nombre: "Ibarra Sebastián", foto: "/avatars/ibarra-sebastian.jpg", hoy: 52.5, reacomodada: 45.5 },
  { nombre: "Jiménez Fernanda", foto: "/avatars/jimenez-fernanda.jpg", hoy: 49.0, reacomodada: 38.0 },
  { nombre: "Lara Nicolás", foto: "/avatars/lara-nicolas.jpg", hoy: 54.0, reacomodada: 46.0 },
  { nombre: "Mendoza Regina", foto: "/avatars/mendoza-regina.jpg", hoy: 50.5, reacomodada: 42.0 },
  { nombre: "Navarro Santiago", foto: "/avatars/navarro-santiago.jpg", hoy: 51.0, reacomodada: 44.0 },
  { nombre: "Ochoa Ximena", foto: "/avatars/ochoa-ximena.jpg", hoy: 48.5, reacomodada: 39.0 },
  { nombre: "Pacheco Leonardo", foto: "/avatars/pacheco-leonardo.jpg", hoy: 53.5, reacomodada: 45.0 },
  { nombre: "Ramírez Mariana", foto: "/avatars/ramirez-mariana.jpg", hoy: 50.0, reacomodada: 41.5 },
  { nombre: "Salinas Gabriel", foto: "/avatars/salinas-gabriel.jpg", hoy: 52.0, reacomodada: 43.5 },
  { nombre: "Torres Renata", foto: "/avatars/torres-renata.jpg", hoy: 49.5, reacomodada: 40.0 },
  { nombre: "Urbina Alejandro", foto: "/avatars/urbina-alejandro.jpg", hoy: 55.0, reacomodada: 46.0 },
  { nombre: "Vargas Lucía", foto: "/avatars/vargas-lucia.jpg", hoy: 51.5, reacomodada: 42.0 },
  { nombre: "Zamora Diego", foto: "/avatars/zamora-diego.jpg", hoy: 50.0, reacomodada: 44.0 },
  { nombre: "Zúñiga Abril", foto: "/avatars/zuniga-abril.jpg", hoy: 48.5, reacomodada: 41.0 },
];

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
