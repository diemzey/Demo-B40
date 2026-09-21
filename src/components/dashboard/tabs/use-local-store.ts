"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Estado persistido en `localStorage` con `useSyncExternalStore`: el servidor
 * (y la hidratación) renderizan el valor por defecto; el cliente lee la clave
 * y vuelve a renderizar. Toda lectura/escritura va en try/catch porque el
 * almacenamiento puede no existir (ventana privada, datos bloqueados).
 *
 * `fallback` debe ser una referencia estable (constante de módulo).
 */

const EVENTO = "j40:store";
const cache = new Map<string, { raw: string | null; value: unknown }>();

function leer<T>(key: string, fallback: T): T {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(key);
  } catch {
    raw = null;
  }
  const c = cache.get(key);
  if (c && c.raw === raw) return c.value as T;
  let value: T = fallback;
  if (raw != null) {
    try {
      value = JSON.parse(raw) as T;
    } catch {
      value = fallback;
    }
  }
  cache.set(key, { raw, value });
  return value;
}

function escribir<T>(key: string, value: T) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Sin almacenamiento: el valor vive solo en la caché de esta sesión.
    cache.set(key, { raw: null, value });
  }
  window.dispatchEvent(new CustomEvent(EVENTO, { detail: key }));
}

function suscribir(onChange: () => void) {
  window.addEventListener(EVENTO, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENTO, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function useLocalStore<T>(
  key: string,
  fallback: T,
): [T, (next: T | ((prev: T) => T)) => void] {
  const value = useSyncExternalStore(
    suscribir,
    () => leer(key, fallback),
    () => fallback,
  );
  const set = useCallback(
    (next: T | ((prev: T) => T)) => {
      const prev = leer(key, fallback);
      escribir(key, typeof next === "function" ? (next as (p: T) => T)(prev) : next);
    },
    [key, fallback],
  );
  return [value, set];
}

/* ---------- Configuración compartida ---------- */

export type Config = {
  /** Tope semanal vigente (h). */
  tope: number;
  /** Costo por hora de referencia (MXN). */
  costoHora: number;
  sucursalPrincipal: string;
  registroConectado: boolean;
};

export const CONFIG_KEY = "j40:config";
export const CONFIG_DEFAULT: Config = {
  tope: 46,
  costoHora: 60,
  sucursalPrincipal: "Coapa",
  registroConectado: false,
};

function normalizar(c: Partial<Config> | null | undefined): Config {
  const costo = Number(c?.costoHora);
  return {
    tope: [48, 46, 44, 42, 40].includes(Number(c?.tope)) ? Number(c?.tope) : CONFIG_DEFAULT.tope,
    costoHora: Number.isFinite(costo) && costo > 0 ? costo : CONFIG_DEFAULT.costoHora,
    sucursalPrincipal:
      typeof c?.sucursalPrincipal === "string" && c.sucursalPrincipal
        ? c.sucursalPrincipal
        : CONFIG_DEFAULT.sucursalPrincipal,
    registroConectado: Boolean(c?.registroConectado),
  };
}

const configCache = new WeakMap<object, Config>();

/** Configuración guardada (normalizada) y su setter. */
export function useConfig(): [Config, (next: Config) => void] {
  const [raw, set] = useLocalStore<Partial<Config>>(CONFIG_KEY, CONFIG_DEFAULT);
  let config = configCache.get(raw);
  if (!config) {
    config = normalizar(raw);
    configCache.set(raw, config);
  }
  return [config, set];
}

/** Identificador corto para elementos creados por la persona. */
export function nuevoId(prefijo: string) {
  return `${prefijo}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}
