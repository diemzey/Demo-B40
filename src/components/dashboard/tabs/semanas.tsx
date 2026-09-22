"use client";

import { ImportarYProgramar } from "@/components/dashboard/importar-y-programar";
import { Panel, PanelHeader, Pill, TabHeader } from "@/components/dashboard/tabs/ui";
import { TendenciaSemanas } from "@/components/dashboard/tendencia-semanas";
import { usePanel } from "@/lib/datos/panel-context";
import { rangoCorto, semanaDesdeLunes } from "@/lib/datos/semana";
import type { SemanaHistorial } from "@/lib/datos/tipos";
import { cn } from "@/lib/utils";

/*
 * Historial de semanas de la sucursal y el importador. Cada fila: semana,
 * fechas, ahorro de la propuesta, cobertura pico y estado. Las horas al doble
 * del historial no se muestran: se miden contra el tope legal de cada año y
 * no son comparables entre semanas; la tendencia usa los costos del motor,
 * calculados con el tope de la propuesta.
 */

const fmtMXN = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });
const fmtPct = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 1 });
const fmtInt = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 0 });

/** Lectura de la cobertura pico: ≥ 98 % bien, ≥ 95 % atención, menos: mal. */
function tonoCobertura(v: number | null | undefined) {
  if (v === null || v === undefined) return "neutral" as const;
  return v >= 98 ? ("good" as const) : v >= 95 ? ("warn" as const) : ("bad" as const);
}

function Ahorro({ s }: { s: SemanaHistorial }) {
  if (s.ahorroMxn === undefined) return <span className="text-muted-foreground">—</span>;
  return (
    <span className={cn("font-medium tabular-nums", s.ahorroMxn >= 0 ? "text-emerald-400" : "text-destructive")}>
      {s.ahorroMxn < 0 && "−"}
      {fmtMXN.format(Math.abs(s.ahorroMxn))}
    </span>
  );
}

function Cobertura({ s }: { s: SemanaHistorial }) {
  if (!s.programada) return <span className="text-muted-foreground">—</span>;
  const v = s.coberturaPicoPropuestaPct;
  return <Pill tone={tonoCobertura(v)}>{v === null || v === undefined ? "Sin pico" : `${fmtPct.format(v)} %`}</Pill>;
}

function Estado({ s }: { s: SemanaHistorial }) {
  return <Pill tone={s.programada ? "good" : "neutral"}>{s.programada ? "Programada" : "Sin programar"}</Pill>;
}

export function SemanasTab() {
  const datos = usePanel();
  const sucursal = datos.sucursal?.nombre ?? "Coapa";
  // Historial ascendente en los datos → más reciente arriba en la lista.
  const filas = [...datos.semanas].reverse();
  const actual = datos.semana?.inicio;
  const programadas = filas.filter((f) => f.programada);
  const ahorroTotal = programadas.reduce((a, s) => a + (s.ahorroMxn ?? 0), 0);
  const primera = filas[filas.length - 1];
  const ultima = filas[0];
  const rango =
    filas.length === 0
      ? "Sin semanas todavía"
      : primera.iso === ultima.iso
        ? `Semana ${ultima.iso}`
        : `Semanas ${primera.iso}–${ultima.iso}`;

  return (
    <div id="semanas" className="mx-auto w-full max-w-6xl scroll-mt-20 p-4 md:p-6">
      <TabHeader
        eyebrow="Semanas"
        title={`Semanas · Sucursal ${sucursal}`}
        subtitle={`${rango} · ${fmtInt.format(programadas.length)} de ${fmtInt.format(filas.length)} con propuesta${
          datos.origen === "demo" ? " · datos de muestra" : ""
        }`}
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-4 xl:col-span-2">
          {filas.length >= 2 && (
            <Panel>
              <PanelHeader
                title={
                  programadas.length > 0 ? (
                    <>
                      Ahorro acumulado:{" "}
                      <span className="tabular-nums text-emerald-400">{fmtMXN.format(ahorroTotal)}</span> en{" "}
                      {fmtInt.format(programadas.length)} {programadas.length === 1 ? "semana" : "semanas"}
                    </>
                  ) : (
                    "Tendencia"
                  )
                }
                description="Costo de cada semana como está hoy y con su propuesta, siempre con el mismo tope."
              />
              <div className="p-4 pt-2">
                <TendenciaSemanas semanas={datos.semanas} />
              </div>
            </Panel>
          )}

          <Panel>
            <PanelHeader
              title="Historial"
              description="Cada semana que subiste. Programada = ya tiene propuesta."
            />
            {filas.length === 0 ? (
              <p className="j40-body px-4 pb-5 text-muted-foreground">
                Sube tu primera semana para ver el historial aquí.
              </p>
            ) : (
              <>
                {/* Escritorio: tabla. */}
                <table className="j40-body hidden w-full sm:table [&_td]:whitespace-nowrap [&_th]:whitespace-nowrap">
                  <thead>
                    <tr className="text-left text-xs text-muted-foreground">
                      <th className="h-9 px-4 font-medium">Semana</th>
                      <th className="h-9 px-2.5 font-medium">Fechas</th>
                      <th className="h-9 px-2.5 text-right font-medium">Colaboradores</th>
                      <th className="h-9 px-2.5 text-right font-medium">Ahorro · semana</th>
                      <th className="h-9 px-2.5 text-right font-medium">Cobertura pico</th>
                      <th className="h-9 px-4 text-right font-medium">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filas.map((s) => {
                      const esActual = s.inicio === actual;
                      return (
                        <tr
                          key={s.inicio}
                          className={cn("border-t border-border/60", esActual && "bg-amber-400/[0.04]")}
                          aria-current={esActual ? "true" : undefined}
                        >
                          <td className="px-4 py-2.5 font-medium tabular-nums">
                            <span className="inline-flex items-center gap-2">
                              S{s.iso}
                              {esActual && <Pill tone="marca">Actual</Pill>}
                            </span>
                          </td>
                          <td className="px-2.5 py-2.5 text-muted-foreground">{rangoCorto(semanaDesdeLunes(s.inicio))}</td>
                          <td className="px-2.5 py-2.5 text-right tabular-nums text-muted-foreground">
                            {fmtInt.format(s.colaboradores)}
                          </td>
                          <td className="px-2.5 py-2.5 text-right">
                            <Ahorro s={s} />
                          </td>
                          <td className="px-2.5 py-2.5 text-right">
                            <Cobertura s={s} />
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <Estado s={s} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Móvil: una tarjeta por semana, sin scroll horizontal. */}
                <ul className="divide-y divide-border/60 border-t border-border/60 sm:hidden">
                  {filas.map((s) => {
                    const esActual = s.inicio === actual;
                    return (
                      <li
                        key={s.inicio}
                        className={cn("flex items-center justify-between gap-3 px-4 py-3", esActual && "bg-amber-400/[0.04]")}
                        aria-current={esActual ? "true" : undefined}
                      >
                        <div className="min-w-0">
                          <p className="j40-body font-medium tabular-nums">
                            S{s.iso} <span className="font-normal text-muted-foreground">· {rangoCorto(semanaDesdeLunes(s.inicio))}</span>
                          </p>
                          <p className="j40-muted mt-0.5 flex items-center gap-2">
                            {fmtInt.format(s.colaboradores)} colaboradores
                            {esActual && <Pill tone="marca">Actual</Pill>}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <span className="j40-body">
                            <Ahorro s={s} />
                          </span>
                          <Estado s={s} />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </Panel>
        </div>

        <ImportarYProgramar compacto className="self-start" />
      </div>
    </div>
  );
}
