"use client";

import type { ReactNode } from "react";
import { DesgloseAhorroChart } from "@/components/dashboard/charts-reportes";
import { StatCard } from "@/components/dashboard/stat-card";
import { Panel, PanelHeader, Pill, TabHeader, type PillTone } from "@/components/dashboard/tabs/ui";
import { usePanel, useReporte } from "@/lib/datos/panel-context";
import { numeroSemanaIso, rangoCorto, semanaDesdeLunes } from "@/lib/datos/semana";
import type { SucursalReporte } from "@/lib/datos/tipos";
import { cn } from "@/lib/utils";

/*
 * Reporte ejecutivo de ahorro. Ninguna cifra se calcula aquí: todo viene de
 * `reporte_ejecutivo()` y `v_ahorro_escenario` (ver src/lib/datos/reportes.ts);
 * la pestaña sólo formatea y ordena.
 */

const fmtMXN = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});
const fmtH = new Intl.NumberFormat("es-MX", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const fmtPct = new Intl.NumberFormat("es-MX", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const fmtInt = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 0 });

const pct = (v: number) => `${fmtPct.format(v)} %`;
/** Signo tipográfico ("−" en lugar de "-") para deltas. */
const conSigno = (v: number, texto: string) => (v < 0 ? `−${texto}` : v > 0 ? `+${texto}` : texto);

function etiquetaSemana(lunes: string): { iso: number; rango: string } {
  return { iso: numeroSemanaIso(lunes), rango: rangoCorto(semanaDesdeLunes(lunes)) };
}

/** Lectura de la cobertura pico: ≥ 98 % bien, ≥ 95 % atención, menos: mal. */
function tonoCobertura(v: number | null): PillTone {
  if (v === null) return "neutral";
  return v >= 98 ? "good" : v >= 95 ? "warn" : "bad";
}

/** Lectura del ahorro % de una tienda-semana. */
function tonoAhorro(v: number): PillTone {
  return v >= 40 ? "good" : v >= 25 ? "warn" : v > 0 ? "neutral" : "bad";
}

/** Cifra principal del reporte (una sola por vista): ahorro total en verde. */
function TarjetaAhorro({ ahorro, ahorroPct, baseline }: { ahorro: number; ahorroPct: number; baseline: number }) {
  const positivo = ahorro >= 0;
  return (
    <div className="rounded-lg border border-emerald-500/30 bg-card p-4 shadow-lg shadow-black/5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">Ahorro total</p>
        <span
          className={cn(
            "inline-flex shrink-0 items-center rounded-full px-1.5 py-0.5 text-[11px] font-semibold leading-4 tabular-nums",
            positivo ? "bg-emerald-500/15 text-emerald-400" : "bg-destructive/15 text-destructive",
          )}
        >
          {conSigno(-ahorroPct, pct(Math.abs(ahorroPct)))}
        </span>
      </div>
      <p className={cn("mt-1.5 text-3xl font-semibold tracking-tight", positivo ? "text-emerald-400" : "text-destructive")}>
        {fmtMXN.format(ahorro)}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        sobre un costo baseline de <span className="tabular-nums text-foreground">{fmtMXN.format(baseline)}</span>
      </p>
    </div>
  );
}

const th = "h-9 px-2.5 font-medium first:px-4 last:px-4";
const td = "h-10 px-2.5 first:px-4 last:px-4";
const tdNum = `${td} text-right tabular-nums`;

function Tabla({ children, minWidth = 560 }: { children: ReactNode; minWidth?: number }) {
  return (
    <div className="overflow-x-auto">
      <table
        className="w-full text-[13px] [&_td]:whitespace-nowrap [&_th]:whitespace-nowrap"
        style={{ minWidth }}
      >
        {children}
      </table>
    </div>
  );
}

function FilaTienda({ s }: { s: SucursalReporte }) {
  const semana = etiquetaSemana(s.semanaIso);
  return (
    <tr className="border-t border-border/60">
      <td className={`${td} font-medium`}>{s.nombre}</td>
      <td className={`${td} text-muted-foreground`}>
        S{semana.iso} <span className="text-muted-foreground/70">· {semana.rango}</span>
      </td>
      <td className={`${tdNum} text-muted-foreground`}>{fmtMXN.format(s.costoBaseline)}</td>
      <td className={tdNum}>{fmtMXN.format(s.costoPropuesta)}</td>
      <td className={`${tdNum} font-medium`}>{fmtMXN.format(s.ahorroMxn)}</td>
      <td className={`${td} text-right`}>
        <Pill tone={tonoAhorro(s.ahorroPct)}>{pct(s.ahorroPct)}</Pill>
      </td>
      <td className={`${td} text-right`}>
        <Pill tone={tonoCobertura(s.coberturaPicoPropuestaPct)}>
          {s.coberturaPicoPropuestaPct === null ? "Sin pico" : pct(s.coberturaPicoPropuestaPct)}
        </Pill>
      </td>
      <td className={cn(tdNum, s.deficitPicoHoras > 0 ? "font-medium text-destructive" : "text-muted-foreground")}>
        {fmtH.format(s.deficitPicoHoras)} h
      </td>
    </tr>
  );
}

