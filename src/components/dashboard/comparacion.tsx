"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { useContador } from "@/lib/use-contador";
import { cn } from "@/lib/utils";

/*
 * El centro "Antes / Después" del panel: un solo número héroe (el ahorro, en
 * verde, con contador) y debajo la comparación Hoy → Propuesta en dos
 * columnas con las mismas filas. Ninguna cifra se calcula aquí: la página
 * (o la pestaña) trae los textos ya formateados desde Postgres.
 */

const fmtMXN = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});
/** Cómo se lee cada lado: la columna Hoy sólo se pinta en rojo donde duele. */
export type TonoHoy = "neutral" | "duele";
/** La columna Propuesta: verde cuando mejora, ámbar cuando empeora, rojo cuando duele. */
export type TonoPropuesta = "neutral" | "mejora" | "atencion" | "duele";

export type FilaComparacion = {
  etiqueta: string;
  hoy: string;
  propuesta: string;
  tonoHoy?: TonoHoy;
  tonoPropuesta?: TonoPropuesta;
};

const TONO_HOY: Record<TonoHoy, string> = {
  neutral: "text-muted-foreground",
  duele: "text-destructive",
};
const TONO_PROPUESTA: Record<TonoPropuesta, string> = {
  neutral: "text-foreground",
  mejora: "text-emerald-400",
  atencion: "text-amber-400",
  duele: "text-destructive",
};

/** Línea terciaria bajo la comparación; `clave` es estable para React (no el índice). */
export type NotaComparacion = { clave: string; texto: ReactNode };

export type ComparacionProps = {
  /** Cifra héroe (MXN). Negativa = la propuesta cuesta más. */
  ahorroMxn: number;
  /** Texto bajo el héroe ("13.5 % del costo laboral · ≈ $1.4 M al año"). */
  detalle: ReactNode;
  /** Etiqueta del héroe; por defecto "Ahorro con la propuesta". */
  titulo?: string;
  /** Sufijo pequeño junto al número ("/semana"). */
  sufijo?: string;
  filas: FilaComparacion[];
  /** Líneas terciarias bajo la comparación (vacantes, déficit en picos…). */
  notas?: NotaComparacion[];
  /** Nombre de la columna derecha; por defecto "Propuesta". */
  etiquetaPropuesta?: string;
  className?: string;
};

export function Comparacion({
  ahorroMxn,
  detalle,
  titulo = "Ahorro con la propuesta",
  sufijo,
  filas,
  notas = [],
  etiquetaPropuesta = "Propuesta",
  className,
}: ComparacionProps) {
  const positivo = ahorroMxn >= 0;
  const valor = useContador(Math.abs(ahorroMxn), 1400, 0);
  return (
    <section
      aria-label={titulo}
      className={cn(
        "flex flex-col rounded-lg border border-emerald-500/30 bg-card p-4 shadow-lg shadow-black/5 md:p-5",
        className,
      )}
    >
      <p className="j40-eyebrow">{titulo}</p>
      <p
        className={cn(
          "mt-1 text-4xl font-semibold tracking-tight tabular-nums md:text-5xl",
          positivo ? "text-emerald-400" : "text-destructive",
        )}
      >
        <span className="sr-only">
          {positivo ? "" : "−"}
          {fmtMXN.format(Math.abs(ahorroMxn))}
        </span>
        <span aria-hidden="true">
          {positivo ? "" : "−"}
          {fmtMXN.format(Math.round(valor))}
        </span>
        {sufijo && <span className="ml-1.5 text-base font-medium text-muted-foreground">{sufijo}</span>}
      </p>
      <p className="j40-body mt-1 text-muted-foreground">{detalle}</p>

      <dl className="mt-5 flex flex-col divide-y divide-border/60 border-t border-border/60">
        <div
          aria-hidden="true"
          className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gap-x-2 j40-eyebrow pt-2 sm:grid-cols-[minmax(6rem,auto)_minmax(0,1fr)_auto_minmax(0,1fr)]"
        >
          <span className="hidden sm:block" />
          <span>Hoy</span>
          <span className="w-4" />
          <span>{etiquetaPropuesta}</span>
        </div>
        {filas.map((f) => (
          <div
            key={f.etiqueta}
            className="grid grid-cols-[auto_auto_auto] items-baseline justify-start gap-x-3 py-2 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto]"
          >
            <dt className="col-span-3 text-xs text-muted-foreground sm:col-span-1 sm:pr-3 sm:truncate">{f.etiqueta}</dt>
            <dd className={cn("whitespace-nowrap text-base font-semibold leading-tight tabular-nums md:text-lg", TONO_HOY[f.tonoHoy ?? "neutral"])}>
              {f.hoy}
            </dd>
            <dd className="self-center">
              <ArrowRight className="size-4 text-muted-foreground" strokeWidth={1.5} aria-hidden="true" />
              <span className="sr-only">pasa a</span>
            </dd>
            <dd
              className={cn(
                "whitespace-nowrap text-base font-semibold leading-tight tabular-nums md:text-lg",
                TONO_PROPUESTA[f.tonoPropuesta ?? "neutral"],
              )}
            >
              {f.propuesta}
            </dd>
          </div>
        ))}
      </dl>
      {notas.length > 0 && (
        <ul className="j40-body mt-3 flex flex-col gap-0.5 text-muted-foreground">
          {notas.map((n) => (
            <li key={n.clave}>{n.texto}</li>
          ))}
        </ul>
      )}
    </section>
  );
}

/**
 * Un solo barrido del destello (`j40-shimmer`) sobre sus hijos al montar,
 * cuando la propuesta se publicó hace menos de `ventanaMs`: el momento "wow"
 * al ver una propuesta recién publicada. Sin ciclo automático: después el
 * gerente lee cifras quietas.
 */
export function BarridoInicial({
  publicadoEn,
  ventanaMs = 60_000,
  className,
  children,
}: {
  /** `escenarios.publicado_en` (ISO 8601); null = sin barrido. */
  publicadoEn: string | null;
  ventanaMs?: number;
  className?: string;
  children: ReactNode;
}) {
  const [barriendo, setBarriendo] = useState(false);
  useEffect(() => {
    if (publicadoEn === null) return;
    const hace = Date.now() - Date.parse(publicadoEn);
    if (!Number.isFinite(hace) || hace > ventanaMs) return;
    const encender = window.setTimeout(() => setBarriendo(true), 250);
    const apagar = window.setTimeout(() => setBarriendo(false), 1600);
    return () => {
      window.clearTimeout(encender);
      window.clearTimeout(apagar);
    };
  }, [publicadoEn, ventanaMs]);
  return <div className={cn("rounded-lg", barriendo && "j40-shimmer", className)}>{children}</div>;
}
