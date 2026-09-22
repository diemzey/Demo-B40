/**
 * Requerimiento de personal por intervalo (docs/arquitectura.md §5).
 *
 *   requerido_caja = max(minimo.caja, ceil(trafico × conversion / transacciones_por_cajero_30min))
 *   requerido_piso = max(minimo.piso, ceil(trafico / clientes_por_colaborador_30min))
 *   almacen, supervision = mínimos de apertura (fijos)
 *   requerido_total = Σ por habilidad
 *   es_pico = requerido_total ≥ percentil 80 de la tienda-semana
 *
 * Percentil 80 con la regla del "rango más cercano" (nearest-rank):
 * ordenado ascendente, el valor en la posición ceil(0.8 · n). Con 168
 * intervalos es el 135.º valor, de modo que ≥ 34 intervalos son pico.
 */

import type { DemandaFila, IntervaloPronostico, ParametrosDemanda } from './tipos';

export const PERCENTIL_PICO = 0.8;

export function percentilNearestRank(valores: number[], p: number): number {
  if (valores.length === 0) return 0;
  const ord = [...valores].sort((a, b) => a - b);
  const idx = Math.max(0, Math.min(ord.length - 1, Math.ceil(p * ord.length) - 1));
  return ord[idx];
}

export function requerimiento(
  pronostico: IntervaloPronostico[],
  parametros: ParametrosDemanda,
): DemandaFila[] {
  const min = parametros.minimo_apertura;
  const filas: DemandaFila[] = pronostico.map((iv) => {
    const caja = Math.max(
      min.caja ?? 0,
      Math.ceil((iv.trafico * parametros.conversion) / parametros.transacciones_por_cajero_30min),
    );
    const piso = Math.max(
      min.piso ?? 0,
      Math.ceil(iv.trafico / parametros.clientes_por_colaborador_30min),
    );
    const porHab: Record<string, number> = { caja, piso };
    for (const [hab, n] of Object.entries(min)) {
      if (hab !== 'caja' && hab !== 'piso') porHab[hab] = n;
    }
    const total = Object.values(porHab).reduce((s, x) => s + x, 0);
    return {
      inicio: iv.inicio,
      fin: iv.fin,
      trafico: iv.trafico,
      ventas: iv.ventas,
      requerido_total: total,
      requerido_caja: caja,
      es_pico: false,
      requerido_por_habilidad: porHab,
    };
  });
  const umbral = percentilNearestRank(
    filas.map((f) => f.requerido_total),
    PERCENTIL_PICO,
  );
  for (const f of filas) f.es_pico = f.requerido_total >= umbral;
  return filas;
}
