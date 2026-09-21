"use client";

import { useRouter } from "next/navigation";
import { ImportarCsv } from "@/components/dashboard/importar-csv";
import { SEMANAS, SEMANA_ACTUAL, type EstadoSemana } from "@/components/dashboard/semanas-data";
import { Panel, PanelHeader, Pill, TabHeader, type PillTone } from "@/components/dashboard/tabs/ui";
import { usePanel } from "@/lib/datos/panel-context";
import { rangoCorto, semanaDesdeLunes } from "@/lib/datos/semana";

const TONO: Record<EstadoSemana, PillTone> = {
  Diagnosticada: "amber",
  Reacomodada: "good",
  Pendiente: "neutral",
};

const fmtH = new Intl.NumberFormat("es-MX", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

type Fila = {
  clave: string;
  iso: number;
  fechas: string;
  horasAlDoble: number;
  fueraDeNorma: number;
  colaboradores: number;
  estado: EstadoSemana;
  actual: boolean;
};

export function SemanasTab() {
  const datos = usePanel();
  const router = useRouter();
  const real = datos.origen === "supabase";

  // Supabase: historial de la sucursal (ascendente) → más reciente arriba.
  // Demo: las semanas de muestra de siempre.
  const filas: Fila[] = real
    ? [...datos.semanas].reverse().map((s) => ({
        clave: s.inicio,
        iso: s.iso,
        fechas: rangoCorto(semanaDesdeLunes(s.inicio)),
        horasAlDoble: s.horasAlDoble,
        fueraDeNorma: s.fueraDeNorma,
        colaboradores: s.colaboradores,
        estado: s.horasAlDoble > 0 ? "Diagnosticada" : "Reacomodada",
        actual: s.inicio === datos.semana?.inicio,
      }))
    : [...SEMANAS].reverse().map((s) => ({
        clave: String(s.semana),
        iso: s.semana,
        fechas: s.fechas,
        horasAlDoble: s.horasAlDoble,
        fueraDeNorma: s.fueraDeNorma,
        colaboradores: datos.personas.length,
        estado: s.estado,
        actual: s.semana === SEMANA_ACTUAL,
      }));

  const primera = filas[filas.length - 1];
  const ultima = filas[0];
  const sucursal = datos.sucursal?.nombre ?? "Coapa";
  const rango =
    filas.length === 0
      ? "Sin semanas todavía"
      : primera.iso === ultima.iso
        ? `Semana ${ultima.iso}`
        : `Semanas ${primera.iso}–${ultima.iso}`;

  return (
    <div className="mx-auto w-full max-w-6xl p-4 md:p-6">
      <TabHeader
        eyebrow="Semanas"
        title={`Semanas · Sucursal ${sucursal}`}
        subtitle={`${rango} · horas al doble contra el tope de ${datos.tope} h`}
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Panel className="xl:col-span-2">
          <PanelHeader
            title="Historial"
            description={
              real
                ? "Cada semana importada desde CSV, con su exceso sobre el tope legal del año."
                : "Las semanas 24–30 son datos de muestra; la 31 se calcula de la plantilla."
            }
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
                {filas.length === 0 && (
                  <tr className="border-t border-border/60">
                    <td colSpan={5} className="px-4 py-6 text-center text-xs text-muted-foreground">
                      Importa tu primer CSV para ver el historial aquí.
                    </td>
                  </tr>
                )}
                {filas.map((s) => (
                  <tr
                    key={s.clave}
                    className={`border-t border-border/60 ${s.actual ? "bg-amber-400/[0.04]" : ""}`}
                    aria-current={s.actual ? "true" : undefined}
                  >
                    <td className="px-4 py-2.5 font-medium tabular-nums">
                      <span className="inline-flex items-center gap-2">
                        S{s.iso}
                        {s.actual && <Pill tone="amber">Actual</Pill>}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-2.5 py-2.5 text-muted-foreground">{s.fechas}</td>
                    <td className="px-2.5 py-2.5 text-right tabular-nums text-destructive">
                      {fmtH.format(s.horasAlDoble)} h
                    </td>
                    <td className="px-2.5 py-2.5 text-right tabular-nums">
                      {s.fueraDeNorma} de {s.colaboradores}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <Pill tone={TONO[s.estado]}>{s.estado}</Pill>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <ImportarCsv className="self-start" onImportado={() => router.refresh()} />
      </div>
    </div>
  );
}
