"use client";

import { useId, useState } from "react";
import { Search } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/cnippet-table";
import { Barra, EstadoBadge, Persona, type JornadaPersona } from "@/components/ui/jornada-artefacto";
import { estadoDe } from "@/components/ui/jornada-artefacto-util";
import { cn } from "@/lib/utils";

/*
 * Detalle antes | después de toda la plantilla, lado a lado en una sola fila
 * por colaborador (hoy → propuesta), con buscador, cabecera fija y scroll
 * interno. Sin toggle: las dos columnas se ven a la vez. Las cifras de
 * resumen (dinero, vacantes) viven arriba en `Comparacion`; aquí no se repiten.
 */

const fmtH = new Intl.NumberFormat("es-MX", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const fmtInt = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 0 });

function normaliza(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

const TONO_HORAS = {
  excede: "text-destructive",
  limite: "text-amber-400",
  cumple: "text-emerald-400",
} as const;

export type DiagnosticoTablaProps = {
  personas: JornadaPersona[];
  tope: number;
  /** Máximo de la escala de las barras, en horas. */
  escala?: number;
  /** Nombre de la columna derecha: "Propuesta" (motor) o "Reacomodada" (sin propuesta). */
  etiquetaPropuesta?: string;
  className?: string;
};

export function DiagnosticoTabla({
  personas,
  tope,
  escala = 52,
  etiquetaPropuesta = "Propuesta",
  className,
}: DiagnosticoTablaProps) {
  const [busqueda, setBusqueda] = useState("");
  const inputId = useId();
  const q = normaliza(busqueda.trim());
  const ordenadas = [...personas].sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  const visibles = q ? ordenadas.filter((p) => normaliza(`${p.nombre} ${p.detalle ?? ""}`).includes(q)) : ordenadas;
  const escalaReal = Math.max(escala, ...personas.map((p) => Math.max(p.hoy, p.reacomodada)));

  return (
    <section
      id="tabla-colaboradores"
      aria-label="Horas por colaborador, hoy y con la propuesta"
      className={cn("scroll-mt-20 rounded-lg border border-border bg-card shadow-lg shadow-black/5", className)}
    >
      <div className="flex flex-col gap-3 p-4 pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="j40-body font-semibold">Toda la plantilla</h2>
          <p className="j40-muted">
            {fmtInt.format(personas.length)} colaboradores · horas de hoy y con la {etiquetaPropuesta.toLowerCase()} ·
            tope {tope} h
          </p>
        </div>
        <div className="relative sm:w-64">
          <label htmlFor={inputId} className="sr-only">
            Buscar colaborador
          </label>
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            strokeWidth={1.5}
            aria-hidden="true"
          />
          <input
            id={inputId}
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre o puesto"
            className="j40-body h-10 w-full rounded-md border border-input bg-background pl-8 pr-2.5 text-foreground shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 md:h-9"
          />
        </div>
      </div>
      <div className="relative border-t border-border/60 [&_[data-slot=table-container]]:max-h-[28rem] [&_[data-slot=table-container]]:overflow-y-auto [&_[data-slot=table-container]]:overscroll-contain [&_[data-slot=table-container]]:[scrollbar-width:thin] md:[&_[data-slot=table-container]]:max-h-[34rem]">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-card">
            <TableRow>
              <TableHead>Colaborador</TableHead>
              <TableHead className="hidden sm:table-cell">Hoy</TableHead>
              <TableHead className="hidden sm:table-cell">{etiquetaPropuesta}</TableHead>
              <TableHead className="text-right sm:hidden">Hoy → {etiquetaPropuesta.toLowerCase()}</TableHead>
              <TableHead className="hidden text-right md:table-cell">Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibles.map((p) => {
              const antes = estadoDe(p.hoy, tope);
              const despues = estadoDe(p.reacomodada, tope);
              return (
                <TableRow key={p.nombre}>
                  <TableCell>
                    <Persona nombre={p.nombre} foto={p.foto} detalle={p.detalle} />
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Barra horas={p.hoy} tope={tope} escala={escalaReal} />
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Barra horas={p.reacomodada} tope={tope} escala={escalaReal} />
                  </TableCell>
                  <TableCell className="text-right text-xs tabular-nums sm:hidden">
                    <span className={TONO_HORAS[antes]}>{fmtH.format(p.hoy)}</span>
                    <span className="mx-1 text-muted-foreground" aria-hidden="true">
                      →
                    </span>
                    <span className={cn("font-medium", TONO_HORAS[despues])}>{fmtH.format(p.reacomodada)} h</span>
                  </TableCell>
                  <TableCell className="hidden text-right md:table-cell">
                    <span className="inline-flex items-center justify-end gap-1.5">
                      {antes !== despues && (
                        <>
                          <EstadoBadge estado={antes} />
                          <span className="text-muted-foreground" aria-hidden="true">
                            →
                          </span>
                        </>
                      )}
                      <EstadoBadge estado={despues} />
                    </span>
                  </TableCell>
                </TableRow>
              );
            })}
            {visibles.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-xs text-muted-foreground">
                  Nadie coincide con “{busqueda.trim()}”.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-card to-transparent"
          aria-hidden="true"
        />
      </div>
    </section>
  );
}
