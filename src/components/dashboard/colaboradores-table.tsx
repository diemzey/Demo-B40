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

/**
 * Tabla de colaboradores. El contenedor limita la altura (`max-h-[28rem]`) y
 * desplaza en ambos ejes; la cabecera queda fija (`sticky`) dentro de él.
 * El wrapper interno de `Table` se pone `overflow-visible` para que el
 * contenedor externo sea el que desplace y el sticky funcione.
 */
export function ColaboradoresTable({ rows }: { rows: Colaborador[] }) {
  return (
    <div className="max-h-[28rem] overflow-auto [&>[data-slot=table-container]]:overflow-visible">
      <Table className="text-[13px]">
        <TableHeader className="sticky top-0 z-10 bg-card shadow-[inset_0_-1px_0_0_var(--border)] [&_tr]:border-0">
          <TableRow>
            <TableHead className="h-9 pl-4 text-xs">Colaborador</TableHead>
            <TableHead className="h-9 text-right text-xs">Hoy</TableHead>
            <TableHead className="h-9 text-right text-xs">Reacomodada</TableHead>
            <TableHead className="h-9 pr-4 text-right text-xs">Estado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
        {rows.map((c) => {
          const estado = estadoDe(c.hoy);
          const excede = c.hoy > TOPE_2027;
          return (
            <TableRow key={c.nombre} className="border-border/60">
              <TableCell className="py-2 pl-4">
                <div className="flex items-center gap-2.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={c.foto}
                    alt=""
                    width={28}
                    height={28}
                    className="size-7 shrink-0 rounded-full object-cover ring-1 ring-border/60"
                  />
                  <span className="font-medium text-foreground">{c.nombre}</span>
                </div>
              </TableCell>
              <TableCell
                className={cn(
                  "py-2 text-right tabular-nums",
                  excede ? "text-destructive" : "text-foreground",
                )}
              >
                {fmt.format(c.hoy)} h
              </TableCell>
              <TableCell className="py-2 text-right tabular-nums text-emerald-400">
                {fmt.format(c.reacomodada)} h
              </TableCell>
              <TableCell className="py-2 pr-4 text-right">
                <EstadoBadge estado={estado} />
              </TableCell>
            </TableRow>
          );
        })}
        </TableBody>
      </Table>
    </div>
  );
}
