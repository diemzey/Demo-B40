"use client";

import { cn } from "@/lib/utils";
import { useContador } from "@/lib/use-contador";

export type CostoExtraProps = {
  /** Horas que se pagan al doble en la semana con la programación actual. */
  horasAlDoble: number;
  /** Colaboradores que exceden el tope con la programación actual. */
  fueraDeNorma: number;
  /** Costo semanal de esas horas al doble, en MXN. */
  costoDoblesSemanal: number;
  /** Ahorro semanal de la propuesta frente a la programación actual, en MXN. */
  ahorroSemanal: number;
  /** Ahorro como % del costo laboral semanal. */
  ahorroPct: number;
  /** % de intervalos pico cubiertos antes y después. */
  coberturaPicoAntes: number;
  coberturaPicoDespues: number;
  /** Tope semanal con el que se programó. */
  tope: number;
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
 * Cifra grande del hero: lo que cuesta al mes pagar al doble las horas arriba
 * del tope con la programación actual (semana × 52 / 12). En la vista
 * reacomodada baja a cero y se muestra el ahorro semanal real que calculó el
 * motor de programación sobre la misma plantilla.
 */
export function CostoExtra({
  horasAlDoble,
  fueraDeNorma,
  costoDoblesSemanal,
  ahorroSemanal,
  ahorroPct,
  coberturaPicoAntes,
  coberturaPicoDespues,
  tope,
  activo,
  className,
}: CostoExtraProps) {
  const mensual = costoDoblesSemanal * SEMANAS_POR_MES;
  const anual = costoDoblesSemanal * 52;
  const ahorroAnual = ahorroSemanal * 52;
  const objetivo = activo ? mensual : 0;
  // Arranca en cero para que la primera vista cuente hacia arriba.
  const valor = useContador(objetivo, 1400, 0);

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
            Con tope de {tope} h: {horasAlDoble.toFixed(0)} h al doble por semana
            ({fueraDeNorma} colaboradores de 48 h), {mxn.format(costoDoblesSemanal)} a la
            semana · {mxn.format(anual)} al año. Y aun así cubres sólo el{" "}
            {coberturaPicoAntes.toFixed(0)} % de las horas pico.
          </>
        ) : (
          <>
            Misma plantilla, turnos programados contra la demanda: ahorras{" "}
            {mxn.format(ahorroSemanal)} a la semana ({ahorroPct.toFixed(0)} % del costo
            laboral, {mxn.format(ahorroAnual)} al año) y cubres el{" "}
            {coberturaPicoDespues.toFixed(0)} % de las horas pico.
          </>
        )}
      </p>
    </div>
  );
}
