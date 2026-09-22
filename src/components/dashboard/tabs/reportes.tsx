"use client";

import { useState } from "react";
import { Upload } from "lucide-react";
import { AhorroPorSemanaChart, DesgloseAhorroBarra } from "@/components/dashboard/charts-reportes";
import { Comparacion, type FilaComparacion } from "@/components/dashboard/comparacion";
import { mxnCompacto } from "@/lib/formato";
import { Panel, PanelHeader, Pill, TabHeader, type PillTone } from "@/components/dashboard/tabs/ui";
import { Button } from "@/components/ui/button";
import { usePanel, useReporte } from "@/lib/datos/panel-context";
import { numeroSemanaIso, rangoCorto, semanaDesdeLunes } from "@/lib/datos/semana";
import type { SucursalReporte } from "@/lib/datos/tipos";
import { cn } from "@/lib/utils";

/*
 * Reporte de ahorro de toda la empresa. Ninguna cifra se calcula aquí: todo
 * viene de `reporte_ejecutivo()` y `v_ahorro_escenario` (ver
 * src/lib/datos/reportes.ts); la pestaña sólo formatea y ordena.
 */

const fmtMXN = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });
const fmtH = new Intl.NumberFormat("es-MX", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const fmtPct = new Intl.NumberFormat("es-MX", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const fmtInt = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 0 });

const pct = (v: number) => `${fmtPct.format(v)} %`;
const plural = (n: number, uno: string, varios: string) => `${fmtInt.format(n)} ${n === 1 ? uno : varios}`;

function etiquetaSemana(lunes: string): string {
  return `S${numeroSemanaIso(lunes)} · ${rangoCorto(semanaDesdeLunes(lunes))}`;
}

/** Lectura de la cobertura pico: ≥ 98 % bien, ≥ 95 % atención, menos: mal. */
function tonoCobertura(v: number | null): PillTone {
  if (v === null) return "neutral";
  return v >= 98 ? "good" : v >= 95 ? "warn" : "bad";
}

/** Lectura del ahorro % de una sucursal-semana. */
function tonoAhorro(v: number): PillTone {
  return v >= 40 ? "good" : v >= 25 ? "warn" : v > 0 ? "neutral" : "bad";
}

const INICIAL = 10;

