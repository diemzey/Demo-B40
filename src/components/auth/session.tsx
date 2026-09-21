"use client";

import type { User } from "@supabase/supabase-js";
import { useCallback, useSyncExternalStore } from "react";

import { createClient } from "@/lib/supabase/client";
import { hasSupabaseEnv } from "@/lib/supabase/env";

/**
 * Sesión mínima que consumen el header, el panel y el menú de perfil.
 *
 * - Con Supabase configurado (`hasSupabaseEnv()`), se construye a partir de
 *   `auth.getUser()` + la fila de `perfiles` (+ nombre de empresa y primera
 *   sucursal). `foto` va vacío: el avatar muestra las iniciales.
 * - Sin Supabase (modo demo), vive en `localStorage` de este navegador para
 *   que la landing y el panel puedan mostrar a un usuario conectado.
 */
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

/**
 * Instantánea que exponen ambos almacenes. `loaded` indica si ya se resolvió
 * la comprobación inicial (en demo es inmediato; con Supabase, tras
 * `getUser()` y la carga del perfil).
 */
type Snapshot = { user: Session | null; loaded: boolean };

type Store = {
  subscribe: (onChange: () => void) => () => void;
  getSnapshot: () => Snapshot;
  signIn: (user: Session) => void;
  signOut: () => Promise<void>;
};

const SERVER_SNAPSHOT: Snapshot = { user: null, loaded: false };
function getServerSnapshot(): Snapshot {
  return SERVER_SNAPSHOT;
}

/* -------------------------------------------------------------------------- */
/* Modo demo: localStorage                                                    */
/* -------------------------------------------------------------------------- */

// Cache del último valor leído para que getSnapshot devuelva una referencia
// estable mientras el contenido de localStorage no cambie.
let demoCachedRaw: string | null | undefined;
let demoCachedSnapshot: Snapshot = { user: null, loaded: true };

function demoRead(): Snapshot {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(SESSION_KEY);
  } catch {
    raw = null;
  }
  if (raw === demoCachedRaw) return demoCachedSnapshot;
  demoCachedRaw = raw;
  let user: Session | null = null;
  if (raw) {
    try {
      const parsed: unknown = JSON.parse(raw);
      user = isSession(parsed) ? parsed : null;
    } catch {
      user = null;
    }
  }
  demoCachedSnapshot = { user, loaded: true };
  return demoCachedSnapshot;
}

function demoNotify() {
  try {
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch {
    // ignorar
  }
}

const demoStore: Store = {
  subscribe(onChange) {
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key === SESSION_KEY) onChange();
    };
    window.addEventListener(CHANGE_EVENT, onChange);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(CHANGE_EVENT, onChange);
      window.removeEventListener("storage", onStorage);
    };
  },
  getSnapshot: demoRead,
  signIn(user) {
    try {
      window.localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    } catch {
      // Sin storage (modo privado, cuota, etc.): la sesión no persiste, pero
      // no rompemos la página.
    }
    demoNotify();
  },
  async signOut() {
    try {
      window.localStorage.removeItem(SESSION_KEY);
    } catch {
      // ignorar
    }
    demoNotify();
  },
};

/* -------------------------------------------------------------------------- */
/* Modo Supabase: auth + perfiles                                             */
/* -------------------------------------------------------------------------- */

let sbSnapshot: Snapshot = { user: null, loaded: false };
const sbListeners = new Set<() => void>();
let sbStarted = false;
let sbLoadedUserId: string | null = null;
let sbLoadToken = 0;

function sbSet(next: Snapshot) {
  sbSnapshot = next;
  sbListeners.forEach((l) => l());
}

function nombreDesdeCorreo(correo: string): string {
  const local = correo.split("@")[0] ?? "";
  return local ? local.charAt(0).toUpperCase() + local.slice(1) : "";
}

/**
 * Construye la `Session` de un usuario autenticado leyendo `perfiles`, la
 * empresa y la primera sucursal (RLS ya acota todo a su empresa). Cualquier
 * consulta que falle degrada a valores vacíos: mejor un avatar con iniciales
 * que bloquear el panel.
 */
