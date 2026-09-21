"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/cnippet-table";

export type JornadaPersona = {
  nombre: string;
  foto: string;
  hoy: number;
  reacomodada: number;
};

export type JornadaResumen = {
  horasAlDoble: number;
  fueraDeNorma: number;
};

export type JornadaArtefactoProps = React.ComponentProps<"div"> & {
  tope: number;
  /** Máximo de la escala de la barra, en horas. */
  escala?: number;
  personas: JornadaPersona[];
  colaboradores: number;
  antes: JornadaResumen;
  despues: JornadaResumen;
  /** Milisegundos que se muestra cada estado antes de cambiar. */
  intervalo?: number;
  /** Modo controlado: fase y barrido los aporta el padre. */
  fase?: Fase;
  barriendo?: boolean;
};

export type { Fase as JornadaFase };

type Fase = "antes" | "despues";
type Estado = "excede" | "limite" | "cumple";

const SHIMMER_MS = 1200;

function estadoDe(horas: number, tope: number): Estado {
  if (horas > tope) return "excede";
  if (horas === tope) return "limite";
  return "cumple";
}

const badgeStyles: Record<Estado, string> = {
  excede: "border-transparent bg-destructive/15 text-destructive",
  limite:
    "border-transparent bg-amber-500/15 text-amber-600 dark:text-amber-400",
  cumple:
    "border-transparent bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
};

const badgeLabel: Record<Estado, string> = {
  excede: "Excede",
  limite: "En el tope",
  cumple: "Cumple",
};

const fmt = (h: number) => `${h.toFixed(1)} h`;

function Badge({ estado }: { estado: Estado }) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-md border px-2 py-0.5 font-medium text-xs transition-colors duration-500",
        badgeStyles[estado],
      )}
    >
      {badgeLabel[estado]}
    </span>
  );
}

