"use client";

import { Upload } from "lucide-react";
import { SEMANAS, SEMANA_ACTUAL, type EstadoSemana } from "@/components/dashboard/semanas-data";
import { TOPE_2027 } from "@/components/dashboard/colaboradores-table";
import { Panel, PanelHeader, Pill, TabHeader, type PillTone } from "@/components/dashboard/tabs/ui";

const TONO: Record<EstadoSemana, PillTone> = {
  Diagnosticada: "amber",
  Reacomodada: "good",
  Pendiente: "neutral",
};

const fmtH = new Intl.NumberFormat("es-MX", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export function SemanasTab() {
  const semanas = [...SEMANAS].reverse();
  return (
    <div className="mx-auto w-full max-w-6xl p-4 md:p-6">
      <TabHeader
        eyebrow="Semanas"
        title="Semanas · Sucursal Coapa"
        subtitle={`Semanas ${SEMANAS[0].semana}–${SEMANA_ACTUAL} · horas al doble contra el tope de ${TOPE_2027} h`}
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Panel className="xl:col-span-2">
          <PanelHeader
            title="Historial"
            description="Las semanas 24–30 son datos de muestra; la 31 se calcula de la plantilla."
          />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-[13px] [&_td]:whitespace-nowrap [&_th]:whitespace-nowrap">
              <thead>
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="h-9 px-4 font-medium">Semana</th>
                  <th className="h-9 px-2.5 font-medium">Fechas</th>
                  <th className="h-9 px-2.5 text-right font-medium">Horas al doble</th>
                  <th className="h-9 px-2.5 text-right font-medium">Fuera de norma</th>
                  <th className="h-9 px-4 text-right font-medium">Estado</th>
                </tr>
              </thead>
              <tbody>
                {semanas.map((s) => {
                  const actual = s.semana === SEMANA_ACTUAL;
                  return (
                    <tr
                      key={s.semana}
                      className={`border-t border-border/60 ${actual ? "bg-amber-400/[0.04]" : ""}`}
                      aria-current={actual ? "true" : undefined}
                    >
                      <td className="px-4 py-2.5 font-medium tabular-nums">
                        <span className="inline-flex items-center gap-2">
                          S{s.semana}
                          {actual && <Pill tone="amber">Actual</Pill>}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-2.5 py-2.5 text-muted-foreground">{s.fechas}</td>
                      <td className="px-2.5 py-2.5 text-right tabular-nums text-destructive">
                        {fmtH.format(s.horasAlDoble)} h
                      </td>
                      <td className="px-2.5 py-2.5 text-right tabular-nums">{s.fueraDeNorma} de 30</td>
                      <td className="px-4 py-2.5 text-right">
                        <Pill tone={TONO[s.estado]}>{s.estado}</Pill>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel className="self-start">
          <PanelHeader title="Subir semana (CSV)" description="Turnos por colaborador, una fila por día." />
          <div className="flex flex-col gap-3 p-4 pt-2">
            <label
              htmlFor="csv-semana"
              className="flex cursor-not-allowed flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border px-4 py-6 text-center text-xs text-muted-foreground opacity-70"
            >
              <Upload className="size-5" strokeWidth={1.5} aria-hidden="true" />
              <span>Arrastra el CSV o elige un archivo</span>
              <input
                id="csv-semana"
                type="file"
                accept=".csv,text/csv"
                disabled
                className="sr-only"
                aria-describedby="csv-nota"
              />
            </label>
            <p id="csv-nota" className="text-[11px] text-muted-foreground">
              La carga de CSV aún no está conectada en esta demo; las semanas de arriba se generan de
              la plantilla de ejemplo.
            </p>
          </div>
        </Panel>
      </div>
    </div>
  );
}
