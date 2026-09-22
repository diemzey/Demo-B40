"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { EstadoBadge, Persona, type JornadaPersona } from "@/components/ui/jornada-artefacto";
import { estadoDe } from "@/components/ui/jornada-artefacto-util";
import { cn } from "@/lib/utils";

/*
 * Quién cambia de horas con la propuesta: una fila por colaborador con la
 * barra doble (gris = hoy, ámbar = propuesta, sobre la misma escala y con la
 * marca del tope), el delta y el estado antes → después. Ordenada por |delta|;
 * las filas sin cambio van colapsadas. Sustituye a la gráfica de 72 barras.
 */

const fmtH = new Intl.NumberFormat("es-MX", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const fmtInt = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 0 });
const horas = (h: number) => `${fmtH.format(h)} h`;
const conSigno = (v: number) => (v < 0 ? `−${horas(-v)}` : v > 0 ? `+${horas(v)}` : horas(0));

type Fila = JornadaPersona & { delta: number };

function BarraDoble({ hoy, propuesta, tope, escala }: { hoy: number; propuesta: number; tope: number; escala: number }) {
  const pct = (h: number) => `${Math.min(100, (h / escala) * 100).toFixed(2)}%`;
  return (
    <div
      role="img"
      aria-label={`Hoy ${horas(hoy)}, con la propuesta ${horas(propuesta)}; tope ${tope} h`}
      className="relative flex w-full flex-col gap-0.5 py-1"
    >
      <div className="h-1 w-full rounded-full bg-muted">
        <div className="h-full rounded-full bg-muted-foreground/60" style={{ width: pct(hoy) }} />
      </div>
      <div className="h-1 w-full rounded-full bg-muted">
        <div className="h-full rounded-full bg-amber-400" style={{ width: pct(propuesta) }} />
      </div>
      <span className="absolute inset-y-0 w-px bg-amber-500/80" style={{ left: pct(tope) }} aria-hidden="true" />
    </div>
  );
}

function FilaPersona({ p, tope, escala, compacta = false }: { p: Fila; tope: number; escala: number; compacta?: boolean }) {
  const antes = estadoDe(p.hoy, tope);
  const despues = estadoDe(p.reacomodada, tope);
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 px-4 py-2 sm:grid-cols-[minmax(0,1.3fr)_minmax(7rem,1fr)_5.5rem_auto]">
      <Persona nombre={p.nombre} foto={p.foto} detalle={p.detalle} />
      <div className="col-span-2 sm:col-span-1 sm:col-start-2">
        <BarraDoble hoy={p.hoy} propuesta={p.reacomodada} tope={tope} escala={escala} />
      </div>
      <div className="col-start-2 row-start-1 text-right sm:col-start-3 sm:row-start-auto">
        <p
          className={cn(
            "text-sm font-semibold tabular-nums",
            p.delta < 0 ? "text-destructive" : p.delta > 0 ? "text-emerald-400" : "text-muted-foreground",
          )}
        >
          {conSigno(p.delta)}
        </p>
        <p className="j40-muted tabular-nums">
          {fmtH.format(p.hoy)} → {fmtH.format(p.reacomodada)}
        </p>
      </div>
      {!compacta && (
        <div className="hidden items-center justify-end gap-1.5 sm:flex">
          <EstadoBadge estado={antes} />
          <span className="text-muted-foreground" aria-hidden="true">
            →
          </span>
          <EstadoBadge estado={despues} />
          <span className="sr-only">
            antes {antes}, después {despues}
          </span>
        </div>
      )}
    </li>
  );
}

