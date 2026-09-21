"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type CostoExtraProps = {
  /** Horas que hoy se pagan al doble en la semana. */
  horasAlDoble: number;
  /** Costo por hora ordinaria, en MXN. */
  costoHora: number;
  /** true: costo extra (antes). false: ahorro con la semana reacomodada. */
  activo: boolean;
  className?: string;
};

const SEMANAS_POR_MES = 52 / 12;

const mxn = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

/**
 * Anima un número de 0 a su objetivo con easing suave. Cambiar `reinicio`
 * vuelve a empezar la cuenta desde cero.
 */
function useContador(objetivo: number, reinicio: string, duracion = 1400) {
  const [valor, setValor] = useState(0);
  const raf = useRef(0);

  useEffect(() => {
    const reducido = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reducido) {
      setValor(objetivo);
      return;
    }
    const inicio = performance.now();
    const paso = (ahora: number) => {
      const t = Math.min(1, (ahora - inicio) / duracion);
      const ease = 1 - Math.pow(1 - t, 3);
      setValor(objetivo * ease);
      if (t < 1) raf.current = requestAnimationFrame(paso);
    };
    raf.current = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(raf.current);
  }, [objetivo, reinicio, duracion]);

  return valor;
}

/**
 * Costo humano de las horas que se pagan al doble: cada hora extra cuesta
 * dos veces la hora ordinaria. La cifra principal es mensual
 * (semana × 52 / 12); en la vista reacomodada el mismo monto se muestra
 * como ahorro, porque esas horas dejan de pagarse al doble.
 */
export function CostoExtra({
  horasAlDoble,
  costoHora,
  activo,
  className,
}: CostoExtraProps) {
  const semanal = horasAlDoble * costoHora * 2;
  const mensual = semanal * SEMANAS_POR_MES;
  const anual = semanal * 52;
  const valor = useContador(mensual, activo ? "antes" : "despues");

  return (
    <div className={cn("flex flex-col gap-1", className)} aria-live="polite">
      <p className="text-neutral-400 text-xs uppercase tracking-wider">
        {activo ? "Costo extra al mes" : "Ahorro al mes, reacomodada"}
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
        {horasAlDoble.toFixed(1)} h al doble por semana × {mxn.format(costoHora)}
        /h · ≈ {mxn.format(semanal)} a la semana, {mxn.format(anual)} al año
      </p>
    </div>
  );
}
