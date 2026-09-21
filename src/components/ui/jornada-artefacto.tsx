import { cn } from "@/lib/utils";

export type JornadaFila = {
  nombre: string;
  horas: number;
};

export type JornadaCifras = {
  horasAlDoble: number;
  fueraDeNorma: number;
  sinCubrir: number;
};

export type JornadaMitad = {
  titulo: string;
  glosa: string;
  filas: JornadaFila[];
  cifras: JornadaCifras;
};

export type JornadaArtefactoProps = React.ComponentProps<"figure"> & {
  sucursal: string;
  semana: number;
  anio: number;
  tope: number;
  /** Máximo de la escala de la barra, en horas. */
  escala?: number;
  colaboradoresMostrados: number;
  colaboradoresTotal: number;
  mitades: [JornadaMitad, JornadaMitad];
  pie: string;
};

type Estado = "excede" | "limite" | "cumple";

function estadoDe(horas: number, tope: number): Estado {
  if (horas > tope) return "excede";
  if (horas === tope) return "limite";
  return "cumple";
}

const colorTexto: Record<Estado, string> = {
  excede: "text-destructive",
  limite: "text-amber-600 dark:text-amber-400",
  cumple: "text-foreground",
};

const fmt = (h: number) => `${h.toFixed(1)} h`;

export function JornadaArtefacto({
  sucursal,
  semana,
  anio,
  tope,
  escala = 52,
  colaboradoresMostrados,
  colaboradoresTotal,
  mitades,
  pie,
  className,
  ...props
}: JornadaArtefactoProps) {
  const pct = (h: number) => `${((h / escala) * 100).toFixed(3)}%`;
  const limite = pct(tope);

  return (
    <figure
      className={cn(
        "rounded-2xl border bg-card p-6 text-card-foreground shadow-lg md:p-8",
        className,
      )}
      {...props}
    >
      <div className="flex flex-col gap-1 border-b pb-4 text-muted-foreground text-xs uppercase tracking-wider sm:flex-row sm:items-center sm:justify-between">
        <span>
          {sucursal} · semana {semana} · tope {anio}: {tope} h
        </span>
        <span>
          {colaboradoresMostrados} de {colaboradoresTotal} colaboradores
        </span>
      </div>

      <div className="mt-6 grid gap-10 md:grid-cols-2 md:gap-8">
        {mitades.map((mitad) => (
          <div key={mitad.titulo}>
            <h3 className="mb-4 font-semibold text-lg tracking-tight">
              {mitad.titulo}{" "}
              <span className="font-normal text-muted-foreground text-sm">
                {mitad.glosa}
              </span>
            </h3>

            <div className="flex flex-col gap-2.5">
              {mitad.filas.map((fila) => {
                const estado = estadoDe(fila.horas, tope);
                return (
                  <div
                    key={fila.nombre}
                    className="grid grid-cols-[minmax(0,7.5rem)_1fr_3.5rem] items-center gap-3 text-sm"
                  >
                    <span className="truncate">{fila.nombre}</span>
                    <span
                      className="relative h-2 overflow-visible rounded-full bg-muted"
                      role="img"
                      aria-label={`${fmt(fila.horas)} de ${tope} h`}
                    >
                      <span
                        className={cn(
                          "absolute inset-y-0 left-0 rounded-full",
                          estado === "excede" ? "bg-destructive" : "bg-primary",
                        )}
                        style={{ width: pct(fila.horas) }}
                      />
                      <span
                        className="absolute -inset-y-1 w-0.5 bg-amber-500"
                        style={{ left: limite }}
                        aria-hidden="true"
                      />
                    </span>
                    <span
                      className={cn(
                        "text-right font-medium tabular-nums",
                        colorTexto[estado],
                      )}
                    >
                      {fmt(fila.horas)}
                    </span>
                  </div>
                );
              })}
            </div>

            <dl className="mt-6 grid grid-cols-3 gap-4 border-t pt-4">
              <div>
                <dt className="text-muted-foreground text-xs">Horas al doble</dt>
                <dd
                  className={cn(
                    "font-semibold tabular-nums",
                    mitad.cifras.horasAlDoble > 0 && "text-destructive",
                  )}
                >
                  {fmt(mitad.cifras.horasAlDoble)}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs">Fuera de norma</dt>
                <dd
                  className={cn(
                    "font-semibold tabular-nums",
                    mitad.cifras.fueraDeNorma > 0 && "text-destructive",
                  )}
                >
                  {mitad.cifras.fueraDeNorma} de {colaboradoresTotal}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs">Sin cubrir</dt>
                <dd className="font-semibold tabular-nums">
                  {fmt(mitad.cifras.sinCubrir)}
                </dd>
              </div>
            </dl>
          </div>
        ))}
      </div>

      <figcaption className="mt-6 flex items-start gap-2 border-t pt-4 text-muted-foreground text-xs leading-relaxed">
        <i
          className="mt-1.5 inline-block h-0.5 w-4 shrink-0 bg-amber-500"
          aria-hidden="true"
        />
        <span>{pie}</span>
      </figcaption>
    </figure>
  );
}
