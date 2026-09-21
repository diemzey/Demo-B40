"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type CostoExtraProps = {
  /** Horas que hoy se pagan al doble en la semana, con el tope vigente. */
  horasAlDoble: number;
  /** Horas que se pagarían al doble en 2030 (tope de 40 h) con los turnos de hoy. */
  horasAlDoble2030: number;
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
      raf.current = requestAnimationFrame(() => setValor(objetivo));
      return () => cancelAnimationFrame(raf.current);
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
 * dos veces la hora ordinaria. La cifra principal proyecta el escenario de
 * 2030 (tope de 40 h) con los turnos de hoy, en mensual (semana × 52 / 12);
 * en la vista reacomodada baja a cero y se recuerda lo que costaría no hacerlo.
 */
export function CostoExtra({
  horasAlDoble,
  horasAlDoble2030,
  costoHora,
  activo,
  className,
}: CostoExtraProps) {
  const semanal = horasAlDoble2030 * costoHora * 2;
  const mensual = semanal * SEMANAS_POR_MES;
  const anual = semanal * 52;
  const mensualHoy = horasAlDoble * costoHora * 2 * SEMANAS_POR_MES;
  const objetivo = activo ? mensual : 0;
  const valor = useContador(objetivo, activo ? "antes" : "despues");

  return (
    <div className={cn("flex flex-col gap-1", className)} aria-live="polite">
      <p className="text-neutral-400 text-xs uppercase tracking-wider">
        {activo
          ? "Sin Jornada40, en 2030 pagarías al mes"
          : "Con Jornada40, en 2030 pagarías al mes"}
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
        {activo ? (
          <>
            Hoy, con tope de 46 h: {horasAlDoble.toFixed(1)} h al doble por
            semana, {mxn.format(mensualHoy)} al mes. En 2030, con tope de 40 h:{" "}
            {horasAlDoble2030.toFixed(1)} h × {mxn.format(costoHora)}/h × 2 ·{" "}
            {mxn.format(anual)} al año.
          </>
        ) : (
          <>
            Mismos contratos, turnos reacomodados. Sin reacomodar serían{" "}
            {mxn.format(mensual)} al mes, {mxn.format(anual)} al año.
          </>
        )}
      </p>
    </div>
  );
}