/** Una sola lista de sucursales: las que menos ahorran primero (piden revisión) o las mejores. */
function ListaSucursales({ sucursales }: { sucursales: SucursalReporte[] }) {
  const [orden, setOrden] = useState<"peores" | "mejores">("peores");
  const [todas, setTodas] = useState(false);
  const lista = orden === "peores" ? sucursales : [...sucursales].reverse();
  const visibles = todas ? lista : lista.slice(0, INICIAL);
  const maxPct = Math.max(1, ...sucursales.map((s) => s.ahorroPct));
  const conDeficit = sucursales.filter((s) => s.deficitPicoHoras > 0).length;

  return (
    <Panel>
      <PanelHeader
        title="Por sucursal"
        description={
          orden === "peores"
            ? "Primero las que menos ahorran o dejan picos sin cubrir: son las que piden revisión."
            : "Primero las que más ahorran."
        }
        aside={
          <div role="group" aria-label="Orden" className="inline-flex rounded-md border border-border bg-background p-0.5">
            {(
              [
                ["peores", "Revisar"],
                ["mejores", "Mejores"],
              ] as const
            ).map(([valor, etiqueta]) => (
              <button
                key={valor}
                type="button"
                aria-pressed={orden === valor}
                onClick={() => setOrden(valor)}
                className={cn(
                  "h-8 rounded px-2.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
                  orden === valor ? "bg-yellow-400 text-neutral-950" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {etiqueta}
              </button>
            ))}
          </div>
        }
      />
      <ol className="divide-y divide-border/60 border-t border-border/60">
        {visibles.map((s) => {
          const revisar = s.deficitPicoHoras > 0;
          return (
            <li
              key={`${s.sucursalId}-${s.semanaIso}`}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 px-4 py-2.5 sm:grid-cols-[minmax(0,1.2fr)_minmax(6rem,1fr)_auto]"
            >
              <div className="min-w-0">
                <p className="j40-body truncate font-medium">{s.nombre}</p>
                <p className="j40-muted">
                  {etiquetaSemana(s.semanaIso)}
                  {revisar && (
                    <>
                      {" "}
                      · <span className="text-destructive">faltan {fmtH.format(s.deficitPicoHoras)} h en picos</span>
                    </>
                  )}
                </p>
              </div>
              <div
                className="col-span-2 h-1.5 w-full rounded-full bg-muted sm:col-span-1"
                role="img"
                aria-label={`Ahorro ${pct(s.ahorroPct)}`}
              >
                <div
                  className={cn("h-full rounded-full", revisar ? "bg-destructive" : "bg-amber-400")}
                  style={{ width: `${Math.max(0, Math.min(100, (100 * s.ahorroPct) / maxPct))}%` }}
                />
              </div>
              <div className="col-start-2 row-start-1 flex items-center justify-end gap-2 sm:col-start-3 sm:row-start-auto">
                <span className="j40-body tabular-nums text-emerald-400">{fmtMXN.format(s.ahorroMxn)}</span>
                <Pill tone={tonoAhorro(s.ahorroPct)}>{pct(s.ahorroPct)}</Pill>
                <Pill tone={tonoCobertura(s.coberturaPicoPropuestaPct)} className="hidden md:inline-flex">
                  {s.coberturaPicoPropuestaPct === null ? "Sin pico" : `pico ${pct(s.coberturaPicoPropuestaPct)}`}
                </Pill>
              </div>
            </li>
          );
        })}
      </ol>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 px-4 py-2">
        <p className="j40-muted">
          {plural(sucursales.length, "sucursal-semana", "sucursal-semanas")}
          {conDeficit > 0 && <> · {plural(conDeficit, "con picos sin cubrir", "con picos sin cubrir")}</>}
        </p>
        {lista.length > INICIAL && (
          <button
            type="button"
            onClick={() => setTodas((v) => !v)}
            className="j40-body h-9 rounded-md px-2 font-medium text-amber-400 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          >
            {todas ? "Ver menos" : `Ver las ${fmtInt.format(lista.length)}`}
          </button>
        )}
      </div>
    </Panel>
  );
}

export function ReportesTab() {
  const panel = usePanel();
  const reporte = useReporte();
  const { total, semanas, porSucursal } = reporte;
  const demo = reporte.origen === "demo";
  const empresa = reporte.empresa?.nombre ?? panel.empresa?.nombre ?? null;
  const titulo = empresa ? `Reporte · ${empresa}` : "Reporte";

  if (!demo && semanas.length === 0) {
    return (
      <div className="mx-auto w-full max-w-6xl p-4 md:p-6">
        <TabHeader eyebrow="Reportes" title={titulo} subtitle="Se llena cuando programas tus semanas." />
        <Panel className="flex flex-col items-start gap-4 p-6">
          <div>
            <p className="j40-body font-semibold">Aquí verás el ahorro de todas tus sucursales.</p>
            <p className="j40-body mt-1 max-w-xl text-muted-foreground">Empieza por subir y programar una semana.</p>
          </div>
          <Button asChild size="sm" variant="outline">
            <a href="#semanas">
              <Upload className="mr-2 size-4" strokeWidth={1.5} aria-hidden="true" />
              Subir semana
            </a>
          </Button>
        </Panel>
      </div>
    );
  }

  const fmtEnteroH = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 0 });
  const filas: FilaComparacion[] = [
    {
      etiqueta: "Costo laboral",
      hoy: mxnCompacto(total.costoBaseline),
      propuesta: mxnCompacto(total.costoPropuesta),
      tonoPropuesta: total.ahorroMxn > 0 ? "mejora" : total.ahorroMxn < 0 ? "duele" : "neutral",
    },
    {
      etiqueta: "Horas programadas",
      hoy: `${fmtEnteroH.format(total.horasBaseline)} h`,
      propuesta: `${fmtEnteroH.format(total.horasPropuesta)} h`,
      tonoPropuesta: total.horasPropuesta < total.horasBaseline ? "mejora" : "neutral",
    },
    {
      etiqueta: "Cobertura pico",
      hoy: pct(total.coberturaPicoBaselinePct),
      propuesta: pct(total.coberturaPicoPropuestaPct),
      tonoPropuesta:
        total.coberturaPicoPropuestaPct > total.coberturaPicoBaselinePct
          ? "mejora"
          : total.coberturaPicoPropuestaPct === total.coberturaPicoBaselinePct
            ? "neutral"
            : total.coberturaPicoPropuestaPct >= 95
              ? "atencion"
              : "duele",
    },
  ];
  const notas: React.ReactNode[] = [];
  if (total.deficitPicoHoras > 0) {
    notas.push(
      <>
        Faltan {fmtH.format(total.deficitPicoHoras)} h en horas pico ·{" "}
        {plural(total.tiendasConSubdotacionPico, "sucursal con picos sin cubrir", "sucursales con picos sin cubrir")}
      </>,
    );
  } else {
    notas.push(<>Todas las sucursales cubren sus horas pico con la propuesta</>);
  }

  return (
    <div className="mx-auto w-full max-w-6xl p-4 md:p-6">
      <TabHeader
        eyebrow="Reportes"
        title={titulo}
        subtitle={`${plural(total.tiendas, "sucursal", "sucursales")} · ${plural(total.semanas, "semana", "semanas")} · tope ${reporte.tope} h`}
        action={
          demo ? (
            <Pill tone="warn">{reporte.aviso === "sin-datos" ? "Datos de muestra · sin propuestas publicadas" : "Datos de muestra"}</Pill>
          ) : undefined
        }
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        <Comparacion
          className="xl:col-span-2"
          titulo="Ahorro total con la propuesta"
          ahorroMxn={total.ahorroMxn}
          detalle={
            <>
              {pct(Math.abs(total.ahorroPct))} del costo laboral · {plural(total.tiendas, "sucursal", "sucursales")} ·{" "}
              {plural(total.semanas, "semana", "semanas")}
              {total.semanas > 0 && <> · ≈ {mxnCompacto(total.ahorroMxn / total.semanas)} por semana</>}
            </>
          }
          filas={filas}
          notas={notas}
        />
        <div className="flex min-w-0 flex-col gap-4 xl:col-span-3">
          <Panel>
            <PanelHeader title="Por semana" description="Costo de todas las sucursales, hoy y con la propuesta." />
            <div className="p-4 pt-2">
              <AhorroPorSemanaChart semanas={semanas} />
            </div>
          </Panel>
          <Panel>
            <PanelHeader title="De dónde sale el ahorro" description="Qué parte del ahorro viene de cada rubro del costo." />
            <div className="p-4 pt-2">
              <DesgloseAhorroBarra
                desglose={{
                  dobles: total.ahorroDobles,
                  triples: total.ahorroTriples,
                  prima: total.ahorroPrima,
                  sobrestaffing: total.ahorroSobrestaffing,
                }}
              />
            </div>
          </Panel>
        </div>
      </div>

      {porSucursal.length > 0 && (
        <div className="mt-4">
          <ListaSucursales sucursales={porSucursal} />
        </div>
      )}
    </div>
  );
}
