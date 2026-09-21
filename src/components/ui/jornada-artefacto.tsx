"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useContador } from "@/lib/use-contador";
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
  /** Ruta del retrato; vacío muestra iniciales. */
  foto: string;
  /** Línea secundaria opcional (puesto, contrato...). */
  detalle?: string;
  hoy: number;
  reacomodada: number;
};

export type JornadaResumen = {
  horasAlDoble: number;
  fueraDeNorma: number;
  /** Exceso que el reacomodo sí repartió entre la plantilla (sólo en "Después"). */
  horasAbsorbidas?: number;
  /** Exceso que no cupo en la plantilla; definido sólo en el resumen "Después". */
  horasSinCubrir?: number;
  /** Vacantes sugeridas: ⌈horasSinCubrir / tope⌉. */
  vacantes?: number;
};

export type JornadaArtefactoProps = React.ComponentProps<"div"> & {
  tope: number;
  /** Máximo de la escala de la barra, en horas. */
  escala?: number;
  personas: JornadaPersona[];
  colaboradores: number;
  antes: JornadaResumen;
  despues: JornadaResumen;
  /** Resumen con el tope de 2030 (40 h) y los turnos de hoy; se muestra en "Antes". */
  antes2030?: JornadaResumen;
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

export type { Estado as JornadaEstado };

export function estadoDe(horas: number, tope: number): Estado {
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

function iniciales(nombre: string) {
  return nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function EstadoBadge({ estado }: { estado: Estado }) {
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

export function Persona({
  nombre,
  foto,
  detalle,
}: Pick<JornadaPersona, "nombre" | "foto" | "detalle">) {
  return (
    <div className="flex items-center gap-2.5">
      {foto ? (
        // Retratos estáticos de /public, 72px para 36px @2x.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt=""
          className="size-8 shrink-0 rounded-full object-cover ring-1 ring-border"
          decoding="async"
          height={36}
          loading="lazy"
          src={foto}
          width={36}
        />
      ) : (
        <span
          className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted font-medium text-[11px] text-muted-foreground ring-1 ring-border"
          aria-hidden="true"
        >
          {iniciales(nombre)}
        </span>
      )}
      <span className="min-w-0">
        <span className="block truncate font-medium text-sm">{nombre}</span>
        {detalle && (
          <span className="block truncate text-[11px] text-muted-foreground">
            {detalle}
          </span>
        )}
      </span>
    </div>
  );
}

export function Barra({
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
      const raf = requestAnimationFrame(() => setFase("despues"));
      return () => cancelAnimationFrame(raf);
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

export type JornadaTablaProps = {
  personas: JornadaPersona[];
  clave: "hoy" | "reacomodada";
  tope: number;
  escala?: number;
  /** Altura máxima del área con scroll (valor CSS, p. ej. "27rem"). */
  maxAltura?: string;
  /** Altura máxima a partir de md; por defecto la misma. */
  maxAlturaMd?: string;
  /** Texto bajo la tabla; null lo oculta. */
  nota?: React.ReactNode | null;
  /** Contenido extra a la derecha del badge de estado. */
  accion?: (persona: JornadaPersona) => React.ReactNode;
  /** Mensaje cuando no hay filas. */
  vacio?: React.ReactNode;
};

/** La tabla de la portada, reutilizable: cabecera fija, scroll interno y degradado. */
export function JornadaTabla({
  personas,
  clave,
  tope,
  escala = 52,
  maxAltura = "27rem",
  maxAlturaMd = maxAltura,
  nota,
  accion,
  vacio,
}: JornadaTablaProps) {
  const notaFinal =
    nota === undefined
      ? `${personas.length} colaboradores · desplázate para ver toda la plantilla`
      : nota;
  // Si alguien recibe horas en el reacomodo se reserva un hueco fijo para el
  // delta (en ambos estados), así la columna no cambia de ancho al alternar.
  const conDelta = personas.some((p) => p.reacomodada > p.hoy);
  return (
    <>
      {/* El contenedor propio de Table hace el scroll, así la cabecera sticky sí se ancla. */}
      <div
        className="@container relative [&_[data-slot=table-container]]:max-h-[var(--tabla-max)] [&_[data-slot=table-container]]:overflow-y-auto [&_[data-slot=table-container]]:overscroll-contain [&_[data-slot=table-container]]:[scrollbar-width:thin] md:[&_[data-slot=table-container]]:max-h-[var(--tabla-max-md)]"
        style={
          {
            "--tabla-max": maxAltura,
            "--tabla-max-md": maxAlturaMd,
          } as React.CSSProperties
        }
      >
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
              const horas = p[clave];
              const delta = clave === "reacomodada" ? p.reacomodada - p.hoy : 0;
              return (
                <TableRow key={p.nombre}>
                  <TableCell>
                    <Persona nombre={p.nombre} foto={p.foto} detalle={p.detalle} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Barra horas={horas} tope={tope} escala={escala} />
                      {conDelta && (
                        <span
                          className={cn(
                            "hidden w-11 text-[11px] text-muted-foreground tabular-nums transition-opacity duration-500 @md:inline-block",
                            delta > 0 ? "opacity-100" : "opacity-0",
                          )}
                          aria-hidden={delta <= 0}
                        >
                          {delta > 0 && `+${fmt(delta)}`}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="inline-flex items-center justify-end gap-1.5">
                      <EstadoBadge estado={estadoDe(horas, tope)} />
                      {accion?.(p)}
                    </span>
                  </TableCell>
                </TableRow>
              );
            })}
            {personas.length === 0 && vacio && (
              <TableRow>
                <TableCell colSpan={3} className="py-8 text-center text-muted-foreground text-xs">
                  {vacio}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        {/* Degradado que insinúa que hay más filas */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-card to-transparent"
          aria-hidden="true"
        />
      </div>
      {notaFinal && (
        <p className="mt-2 px-2.5 text-muted-foreground text-xs">{notaFinal}</p>
      )}
    </>
  );
}

/**
 * Pie de totales de la tabla: horas al doble y fuera de norma. La tercera
 * cifra es la proyección de 2030 en "Antes" y, en "Después", lo que el
 * reacomodo no pudo cubrir con la plantilla actual (vacantes sugeridas).
 */
export function JornadaTotales({
  resumen,
  colaboradores,
  tope,
  proyeccion2030,
}: {
  resumen: JornadaResumen;
  colaboradores: number;
  /** Tope con el que se calculó el resumen. */
  tope?: number;
  /** Mismos turnos con el tope de 2030 (40 h); se muestra como tercera cifra. */
  proyeccion2030?: JornadaResumen | null;
}) {
  const alerta = resumen.horasAlDoble > 0 || resumen.fueraDeNorma > 0;
  const conSinCubrir = resumen.horasSinCubrir !== undefined;
  const vacantes = resumen.vacantes ?? 0;
  const horas = useContador(resumen.horasAlDoble, 900);
  const fuera = useContador(resumen.fueraDeNorma, 900);
  const horas2030 = useContador(proyeccion2030?.horasAlDoble ?? 0, 900);
  const sinCubrir = useContador(resumen.horasSinCubrir ?? 0, 900);
  return (
    <Table>
      <TableFooter>
        <TableRow>
          <TableCell colSpan={3} className="py-4">
            <div
              className={cn(
                "grid gap-4 [&_p:first-child]:whitespace-nowrap",
                proyeccion2030 || conSinCubrir ? "grid-cols-3" : "grid-cols-2",
              )}
            >
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-wider">
                  {tope ? `Al doble · tope ${tope} h` : "Horas al doble"}
                </p>
                <p
                  className={cn(
                    "mt-1 font-semibold text-2xl tabular-nums transition-colors duration-500 md:text-3xl",
                    alerta && "text-destructive",
                  )}
                >
                  {fmt(horas)}
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
                  {Math.round(fuera)}
                  <span className="ml-1 font-normal text-muted-foreground text-base">
                    de {colaboradores}
                  </span>
                </p>
              </div>
              {conSinCubrir ? (
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wider">
                    Sin cubrir · vacantes
                  </p>
                  <p
                    className={cn(
                      "mt-1 whitespace-nowrap font-semibold text-2xl tabular-nums transition-colors duration-500 md:text-3xl",
                      (resumen.horasSinCubrir ?? 0) > 0 && "text-amber-600 dark:text-amber-400",
                    )}
                  >
                    {fmt(sinCubrir)}
                  </p>
                  <p
                    className={cn(
                      "mt-0.5 text-xs",
                      resumen.horasSinCubrir === 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-muted-foreground",
                    )}
                  >
                    {resumen.horasSinCubrir === 0
                      ? "plantilla suficiente"
                      : `${vacantes} ${vacantes === 1 ? "vacante" : "vacantes"}${tope ? ` de ${tope} h` : ""}`}
                  </p>
                </div>
              ) : (
                proyeccion2030 && (
                  <div>
                    <p className="text-muted-foreground text-xs uppercase tracking-wider">
                      2030 · tope 40 h
                    </p>
                    <p className="mt-1 font-semibold text-2xl text-rose-300 tabular-nums md:text-3xl">
                      {fmt(horas2030)}
                    </p>
                  </div>
                )
              )}
            </div>
          </TableCell>
        </TableRow>
      </TableFooter>
    </Table>
  );
}

export function JornadaArtefacto({
  tope,
  escala = 52,
  personas,
  colaboradores,
  antes,
  despues,
  antes2030,
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
      <JornadaTabla
        personas={personas}
        clave={optimizada ? "reacomodada" : "hoy"}
        tope={tope}
        escala={escala}
        maxAltura="27rem"
        maxAlturaMd="32rem"
      />
      <JornadaTotales
        resumen={resumen}
        colaboradores={colaboradores}
        tope={tope}
        proyeccion2030={optimizada ? null : antes2030}
      />
    </div>
  );
}
