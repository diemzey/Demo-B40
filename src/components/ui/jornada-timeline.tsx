import { cn } from "@/lib/utils";

export type JornadaPaso = {
  /** Etiqueta superior, p. ej. "Hoy · 2026" o "Desde enero de 2027". */
  etiqueta: string;
  /** Tope semanal en horas. */
  horas: number;
  /** Primera hora que se paga al doble. */
  horaDoble: number;
  /** Marca el paso vigente. */
  actual?: boolean;
};

export type JornadaTimelineProps = React.ComponentProps<"section"> & {
  titulo?: string;
  descripcion?: string;
  pasos: JornadaPaso[];
};

export function JornadaTimeline({
  titulo = "El tope baja dos horas cada enero",
  descripcion = "La jornada legal pasa de 48 a 40 horas semanales entre 2026 y 2030. Todo lo que se trabaje por encima del tope de cada año se paga al doble.",
  pasos,
  className,
  ...props
}: JornadaTimelineProps) {
  return (
    <section
      className={cn(
        "rounded-2xl bg-neutral-950 text-neutral-50 shadow-lg",
        className,
      )}
      aria-label="Calendario de reducción de la jornada"
      {...props}
    >
      <header className="flex flex-col gap-1 px-6 pt-6 md:flex-row md:items-baseline md:justify-between md:px-8 md:pt-8">
        <h3 className="font-semibold text-lg tracking-tight">{titulo}</h3>
        <p className="max-w-xl text-neutral-400 text-sm md:text-right">
          {descripcion}
        </p>
      </header>

      <ol className="relative mt-6 grid md:mt-8 md:grid-cols-5">
        {/* Riel de la línea del tiempo */}
        <span
          className="absolute top-2 bottom-10 left-6 w-px bg-neutral-800 md:inset-x-0 md:top-0 md:bottom-auto md:left-0 md:h-px md:w-auto"
          aria-hidden="true"
        />
        {pasos.map((paso, i) => (
          <li
            key={paso.etiqueta}
            className={cn(
              "relative pl-14 pr-6 pb-6 md:border-neutral-800 md:px-8 md:pt-8 md:pb-8 md:pl-8",
              i > 0 && "md:border-l",
              i === pasos.length - 1 ? "pb-8" : "pb-6",
            )}
          >
            {/* Nodo sobre el riel */}
            <span
              className={cn(
                "absolute top-1.5 left-[21px] size-2.5 rounded-full ring-4 ring-neutral-950 md:top-[-5px] md:left-8",
                paso.actual ? "bg-amber-400" : "bg-neutral-600",
              )}
              aria-hidden="true"
            />
            <p
              className={cn(
                "font-mono text-xs uppercase tracking-[0.18em] md:whitespace-nowrap md:text-[11px] md:tracking-[0.12em]",
                paso.actual ? "text-neutral-50" : "text-neutral-500",
              )}
            >
              {paso.etiqueta}
            </p>
            <p className="mt-2 font-semibold text-4xl tabular-nums tracking-tight md:text-5xl">
              {paso.horas}
              <span className="ml-1 text-2xl md:text-3xl">h</span>
            </p>
            <p className="mt-2 text-neutral-400 text-sm">
              la hora {paso.horaDoble} se paga al doble
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}
