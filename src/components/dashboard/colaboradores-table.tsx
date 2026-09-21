import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/cnippet-table";
import { cn } from "@/lib/utils";

export type Colaborador = {
  nombre: string;
  foto: string;
  hoy: number;
  reacomodada: number;
};

/** Tope transitorio de horas semanales para 2027. */
export const TOPE_2027 = 46;
/** Jornada máxima que fija la ley de 40 horas. */
export const JORNADA_LEGAL = 40;

type Estado = "Excede" | "En el tope" | "Cumple";

function estadoDe(hoy: number): Estado {
  if (hoy > TOPE_2027) return "Excede";
  if (hoy > JORNADA_LEGAL) return "En el tope";
  return "Cumple";
}

const ESTADO_CLASS: Record<Estado, string> = {
  Excede: "bg-destructive/15 text-destructive",
  "En el tope": "bg-amber-500/15 text-amber-400",
  Cumple: "bg-emerald-500/15 text-emerald-400",
};

function EstadoBadge({ estado }: { estado: Estado }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold leading-4",
        ESTADO_CLASS[estado],
      )}
    >
      {estado}
    </span>
  );
}

const fmt = new Intl.NumberFormat("es-MX", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export function ColaboradoresTable({ rows }: { rows: Colaborador[] }) {
  return (
    <Table variant="card">
      <TableHeader>
        <TableRow>
          <TableHead className="pl-3">Colaborador</TableHead>
          <TableHead className="text-right">Hoy</TableHead>
          <TableHead className="text-right">Reacomodada</TableHead>
          <TableHead className="pr-3 text-right">Estado</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((c) => {
          const estado = estadoDe(c.hoy);
          const excede = c.hoy > TOPE_2027;
          return (
            <TableRow key={c.nombre}>
              <TableCell className="pl-3">
                <div className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={c.foto}
                    alt=""
                    width={32}
                    height={32}
                    className="size-8 shrink-0 rounded-full object-cover ring-1 ring-border/60"
                  />
                  <span className="font-medium text-foreground">{c.nombre}</span>
                </div>
              </TableCell>
              <TableCell
                className={cn(
                  "text-right tabular-nums",
                  excede ? "text-destructive" : "text-foreground",
                )}
              >
                {fmt.format(c.hoy)} h
              </TableCell>
              <TableCell className="text-right tabular-nums text-emerald-400">
                {fmt.format(c.reacomodada)} h
              </TableCell>
              <TableCell className="pr-3 text-right">
                <EstadoBadge estado={estado} />
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
