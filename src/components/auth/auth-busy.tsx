"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { cn } from "@/lib/utils";

/**
 * Estado "ocupado" compartido entre los formularios de acceso y el marco
 * `AuthShell`: mientras un formulario espera respuesta, el panel amarillo
 * muestra una barra de progreso discreta en su borde superior.
 *
 * `AuthShell` es un server component, así que el proveedor y la barra viven
 * aquí como client components pequeños que él compone.
 */
type AuthBusyContextValue = {
  busy: boolean;
  setBusy: (busy: boolean) => void;
};

const AuthBusyContext = createContext<AuthBusyContextValue | null>(null);

export function AuthBusyProvider({ children }: { children: ReactNode }) {
  const [busy, setBusyState] = useState(false);
  const setBusy = useCallback((next: boolean) => setBusyState(next), []);
  const value = useMemo(() => ({ busy, setBusy }), [busy, setBusy]);
  return <AuthBusyContext.Provider value={value}>{children}</AuthBusyContext.Provider>;
}

const NOOP: AuthBusyContextValue = { busy: false, setBusy: () => {} };

/** Lee/escribe el estado ocupado. Fuera de un `AuthBusyProvider` no hace nada. */
export function useAuthBusy(): AuthBusyContextValue {
  return useContext(AuthBusyContext) ?? NOOP;
}

/**
 * Sincroniza el estado `pending` de un formulario con el proveedor y lo
 * limpia al desmontar (por ejemplo, al navegar al panel a media petición).
 */
export function useReportBusy(pending: boolean) {
  const { setBusy } = useAuthBusy();
  useEffect(() => {
    setBusy(pending);
    return () => setBusy(false);
  }, [pending, setBusy]);
}

type Fase = "idle" | "cargando" | "fin";

/**
 * Barra de progreso indeterminada al estilo "nprogress", hecha solo con
 * transiciones (sin keyframes): al empezar avanza lentamente hasta ~85 %, al
 * terminar completa el ancho y se desvanece. Con `prefers-reduced-motion`
 * no hay transición: la barra simplemente aparece y desaparece.
 */
export function AuthBusyBar({ className }: { className?: string }) {
  const { busy } = useAuthBusy();
  // `cerrando` se enciende en el render en que `busy` pasa de true a false
  // (patrón "ajustar estado al cambiar una prop") y se apaga con un temporizador.
  const [prevBusy, setPrevBusy] = useState(busy);
  const [cerrando, setCerrando] = useState(false);
  if (busy !== prevBusy) {
    setPrevBusy(busy);
    if (!busy) setCerrando(true);
  }

  useEffect(() => {
    if (!cerrando) return;
    const t = setTimeout(() => setCerrando(false), 450);
    return () => clearTimeout(t);
  }, [cerrando]);

  const fase: Fase = busy ? "cargando" : cerrando ? "fin" : "idle";

  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-x-0 top-0 h-0.5 overflow-hidden",
        className,
      )}
    >
      <div
        className={cn(
          "h-full origin-left bg-neutral-950/70 motion-reduce:transition-none",
          fase === "idle" && "w-0 opacity-0 transition-none",
          fase === "cargando" &&
            "w-[85%] opacity-100 transition-[width,opacity] duration-[6000ms] ease-out",
          fase === "fin" && "w-full opacity-0 transition-[width,opacity] duration-300 ease-out",
        )}
      />
    </div>
  );
}