async function sbBuildSession(user: User): Promise<Session> {
  const supabase = createClient();
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const metaStr = (k: string) => (typeof meta[k] === "string" ? (meta[k] as string).trim() : "");

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("nombre, apellido, email, empresa_id, rol")
    .eq("id", user.id)
    .maybeSingle();

  const empresaId = perfil?.empresa_id ?? null;

  const [empresaRes, sucursalRes] = await Promise.all([
    empresaId
      ? supabase.from("empresas").select("nombre").eq("id", empresaId).maybeSingle()
      : Promise.resolve({ data: null }),
    empresaId
      ? supabase
          .from("sucursales")
          .select("nombre")
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const correo = perfil?.email ?? user.email ?? "";
  const nombre = (perfil?.nombre ?? metaStr("nombre") ?? "").trim() || nombreDesdeCorreo(correo);
  const apellido = (perfil?.apellido ?? metaStr("apellido") ?? "").trim();

  return {
    nombre: [nombre, apellido].filter(Boolean).join(" "),
    correo,
    empresa: empresaRes.data?.nombre ?? metaStr("empresa"),
    sucursal: sucursalRes.data?.nombre ?? metaStr("sucursal"),
    foto: "",
  };
}

async function sbApplyUser(user: User | null, force = false) {
  if (!user) {
    sbLoadedUserId = null;
    sbLoadToken += 1;
    sbSet({ user: null, loaded: true });
    return;
  }
  if (!force && sbLoadedUserId === user.id && sbSnapshot.user) return;

  const token = ++sbLoadToken;
  // Publicamos de inmediato una sesión provisional con lo que ya sabemos del
  // usuario (metadata y correo): así el encabezado muestra a la persona
  // conectada aunque la carga del perfil tarde o falle.
  sbLoadedUserId = user.id;
  sbSet({ user: sbSessionProvisional(user), loaded: true });

  let session: Session;
  try {
    session = await sbBuildSession(user);
  } catch {
    return; // nos quedamos con la provisional
  }
  if (token !== sbLoadToken) return; // llegó una carga más reciente
  sbSet({ user: session, loaded: true });
}

/** Sesión mínima a partir de `auth.users` (sin consultar tablas). */
function sbSessionProvisional(user: User): Session {
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const metaStr = (k: string) => (typeof meta[k] === "string" ? (meta[k] as string).trim() : "");
  const correo = user.email ?? "";
  const nombre = metaStr("nombre") || nombreDesdeCorreo(correo);
  return {
    nombre: [nombre, metaStr("apellido")].filter(Boolean).join(" "),
    correo,
    empresa: metaStr("empresa"),
    sucursal: metaStr("sucursal"),
    foto: "",
  };
}

function sbStart() {
  if (sbStarted) return;
  sbStarted = true;
  const supabase = createClient();

  supabase.auth.onAuthStateChange((event, session) => {
    // `getUser()` de abajo cubre la sesión inicial; el resto de eventos se
    // procesan fuera del callback (recomendación de Supabase para evitar
    // bloqueos al llamar a otras funciones del cliente desde aquí).
    if (event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED") return;
    const user = session?.user ?? null;
    setTimeout(() => {
      void sbApplyUser(user, event === "USER_UPDATED");
    }, 0);
  });

  supabase.auth
    .getUser()
    .then(({ data }) => sbApplyUser(data.user))
    .catch(() => sbSet({ user: null, loaded: true }));
}

const supabaseStore: Store = {
  subscribe(onChange) {
    sbListeners.add(onChange);
    sbStart();
    return () => {
      sbListeners.delete(onChange);
    };
  },
  getSnapshot: () => sbSnapshot,
  // Con Supabase la sesión la crea `signInWithPassword`/`signUp`; esta
  // función solo pinta el usuario de inmediato mientras llega el perfil.
  signIn(user) {
    sbSet({ user, loaded: true });
  },
  async signOut() {
    const supabase = createClient();
    // Actualizamos primero para que la UI reaccione aunque la red tarde.
    sbLoadedUserId = null;
    sbLoadToken += 1;
    sbSet({ user: null, loaded: true });
    try {
      await supabase.auth.signOut();
    } catch {
      // Sin red: la cookie local ya se limpió en el cliente; el proxy volverá
      // a validar en la siguiente navegación.
    }
  },
};

/* -------------------------------------------------------------------------- */
/* API pública                                                                */
/* -------------------------------------------------------------------------- */

const store: Store = hasSupabaseEnv() ? supabaseStore : demoStore;

/** Guarda una sesión (demo: localStorage; Supabase: solo estado en memoria). */
export function signIn(user: Session) {
  store.signIn(user);
}

/** Cierra la sesión. Con Supabase llama a `auth.signOut()`; no navega. */
export function signOut(): Promise<void> {
  return store.signOut();
}

function subscribeNoop() {
  return () => {};
}

export function useSession(): {
  user: Session | null;
  ready: boolean;
  signIn: (user: Session) => void;
  signOut: () => Promise<void>;
} {
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, getServerSnapshot);
  // `hydrated` es false en el servidor y durante la hidratación, así el markup
  // inicial coincide (estado "sin sesión") y luego se actualiza en cliente.
  const hydrated = useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false,
  );
  const ready = hydrated && snapshot.loaded;

  const doSignIn = useCallback((next: Session) => signIn(next), []);
  const doSignOut = useCallback(() => signOut(), []);

  return {
    user: ready ? snapshot.user : null,
    ready,
    signIn: doSignIn,
    signOut: doSignOut,
  };
}