export function DeltasPersona({
  personas,
  tope,
  escala = 52,
  inicial = 12,
  className,
}: {
  personas: JornadaPersona[];
  tope: number;
  /** Máximo de la escala de la barra, en horas. */
  escala?: number;
  /** Filas con cambio visibles antes de "Ver N más". */
  inicial?: number;
  className?: string;
}) {
  const [todas, setTodas] = useState(false);
  const filas: Fila[] = personas
    .map((p) => ({ ...p, delta: Math.round((p.reacomodada - p.hoy) * 10) / 10 }))
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta) || a.nombre.localeCompare(b.nombre, "es"));
  const conCambio = filas.filter((f) => f.delta !== 0);
  const sinCambio = filas.filter((f) => f.delta === 0);
  const bajan = conCambio.filter((f) => f.delta < 0).length;
  const suben = conCambio.filter((f) => f.delta > 0).length;
  const quedanFuera = filas.filter((f) => f.reacomodada > tope).length;
  const escalaReal = Math.max(escala, ...filas.map((f) => Math.max(f.hoy, f.reacomodada)));
  const visibles = todas ? conCambio : conCambio.slice(0, inicial);
  const ocultas = conCambio.length - visibles.length;

  return (
    <section
      aria-label="Quién cambia de horas"
      className={cn("rounded-lg border border-border bg-card shadow-lg shadow-black/5", className)}
    >
      <div className="flex flex-col gap-1 p-4 pb-2 sm:flex-row sm:items-baseline sm:justify-between">
        <h2 className="j40-body font-semibold">Quién cambia de horas</h2>
        <p className="text-xs text-muted-foreground">
          {fmtInt.format(bajan)} {bajan === 1 ? "baja" : "bajan"} a {tope} h · {fmtInt.format(suben)}{" "}
          {suben === 1 ? "recibe" : "reciben"} horas · {fmtInt.format(sinCambio.length)} igual
          {quedanFuera > 0 && (
            <>
              {" "}
              · <span className="text-destructive">{fmtInt.format(quedanFuera)} fuera del tope</span>
            </>
          )}
        </p>
      </div>
      <div className="hidden grid-cols-[minmax(0,1.3fr)_minmax(7rem,1fr)_5.5rem_auto] gap-x-3 px-4 j40-eyebrow pb-1 sm:grid">
        <span>Colaborador</span>
        <span className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1">
            <span aria-hidden="true" className="inline-block h-1 w-3 rounded-full bg-muted-foreground/60" /> hoy
          </span>
          <span className="inline-flex items-center gap-1">
            <span aria-hidden="true" className="inline-block h-1 w-3 rounded-full bg-amber-400" /> propuesta
          </span>
        </span>
        <span className="text-right">Cambio</span>
        <span className="text-right">Estado</span>
      </div>
      {conCambio.length === 0 ? (
        <p className="j40-body px-4 pb-4 text-muted-foreground">Nadie cambia de horas con la propuesta.</p>
      ) : (
        <ol className="divide-y divide-border/60 border-t border-border/60">
          {visibles.map((p) => (
            <FilaPersona key={p.nombre} p={p} tope={tope} escala={escalaReal} />
          ))}
        </ol>
      )}
      {ocultas > 0 && (
        <div className="border-t border-border/60 px-4 py-2">
          <button
            type="button"
            onClick={() => setTodas(true)}
            className="inline-flex h-9 items-center gap-1.5 j40-body rounded-md px-2 font-medium text-amber-400 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          >
            Ver {fmtInt.format(ocultas)} más
            <ChevronDown className="size-4" strokeWidth={1.5} aria-hidden="true" />
          </button>
        </div>
      )}
      {sinCambio.length > 0 && (
        <Collapsible>
          <div className="border-t border-border/60 px-4 py-2">
            <CollapsibleTrigger className="group inline-flex h-9 items-center gap-1.5 j40-body rounded-md px-2 font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40">
              {fmtInt.format(sinCambio.length)} sin cambios
              <ChevronDown
                className="size-4 transition-transform group-data-[state=open]:rotate-180"
                strokeWidth={1.5}
                aria-hidden="true"
              />
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent>
            <ol className="divide-y divide-border/60 border-t border-border/60">
              {sinCambio.map((p) => (
                <FilaPersona key={p.nombre} p={p} tope={tope} escala={escalaReal} compacta />
              ))}
            </ol>
          </CollapsibleContent>
        </Collapsible>
      )}
    </section>
  );
}
