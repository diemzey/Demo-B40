"use client";

import { useCallback, useSyncExternalStore } from "react";

// DEMO: no existe backend de autenticación. La "sesión" vive solo en
// localStorage de este navegador para que la landing y el panel puedan
// mostrar a un usuario conectado.
export type Session = {
  nombre: string;
  correo: string;
  empresa: string;
  sucursal: string;
  foto: string;
};

export const SESSION_KEY = "j40:session";
const CHANGE_EVENT = "j40:session-change";

export const DEMO_USER: Session = {
  nombre: "Cesar González",
  correo: "cesar@gruposolmar.mx",
  empresa: "Grupo Solmar",
  sucursal: "Coapa",
  foto: "/avatars/ortega-bruno.jpg",
};

/** Iniciales para el fallback del avatar: "Cesar González" -> "CG". */
export function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "";
  const primera = partes[0][0] ?? "";
  const ultima = partes.length > 1 ? (partes[partes.length - 1][0] ?? "") : "";
  return (primera + ultima).toUpperCase();
}

function isSession(value: unknown): value is Session {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.nombre === "string" &&
    typeof v.correo === "string" &&
    typeof v.empresa === "string" &&
    typeof v.sucursal === "string" &&
    typeof v.foto === "string"
  );
}

// Cache del último valor leído para que getSnapshot devuelva una referencia
// estable mientras el contenido de localStorage no cambie.
let cachedRaw: string | null | undefined;
let cachedSession: Session | null = null;

function readSession(): Session | null {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(SESSION_KEY);
  } catch {
    raw = null;
  }
  if (raw === cachedRaw) return cachedSession;
  cachedRaw = raw;
  if (!raw) {
    cachedSession = null;
    return cachedSession;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    cachedSession = isSession(parsed) ? parsed : null;
  } catch {
    cachedSession = null;
  }
  return cachedSession;
}

function getServerSnapshot(): Session | null {
  return null;
}

function notify() {
  try {
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch {
    // ignorar
  }
}

function subscribe(onChange: () => void) {
  const onStorage = (e: StorageEvent) => {
    if (e.key === null || e.key === SESSION_KEY) onChange();
  };
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}

function subscribeNoop() {
  return () => {};
}

export function signIn(user: Session) {
  try {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  } catch {
    // Sin storage (modo privado, cuota, etc.): la sesión no persiste, pero
    // no rompemos la página.
  }
  notify();
}

export function signOut() {
  try {
    window.localStorage.removeItem(SESSION_KEY);
  } catch {
    // ignorar
  }
  notify();
}

export function useSession(): {
  user: Session | null;
  ready: boolean;
  signIn: (user: Session) => void;
  signOut: () => void;
} {
  const user = useSyncExternalStore(subscribe, readSession, getServerSnapshot);
  // `ready` es false en el servidor y durante la hidratación, así el markup
  // inicial coincide (estado "sin sesión") y luego se actualiza en cliente.
  const ready = useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false,
  );

  const doSignIn = useCallback((next: Session) => signIn(next), []);
  const doSignOut = useCallback(() => signOut(), []);

  return { user: ready ? user : null, ready, signIn: doSignIn, signOut: doSignOut };
}
