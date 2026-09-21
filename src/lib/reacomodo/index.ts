/**
 * Motor de reacomodo semanal (misma lógica que `public.reacomodar_semana`
 * en Supabase; ver supabase/migrations/0005_reacomodo.sql).
 *
 * Principio: las horas de cobertura de la sucursal no desaparecen. Quien
 * está arriba del tope cede su exceso; ese exceso se reparte entre quienes
 * tienen capacidad, y lo que no cabe en la plantilla se reporta como horas
 * sin cubrir → vacantes sugeridas (o, si no se contrata, horas al doble).
 *
 *  1. Ceden: `hoy > tope` → `reacomodada = tope`. Bolsa = Σ (hoy − tope).
 *  2. Reciben, fase 1 (deuda de contrato): quien está por debajo de su jornada
 *     contratada sube primero hasta `min(contrato, tope)`, mayor déficit antes.
 *  3. Reciben, fase 2 (nivelación): la bolsa restante se reparte de 0.5 h en
 *     0.5 h dando siempre a quien menos horas tiene, hasta su límite
 *     (`tope`, o `min(tope, contrato + margen)` si se fija un margen).
 *  4. Lo que sobra en la bolsa son horas sin cubrir; vacantes = ⌈sobra / tope⌉.
 */
export const PASO = 0.5;

export type EntradaReacomodo = {
  id: string;
  hoy: number;
  /** Horas semanales pactadas; null si no se conocen. */
  contrato?: number | null;
};

export type SalidaReacomodo<T extends EntradaReacomodo> = T & {
  reacomodada: number;
  /** reacomodada − hoy (negativo si cede). */
  delta: number;
  rol: "cede" | "recibe" | "igual";
};

export type ResumenReacomodo = {
  tope: number;
  colaboradores: number;
  horasTotales: number;
  /** Σ exceso sobre el tope antes del reacomodo. */
  horasExcedentes: number;
  /** Parte del exceso que sí cupo en la plantilla actual. */
  horasAbsorbidas: number;
  horasSinCubrir: number;
  vacantesSugeridas: number;
  fueraDeNormaAntes: number;
  fueraDeNormaDespues: number;
};

export type OpcionesReacomodo = {
  tope: number;
  /**
   * Horas extra que una persona puede recibir por encima de su contrato
   * (null = puede subir hasta el tope). Quien no tiene contrato registrado
   * siempre puede subir hasta el tope.
   */
  margenContrato?: number | null;
};

const r1 = (n: number) => Math.round(n * 10) / 10;
const aPaso = (n: number) => Math.floor(n / PASO + 1e-9) * PASO;

export function reacomodar<T extends EntradaReacomodo>(
  personas: T[],
  { tope, margenContrato = null }: OpcionesReacomodo,
): { personas: SalidaReacomodo<T>[]; resumen: ResumenReacomodo } {
  const horas = personas.map((p) => Math.max(0, p.hoy));
  // Límite al que puede subir cada persona.
  const limite = personas.map((p) => {
    if (margenContrato == null || p.contrato == null) return tope;
    return Math.min(tope, Math.max(p.contrato, p.hoy) + margenContrato);
  });

  // 1. Ceden.
  let bolsa = 0;
  for (let i = 0; i < horas.length; i++) {
    if (horas[i] > tope) {
      bolsa += horas[i] - tope;
      horas[i] = tope;
    }
  }
  const horasExcedentes = r1(bolsa);
  bolsa = aPaso(bolsa);

  // 2. Fase 1: deuda de contrato, mayor déficit primero.
  const deudores = personas
    .map((p, i) => ({ i, deficit: aPaso(Math.max(0, Math.min(p.contrato ?? 0, limite[i]) - horas[i])) }))
    .filter((d) => d.deficit > 0)
    .sort((a, b) => b.deficit - a.deficit || a.i - b.i);
  for (const d of deudores) {
    if (bolsa <= 0) break;
    const da = Math.min(d.deficit, bolsa);
    horas[d.i] += da;
    bolsa -= da;
  }

  // 3. Fase 2: nivelación de 0.5 h en 0.5 h a quien menos tiene.
  while (bolsa >= PASO - 1e-9) {
    let mejor = -1;
    for (let i = 0; i < horas.length; i++) {
      if (horas[i] + PASO <= limite[i] + 1e-9 && (mejor < 0 || horas[i] < horas[mejor])) mejor = i;
    }
    if (mejor < 0) break;
    horas[mejor] += PASO;
    bolsa -= PASO;
  }

  const salida = personas.map((p, i) => {
    const reacomodada = r1(horas[i]);
    const delta = r1(reacomodada - p.hoy);
    return { ...p, reacomodada, delta, rol: delta < 0 ? "cede" : delta > 0 ? "recibe" : "igual" } as SalidaReacomodo<T>;
  });

  const horasSinCubrir = r1(bolsa);
  return {
    personas: salida,
    resumen: {
      tope,
      colaboradores: personas.length,
      horasTotales: r1(personas.reduce((a, p) => a + p.hoy, 0)),
      horasExcedentes,
      horasAbsorbidas: r1(horasExcedentes - horasSinCubrir),
      horasSinCubrir,
      vacantesSugeridas: horasSinCubrir > 0 ? Math.ceil(horasSinCubrir / tope - 1e-9) : 0,
      fueraDeNormaAntes: personas.filter((p) => p.hoy > tope).length,
      fueraDeNormaDespues: salida.filter((p) => p.reacomodada > tope).length,
    },
  };
}
