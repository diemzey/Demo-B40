"use client";

import { useSyncExternalStore } from "react";
import { programarPares, type Par, type ProgramacionFlujo } from "@/lib/importacion/flujo";
import type { ClienteSupabase } from "@/lib/importacion/importar";

/*
 * Cola de programación en segundo plano del panel.
 *
 * Tras importar, el flujo programa sólo la primera semana y abre el panel; el
 * resto de sucursal-semanas entra aquí y se programa mientras la persona
 * navega. Vive a nivel de módulo (no de componente) para sobrevivir al cambio
 * de pestañas y a que el onboarding se desmonte cuando el panel aparece. Sólo
 * sobrevive dentro de la misma página: si la pestaña se cierra, el panel
 * ofrece terminar lo que falte (`semanas_sin_propuesta`).
 */

export type EstadoCola = {
  /** Corriendo ahora mismo. */
  activa: boolean;
  total: number;
  hechas: number;
  /** 0–1 contando las semanas a medias. */
  fraccion: number;
  /** "Tlalpan · semana 31" de la última semana que reportó avance. */
  actual: string | null;
  /** Mensaje de error de la última corrida; las semanas que faltan quedan en `pendientes`. */
  error: string | null;
  /** Semanas que faltan (para reintentar). */
  pendientes: Par[];
  /** Momento en que terminó la última corrida completa, o null. */
  terminoEn: number | null;
  /** Suma del ahorro semanal de lo programado en esta sesión (MXN). */
  ahorroMxn: number;
};

const INICIAL: EstadoCola = {
  activa: false,
  total: 0,
  hechas: 0,
  fraccion: 0,
  actual: null,
  error: null,
  pendientes: [],
  terminoEn: null,
  ahorroMxn: 0,
};

let estado: EstadoCola = INICIAL;
const oyentes = new Set<() => void>();
let supabaseActual: ClienteSupabase | null = null;
let cancelar = false;
/** Semanas de la corrida actual que aún no terminan (llave → par). */
const enCurso = new Map<string, Par>();
/** Semanas que llegaron mientras corría otra corrida. */
let enEspera: Par[] = [];
/** Callbacks de "terminó una semana" (el panel refresca los datos con calma). */
const alTerminarSemana = new Set<(p: ProgramacionFlujo) => void>();

function fijar(parche: Partial<EstadoCola>) {
  estado = { ...estado, ...parche };
  for (const o of oyentes) o();
}

function semanaIsoNumero(lunes: string): number {
  const [y, m, d] = lunes.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const jueves = new Date(dt);
  jueves.setUTCDate(dt.getUTCDate() + 3);
  const inicioAnio = new Date(Date.UTC(jueves.getUTCFullYear(), 0, 1));
  return Math.ceil(((jueves.getTime() - inicioAnio.getTime()) / 86400000 + 1) / 7);
}

/** Arranca la cola con estas semanas (se suman a las que ya falten). */
export function iniciarCola(supabase: ClienteSupabase, pares: Par[]): void {
  supabaseActual = supabase;
  const vistas = new Set(estado.pendientes.map(llave));
  const nuevas = pares.filter((p) => {
    const k = llave(p);
    if (vistas.has(k)) return false;
    vistas.add(k);
    return true;
  });
  if (estado.activa) {
    // Ya corre: las nuevas entran cuando termine esta corrida.
    if (nuevas.length === 0) return;
    enEspera = [...enEspera, ...nuevas];
    fijar({ pendientes: [...enCurso.values(), ...enEspera], total: estado.total + nuevas.length });
    return;
  }
  const faltan = [...estado.pendientes, ...nuevas];
  if (faltan.length === 0) return;
  void correr(faltan, estado.error ? 0 : estado.hechas);
}

const llave = (p: Par) => `${p.sucursal.id}|${p.semanaIso}`;

/** Vuelve a intentar las semanas que faltan tras un error. */
export function reintentarCola(): void {
  if (estado.activa || !supabaseActual || estado.pendientes.length === 0) return;
  void correr(estado.pendientes, 0);
}

/** Detiene la cola después de las semanas en curso. */
export function detenerCola(): void {
  cancelar = true;
}

async function correr(pares: Par[], hechasPrevias: number): Promise<void> {
  const supabase = supabaseActual;
  if (!supabase) return;
  cancelar = false;
  enCurso.clear();
  for (const p of pares) enCurso.set(llave(p), p);
  fijar({
    activa: true,
    error: null,
    total: hechasPrevias + pares.length,
    hechas: hechasPrevias,
    fraccion: 0,
    pendientes: pares,
    terminoEn: null,
  });
  try {
    await programarPares({
      supabase,
      pares,
      cancelada: () => cancelar,
      onProgreso: ({ hechas, total, fraccion, par }) => {
        fijar({
          hechas: hechasPrevias + hechas,
          fraccion: (hechasPrevias + fraccion * total) / (hechasPrevias + total),
          actual: `${par.sucursal.nombre} · semana ${semanaIsoNumero(par.semanaIso)}`,
        });
      },
      onHecha: (p) => {
        enCurso.delete(llave(p));
        fijar({ pendientes: [...enCurso.values(), ...enEspera], ahorroMxn: estado.ahorroMxn + p.resultado.ahorroMxn });
        for (const cb of alTerminarSemana) cb(p);
      },
    });
    // Semanas que llegaron mientras corría (otra importación): siguen ahora.
    if (enEspera.length > 0 && !cancelar) {
      const siguientes = enEspera;
      enEspera = [];
      await correr(siguientes, estado.hechas);
      return;
    }
    fijar({ activa: false, actual: null, pendientes: [...enCurso.values()], terminoEn: Date.now(), fraccion: 1 });
  } catch (e) {
    const m = e instanceof Error ? e.message : String(e);
    fijar({
      activa: false,
      actual: null,
      error: m.replace(/\s*\[[0-9A-Z]{5}\]/g, "").trim() || "No pudimos programar.",
      pendientes: [...enCurso.values(), ...enEspera],
    });
    enEspera = [];
  }
}

export function alTerminarSemanaCola(cb: (p: ProgramacionFlujo) => void): () => void {
  alTerminarSemana.add(cb);
  return () => alTerminarSemana.delete(cb);
}

function suscribir(cb: () => void): () => void {
  oyentes.add(cb);
  return () => oyentes.delete(cb);
}

/** Estado de la cola para la UI (misma referencia mientras no cambie). */
export function useCola(): EstadoCola {
  return useSyncExternalStore(suscribir, () => estado, () => INICIAL);
}
