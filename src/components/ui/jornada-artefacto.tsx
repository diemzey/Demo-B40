import { MoveRight } from "lucide-react";
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

type PanelProps = {
  etiqueta: string;
  glosa: string;
  shimmer?: boolean;
  personas: JornadaPersona[];
  tope: number;
  escala: number;
  clave: "hoy" | "reacomodada";
  resumen: JornadaResumen;
  colaboradores: number;
};

function Panel({
  etiqueta,
  glosa,
  shimmer,
  personas,
  tope,
  escala,
  clave,
  resumen,
  colaboradores,
}: PanelProps) {
  const alerta = resumen.horasAlDoble > 0 || resumen.fueraDeNorma > 0;
  return (
    <div
      className={cn(
        "rounded-2xl border bg-card p-5 text-card-foreground shadow-lg",
        shimmer && "j40-shimmer",
      )}
    >
      <div className="mb-3 flex items-baseline justify-between px-2.5">
        <span className="font-semibold text-sm uppercase tracking-wider">
          {etiqueta}
        </span>
        <span className="text-muted-foreground text-xs">{glosa}</span>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Colaborador</TableHead>
            <TableHead>Horas</TableHead>
            <TableHead className="text-right">Estado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {personas.map((p) => (
            <TableRow key={p.nombre}>
              <TableCell>
                <Persona nombre={p.nombre} foto={p.foto} />
              </TableCell>
              <TableCell>
                <Barra horas={p[clave]} tope={tope} escala={escala} />
              </TableCell>
              <TableCell className="text-right">
                <Badge estado={estadoDe(p[clave], tope)} />
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
              className={cn("font-mono text-sm", alerta && "text-destructive")}
              colSpan={2}
            >
              {fmt(resumen.horasAlDoble)}
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="text-muted-foreground text-xs">
              Fuera de norma
            </TableCell>
            <TableCell
              className={cn("font-mono text-sm", alerta && "text-destructive")}
              colSpan={2}
            >
              {resumen.fueraDeNorma} de {colaboradores}
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  );
}

export function JornadaArtefacto({
  tope,
  escala = 52,
  personas,
  colaboradores,
  antes,
  despues,
  className,
  ...props
}: JornadaArtefactoProps) {
  return (
    <div
      className={cn(
        "grid items-start gap-6 md:grid-cols-[1fr_auto_1fr] md:gap-4",
        className,
      )}
      {...props}
    >
      <Panel
        etiqueta="Antes"
        glosa="como está hoy"
        shimmer
        personas={personas}
        tope={tope}
        escala={escala}
        clave="hoy"
        resumen={antes}
        colaboradores={colaboradores}
      />
      <div
        className="flex items-center justify-center self-center text-neutral-900/70"
        aria-hidden="true"
      >
        <MoveRight className="size-6 rotate-90 md:rotate-0" strokeWidth={1.5} />
      </div>
      <Panel
        etiqueta="Después"
        glosa="reacomodada, mismos contratos"
        personas={personas}
        tope={tope}
        escala={escala}
        clave="reacomodada"
        resumen={despues}
        colaboradores={colaboradores}
      />
    </div>
  );
}