export function ReportesTab() {
  const panel = usePanel();
  const reporte = useReporte();
  const { total, semanas, porSucursal, mejores } = reporte;
  const demo = reporte.origen === "demo";
  const empresa = reporte.empresa?.nombre ?? panel.empresa?.nombre ?? null;

  const deltaCobertura = total.coberturaPicoPropuestaPct - total.coberturaPicoBaselinePct;
  const deltaHoras = total.horasPropuesta - total.horasBaseline;
  const peores = porSucursal.slice(0, 8);

  return (
    <div className="mx-auto w-full max-w-6xl p-4 md:p-6">
      <TabHeader
        eyebrow="Reportes"
        title={empresa ? `Reporte ejecutivo · ${empresa}` : "Reporte ejecutivo"}
        subtitle={`${fmtInt.format(total.tiendas)} ${total.tiendas === 1 ? "tienda" : "tiendas"} · ${fmtInt.format(total.semanas)} ${total.semanas === 1 ? "semana" : "semanas"} · tope ${reporte.tope} h`}
        action={
          demo ? (
            <Pill tone="amber">
              {reporte.aviso === "sin-datos" ? "Datos de muestra · sin escenarios publicados" : "Datos de muestra"}
            </Pill>
          ) : undefined
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <TarjetaAhorro ahorro={total.ahorroMxn} ahorroPct={total.ahorroPct} baseline={total.costoBaseline} />
        <StatCard
          label="Costo propuesta vs. baseline"
          value={fmtMXN.format(total.costoPropuesta)}
          hint={`Baseline ${fmtMXN.format(total.costoBaseline)} · ${fmtH.format(total.horasBaseline)} h → ${fmtH.format(total.horasPropuesta)} h`}
          delta={conSigno(deltaHoras, `${fmtH.format(Math.abs(deltaHoras))} h`)}
          deltaTone={deltaHoras < 0 ? "good" : deltaHoras > 0 ? "bad" : "neutral"}
        />
        <StatCard
          label="Cobertura pico propuesta"
          value={fmtPct.format(total.coberturaPicoPropuestaPct)}
          unit="%"
          hint={`Baseline ${pct(total.coberturaPicoBaselinePct)} · promedio por tienda-semana`}
          delta={conSigno(deltaCobertura, `${fmtPct.format(Math.abs(deltaCobertura))} pts`)}
          deltaTone={deltaCobertura > 0 ? "good" : deltaCobertura < 0 ? "bad" : "neutral"}
        />
        <StatCard
          label="Déficit pico"
          value={fmtH.format(total.deficitPicoHoras)}
          unit="h-persona"
          tone={total.deficitPicoHoras > 0 ? "destructive" : "default"}
          hint={
            total.tiendasConSubdotacionPico === 0
              ? "Ninguna tienda con subdotación en pico"
              : `${fmtInt.format(total.tiendasConSubdotacionPico)} ${total.tiendasConSubdotacionPico === 1 ? "tienda" : "tiendas"} con subdotación en pico`
          }
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Panel className="xl:col-span-1">
          <PanelHeader
            title="Desglose del ahorro"
            description="Qué parte del ahorro viene de cada componente del costo."
          />
          <div className="p-4 pt-2">
            <DesgloseAhorroChart
              desglose={{
                dobles: total.ahorroDobles,
                triples: total.ahorroTriples,
                prima: total.ahorroPrima,
                sobrestaffing: total.ahorroSobrestaffing,
              }}
              total={total.ahorroMxn}
            />
          </div>
        </Panel>

        <Panel className="xl:col-span-2">
          <PanelHeader
            title="Por semana"
            description="Una fila por semana ISO con baseline y propuesta publicados."
          />
          <Tabla>
            <thead>
              <tr className="text-left text-xs text-muted-foreground">
                <th className={th}>Semana</th>
                <th className={`${th} text-right`}>Tiendas</th>
                <th className={`${th} text-right`}>Baseline</th>
                <th className={`${th} text-right`}>Propuesta</th>
                <th className={`${th} text-right`}>Ahorro</th>
                <th className={`${th} text-right`}>%</th>
                <th className={`${th} text-right`}>Cobertura pico</th>
              </tr>
            </thead>
            <tbody>
              {semanas.map((s) => {
                const semana = etiquetaSemana(s.semanaIso);
                return (
                  <tr key={s.semanaIso} className="border-t border-border/60">
                    <td className={`${td} font-medium`}>
                      S{semana.iso} <span className="font-normal text-muted-foreground">· {semana.rango}</span>
                    </td>
                    <td className={tdNum}>{fmtInt.format(s.tiendas)}</td>
                    <td className={`${tdNum} text-muted-foreground`}>{fmtMXN.format(s.costoBaseline)}</td>
                    <td className={tdNum}>{fmtMXN.format(s.costoPropuesta)}</td>
                    <td className={`${tdNum} font-medium text-emerald-400`}>{fmtMXN.format(s.ahorroMxn)}</td>
                    <td className={tdNum}>{pct(s.ahorroPct)}</td>
                    <td className={`${td} text-right`}>
                      <Pill tone={tonoCobertura(s.coberturaPicoPropuestaPct)}>{pct(s.coberturaPicoPropuestaPct)}</Pill>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-border text-xs text-muted-foreground">
                <td className={`${td} font-medium text-foreground`}>Total</td>
                <td className={tdNum}>{fmtInt.format(total.tiendas)}</td>
                <td className={tdNum}>{fmtMXN.format(total.costoBaseline)}</td>
                <td className={`${tdNum} text-foreground`}>{fmtMXN.format(total.costoPropuesta)}</td>
                <td className={`${tdNum} font-semibold text-emerald-400`}>{fmtMXN.format(total.ahorroMxn)}</td>
                <td className={`${tdNum} text-foreground`}>{pct(total.ahorroPct)}</td>
                <td className={`${tdNum}`}>{pct(total.coberturaPicoPropuestaPct)}</td>
              </tr>
            </tfoot>
          </Tabla>
        </Panel>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Panel className="xl:col-span-2">
          <PanelHeader
            title="Tiendas con menor ahorro"
            description="Las tienda-semanas donde la propuesta ahorra menos; primero las que piden revisión."
            aside={<Pill tone="neutral">{fmtInt.format(peores.length)} de {fmtInt.format(porSucursal.length)}</Pill>}
          />
          <Tabla minWidth={720}>
            <thead>
              <tr className="text-left text-xs text-muted-foreground">
                <th className={th}>Tienda</th>
                <th className={th}>Semana</th>
                <th className={`${th} text-right`}>Baseline</th>
                <th className={`${th} text-right`}>Propuesta</th>
                <th className={`${th} text-right`}>Ahorro</th>
                <th className={`${th} text-right`}>%</th>
                <th className={`${th} text-right`}>Cobertura pico</th>
                <th className={`${th} text-right`}>Déficit</th>
              </tr>
            </thead>
            <tbody>
              {peores.map((s) => (
                <FilaTienda key={`${s.sucursalId}-${s.semanaIso}`} s={s} />
              ))}
            </tbody>
          </Tabla>
        </Panel>

        <Panel>
          <PanelHeader title="Mayor ahorro" description="Las 5 tienda-semanas con más ahorro porcentual." />
          <ul className="px-4 pb-4 pt-1">
            {mejores.map((s) => {
              const semana = etiquetaSemana(s.semanaIso);
              return (
                <li
                  key={`${s.sucursalId}-${s.semanaIso}`}
                  className="flex items-center justify-between gap-3 border-t border-border/60 py-2.5 first:border-t-0"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium">{s.nombre}</p>
                    <p className="text-[11px] text-muted-foreground">
                      S{semana.iso} · {semana.rango}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-[13px] tabular-nums text-emerald-400">{fmtMXN.format(s.ahorroMxn)}</span>
                    <Pill tone={tonoAhorro(s.ahorroPct)}>{pct(s.ahorroPct)}</Pill>
                  </div>
                </li>
              );
            })}
          </ul>
        </Panel>
      </div>

      <p className="mt-5 font-mono text-[11px] tracking-wide text-muted-foreground">
        <span className="font-semibold uppercase text-amber-400">Trazabilidad</span> · Cada cifra proviene de
        resumen_escenario → v_ahorro_escenario → reporte_ejecutivo()
      </p>
    </div>
  );
}
