"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type CostoExtraProps = {
  /** Horas que hoy se pagan al doble en la semana. */
  horasAlDoble: number;
  /** Costo por hora ordinaria, en MXN. */
  costoHora: number;
  /** Si es false, la cifra baja a cero. */
  activo: boolean;
  className?: string;
};

const mxn = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

/** Anima un número hacia su objetivo con easing suave. */
function useContador(objetivo: number, duracion = 1400) {
  const [valor, setValor] = useState(0);
  const desde = useRef(0);

  useEffect(() => {
    const reducido = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reducido) {
      setValor(objetivo);
      return;
    }
    const inicio = performance.now();
    const origen = desde.current;
    let raf = 0;
    const paso = (ahora: number) => {
      const t = Math.min(1, (ahora - inicio) / duracion);
      const ease = 1 - Math.pow(1 - t, 3);
      const actual = origen + (objetivo - origen) * ease;
      desde.current = actual;
      setValor(actual);
      if (t < 1) raf = requestAnimationFrame(paso);
    };
    raf = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(raf);
  }, [objetivo, duracion]);

  return valor;
}

/**
 * Costo humano de las horas que se pagan al doble: cada hora extra cuesta
 * dos veces la hora ordinaria, así que el gasto de la semana es
 * horas × costo por hora × 2.
 */
export function CostoExtra({
  horasAlDoble,
  costoHora,
  activo,
  className,
}: CostoExtraProps) {
  const semanal = horasAlDoble * costoHora * 2;
  const objetivo = activo ? semanal : 0;
  const valor = useContador(objetivo);
  const anual = semanal * 52;

  return (
    <div className={cn("flex flex-col gap-1", className)} aria-live="polite">
      <p className="text-neutral-400 text-xs uppercase tracking-wider">
        {activo ? "Costo extra de esta semana" : "Costo extra reacomodada"}
      </p>
      <p
        className={cn(
          "font-semibold text-4xl tabular-nums tracking-tight transition-colors duration-500 md:text-5xl",
          activo ? "text-rose-300" : "text-emerald-300",
        )}
      >
        {mxn.format(valor)}
        <span className="ml-2 font-normal text-base text-neutral-400">
          MXN
        </span>
      </p>
      <p className="text-neutral-500 text-xs">
        {horasAlDoble.toFixed(1)} h al doble × {mxn.format(costoHora)}/h ·
        estimado, ≈ {mxn.format(anual)} al año
      </p>
    </div>
  );
}
