/**
 * Web Worker del motor: recibe la EntradaOptimizacion, corre `optimizar` fuera
 * del hilo principal y devuelve el resultado (o el mensaje de error del motor).
 * Lo crea `programar.ts` con `new Worker(new URL("./worker.ts", import.meta.url))`.
 */

import { optimizar, type EntradaOptimizacion } from "./optimizar";

type Alcance = { onmessage: ((ev: MessageEvent<EntradaOptimizacion>) => void) | null; postMessage(m: unknown): void };

const alcance = self as unknown as Alcance;

alcance.onmessage = (ev) => {
  try {
    alcance.postMessage({ ok: true, resultado: optimizar(ev.data) });
  } catch (e) {
    alcance.postMessage({ ok: false, mensaje: e instanceof Error ? e.message : String(e) });
  }
};
