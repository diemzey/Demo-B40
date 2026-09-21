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

export type JornadaFila = {
  nombre: string;
  hoy: number;
  reacomodada: number;
};

export type JornadaTotales = {
  horasAlDoble: { hoy: number; reacomodada: number };
  fueraDeNorma: { hoy: number; reacomodada: number };
  colaboradores: number;
};

export type JornadaArtefactoProps = React.ComponentProps<"div"> & {
  sucursal: string;
  semana: number;
  anio: number;
  tope: number;
  /** Máximo de la escala de la barra, en horas. */
  escala?: number;
  filas: JornadaFila[];
  totales: JornadaTotales;
};

type Estado = "excede" | "limite" | "cumple";

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
        "inline-flex items-center whitespace-nowrap rounded-md border px-2 py-0.5 font-medium text-xs",
        badgeStyles[estado],
      )}
    >
      {badgeLabel[estado]}
    </span>
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
        className="relative h-1.5 w-24 rounded-full bg-muted"
        role="img"
        aria-label={`${fmt(horas)} de ${tope} h`}
      >
        <div
          className={cn(
            "h-full rounded-full",
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
          "w-12 text-right text-xs tabular-nums",
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

export function JornadaArtefacto({
  sucursal,
  semana,
  anio,
  tope,
  escala = 52,
  filas,
  totales,
  className,
  ...props
}: JornadaArtefactoProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border bg-card p-6 text-card-foreground shadow-lg md:p-8",
        className,
      )}
      {...props}
    >
      <section className="mb-6">
        <h2 className="font-semibold text-2xl tracking-tight">{sucursal}</h2>
        <p className="text-muted-foreground text-sm">
          Semana {semana} · tope {anio}: {tope} h por persona
        </p>
      </section>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Colaborador</TableHead>
            <TableHead>Hoy</TableHead>
            <TableHead>Reacomodada</TableHead>
            <TableHead className="text-right">Estado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filas.map((f) => (
            <TableRow key={f.nombre}>
              <TableCell className="font-medium text-sm">{f.nombre}</TableCell>
              <TableCell>
                <Barra horas={f.hoy} tope={tope} escala={escala} />
              </TableCell>
              <TableCell>
                <Barra horas={f.reacomodada} tope={tope} escala={escala} />
              </TableCell>
              <TableCell className="text-right">
                <Badge estado={estadoDe(f.reacomodada, tope)} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell className="text-muted-foreground text-xs">
              Horas al doble
            </TableCell>
            <TableCell
              className={cn(
                "font-mono text-sm",
                totales.horasAlDoble.hoy > 0 && "text-destructive",
              )}
            >
              {fmt(totales.horasAlDoble.hoy)}
            </TableCell>
            <TableCell className="font-mono text-sm">
              {fmt(totales.horasAlDoble.reacomodada)}
            </TableCell>
            <TableCell />
          </TableRow>
          <TableRow>
            <TableCell className="text-muted-foreground text-xs">
              Fuera de norma
            </TableCell>
            <TableCell
              className={cn(
                "font-mono text-sm",
                totales.fueraDeNorma.hoy > 0 && "text-destructive",
              )}
            >
              {totales.fueraDeNorma.hoy} de {totales.colaboradores}
            </TableCell>
            <TableCell className="font-mono text-sm">
              {totales.fueraDeNorma.reacomodada} de {totales.colaboradores}
            </TableCell>
            <TableCell />
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  );
}
