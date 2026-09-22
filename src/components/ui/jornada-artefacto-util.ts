/**
 * Helpers puros del artefacto de jornada (`jornada-artefacto.tsx`). Viven
 * aparte, sin componentes, para que Fast Refresh conserve el estado.
 */

/** Situación de una persona frente al tope semanal de horas. */
export type JornadaEstado = "excede" | "limite" | "cumple";

export function estadoDe(horas: number, tope: number): JornadaEstado {
  if (horas > tope) return "excede";
  if (horas === tope) return "limite";
  return "cumple";
}