function Persona({ nombre, foto }: Pick<JornadaPersona, "nombre" | "foto">) {
  return (
    <div className="flex items-center gap-2.5">
      {/* Retratos estáticos de /public, 72px para 36px @2x. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        alt=""
        className="size-8 shrink-0 rounded-full object-cover ring-1 ring-border"
        decoding="async"
        height={36}
        loading="lazy"
        src={foto}
        width={36}
      />
      <span className="font-medium text-sm">{nombre}</span>
    </div>
  );
}

function Barra({
  horas,
  tope,
  escala,
}: {
  horas: number;
  tope: number;
  escala: number;
}) {
  const estado = estadoDe(horas, tope);
  const pct = (h: number) => `${((h / escala) * 100).toFixed(3)}%`;
  return (
    <div className="flex items-center gap-2">
      <div
        className="relative h-1.5 w-20 rounded-full bg-muted"
        role="img"
        aria-label={`${fmt(horas)} de ${tope} h`}
      >
        <div
          className={cn(
            "h-full rounded-full transition-[width,background-color] duration-700 ease-out",
            estado === "excede" ? "bg-destructive" : "bg-primary",
          )}
          style={{ width: pct(horas) }}
        />
        <span
          className="absolute -inset-y-0.5 w-px bg-amber-500"
          style={{ left: pct(tope) }}
          aria-hidden="true"
        />
      </div>
      <span
        className={cn(
          "w-12 text-right text-xs tabular-nums transition-colors duration-500",
          estado === "excede"
            ? "text-destructive"
            : estado === "limite"
              ? "text-amber-600 dark:text-amber-400"
              : "text-muted-foreground",
        )}
      >
        {fmt(horas)}
      </span>
    </div>
  );
}

/**
 * Alterna entre el estado actual y el reacomodado: un destello recorre la
 * tabla y, a mitad del barrido, las barras y cifras pasan al otro estado.
 */
export function useFaseCiclica(intervalo: number) {
  const [fase, setFase] = useState<Fase>("antes");
  const [barriendo, setBarriendo] = useState(false);

  useEffect(() => {
    if (intervalo <= 0) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setFase("despues");
      return;
    }
    let cancelado = false;
    const timers: number[] = [];
    const ciclo = () => {
      timers.push(
        window.setTimeout(() => {
          if (cancelado) return;
          setBarriendo(true);
          timers.push(
            window.setTimeout(() => {
              if (cancelado) return;
              setFase((f) => (f === "antes" ? "despues" : "antes"));
            }, SHIMMER_MS / 2),
          );
          timers.push(
            window.setTimeout(() => {
              if (cancelado) return;
              setBarriendo(false);
              ciclo();
            }, SHIMMER_MS),
          );
        }, intervalo),
      );
    };
    ciclo();
    return () => {
      cancelado = true;
      timers.forEach(window.clearTimeout);
    };
  }, [intervalo]);

  return { fase, barriendo };
}

export function JornadaArtefacto({
  tope,
  escala = 52,
  personas,
  colaboradores,
  antes,
  despues,
  intervalo = 3500,
  fase: faseControlada,
  barriendo: barridoControlado,
  className,
  ...props
}: JornadaArtefactoProps) {
  const interno = useFaseCiclica(faseControlada === undefined ? intervalo : 0);
  const fase = faseControlada ?? interno.fase;
  const barriendo = barridoControlado ?? interno.barriendo;
  const optimizada = fase === "despues";
  const resumen = optimizada ? despues : antes;
  const alerta = resumen.horasAlDoble > 0 || resumen.fueraDeNorma > 0;

  return (
    <div
      className={cn(
        "min-w-0 rounded-2xl border bg-card p-5 text-card-foreground shadow-lg",
        barriendo && "j40-shimmer",
        className,
      )}
      aria-live="polite"
      {...props}
    >
      <div className="mb-3 flex items-baseline justify-between px-2.5">
        <span className="font-semibold text-sm uppercase tracking-wider">
          {optimizada ? "Después" : "Antes"}
        </span>
        <span className="text-muted-foreground text-xs">
          {optimizada ? "reacomodada, mismos contratos" : "como está hoy"}
        </span>
      </div>
      {/* El contenedor propio de Table hace el scroll, así la cabecera sticky sí se ancla. */}
      <div className="relative [&_[data-slot=table-container]]:max-h-[27rem] [&_[data-slot=table-container]]:overflow-y-auto [&_[data-slot=table-container]]:overscroll-contain [&_[data-slot=table-container]]:[scrollbar-width:thin]">
      <Table>
        <TableHeader className="sticky top-0 z-10 bg-card">
          <TableRow>
            <TableHead>Colaborador</TableHead>
            <TableHead>Horas</TableHead>
            <TableHead className="text-right">Estado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {personas.map((p) => {
            const horas = optimizada ? p.reacomodada : p.hoy;
            return (
              <TableRow key={p.nombre}>
                <TableCell>
                  <Persona nombre={p.nombre} foto={p.foto} />
                </TableCell>
                <TableCell>
                  <Barra horas={horas} tope={tope} escala={escala} />
                </TableCell>
                <TableCell className="text-right">
                  <Badge estado={estadoDe(horas, tope)} />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
        {/* Degradado que insinúa que hay más filas */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-card to-transparent"
          aria-hidden="true"
        />
      </div>
      <p className="mt-2 px-2.5 text-muted-foreground text-xs">
        {personas.length} colaboradores · desplázate para ver toda la plantilla
      </p>
      <Table>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={3} className="py-4">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wider">
                    Horas al doble
                  </p>
                  <p
                    className={cn(
                      "mt-1 font-semibold text-2xl tabular-nums transition-colors duration-500 md:text-3xl",
                      alerta && "text-destructive",
                    )}
                  >
                    {fmt(resumen.horasAlDoble)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wider">
                    Fuera de norma
                  </p>
                  <p
                    className={cn(
                      "mt-1 font-semibold text-2xl tabular-nums transition-colors duration-500 md:text-3xl",
                      alerta && "text-destructive",
                    )}
                  >
                    {resumen.fueraDeNorma}
                    <span className="ml-1 font-normal text-muted-foreground text-base">
                      de {colaboradores}
                    </span>
                  </p>
                </div>
              </div>
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  );
}
