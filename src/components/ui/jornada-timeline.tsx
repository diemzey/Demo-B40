import { cn } from "@/lib/utils";

export type JornadaPaso = {
  /** Año en que entra el tope. */
  anio: number;
  /** Tope semanal en horas. */
  horas: number;
  /** Marca el paso vigente. */
  actual?: boolean;
};

export type JornadaTimelineProps = React.ComponentProps<"section"> & {
  pasos: JornadaPaso[];
};

export function JornadaTimeline({
  pasos,
  className,
  ...props
}: JornadaTimelineProps) {
  return (
    <section
      className={cn("text-neutral-900", className)}
      aria-label="Calendario de reducción de la jornada"
      {...props}
    >
      <p className="mx-auto max-w-2xl text-balance text-center font-medium text-base md:text-lg">
        El tope semanal baja dos horas cada enero hasta llegar a 40 h en 2030.
        Lo que se trabaje por encima se paga al doble.
      </p>

      <ol
        className="relative mt-8 grid grid-cols-5"
      >
        {/* Riel */}
        <span
          className="absolute top-[5px] right-[10%] left-[10%] h-0.5 bg-neutral-900/25"
          aria-hidden="true"
        />
        {pasos.map((paso) => (
          <li key={paso.anio} className="relative flex flex-col items-center text-center">
            <span
              className={cn(
                "size-3 rounded-full ring-4 ring-yellow-400",
                paso.actual ? "bg-neutral-900" : "bg-neutral-900/40",
              )}
              aria-hidden="true"
            />
            <span
              className={cn(
                "mt-3 text-xs uppercase tracking-wider md:text-sm",
                paso.actual ? "font-semibold" : "text-neutral-900/60",
              )}
            >
              {paso.actual ? "Hoy" : paso.anio}
            </span>
            <span className="mt-1 font-semibold text-2xl tabular-nums tracking-tight md:text-4xl">
              {paso.horas}
              <span className="ml-0.5 text-base md:text-xl">h</span>
            </span>
            {paso.actual && (
              <span className="mt-0.5 text-neutral-900/60 text-xs">{paso.anio}</span>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
