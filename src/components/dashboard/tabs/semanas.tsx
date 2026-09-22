"use client";

import { useRouter } from "next/navigation";
import { ImportarCsv } from "@/components/dashboard/importar-csv";
import { Panel, PanelHeader, Pill, TabHeader } from "@/components/dashboard/tabs/ui";
import { usePanel } from "@/lib/datos/panel-context";
import { rangoCorto, semanaDesdeLunes } from "@/lib/datos/semana";

const fmtH = new Intl.NumberFormat("es-MX", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const fmtMXN = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

type Fila = {
  clave: string;
  iso: number;
  fechas: string;
  horasAlDoble: number;
  fueraDeNorma: number;
  colaboradores: number;
  /** Propuesta publicada para la semana (`v_ahorro_escenario`). */
  programada: boolean;
  ahorroMxn?: number;
  actual: boolean;
};

export function SemanasTab() {
  const datos = usePanel();
  const router = useRouter();
  const real = datos.origen === "supabase";

  // Historial de la sucursal (ascendente) → más reciente arriba. En demo son
  // las semanas de muestra, con la misma forma.
  const filas: Fila[] = [...datos.semanas].reverse().map((s) => ({
    clave: s.inicio,
    iso: s.iso,
    fechas: rangoCorto(semanaDesdeLunes(s.inicio)),
    horasAlDoble: s.horasAlDoble,
    fueraDeNorma: s.fueraDeNorma,
    colaboradores: s.colaboradores,
    programada: s.programada,
    ahorroMxn: s.ahorroMxn,
    actual: s.inicio === datos.semana?.inicio,
  }));
  const conAhorro = filas.some((f) => f.ahorroMxn !== undefined);
  const columnas = conAhorro ? 6 : 5;

  const primera = filas[filas.length - 1];
  const ultima = filas[0];
  const sucursal = datos.sucursal?.nombre ?? "Coapa";
  const rango =
    filas.length === 0
      ? "Sin semanas todavía"
      : primera.iso === ultima.iso
        ? `Semana ${ultima.iso}`
        : `Semanas ${primera.iso}–${ultima.iso}`;
  const programadas = filas.filter((f) => f.programada).length;

  return (
    <div className="mx-auto w-full max-w-6xl p-4 md:p-6">
      <TabHeader
        eyebrow="Semanas"
        title={`Semanas · Sucursal ${sucursal}`}
        subtitle={`${rango} · ${programadas} de ${filas.length} ${filas.length === 1 ? "programada" : "programadas"} · semana actual contra el tope de ${datos.tope} h`}
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Panel className="xl:col-span-2">
          <PanelHeader
            title="Historial"
            description={
              real
                ? `Cada semana importada desde CSV. La semana actual se mide contra ${datos.tope} h; las anteriores contra el tope legal de su año (${datos.topeLegal} h). "Programada" = propuesta publicada con su ahorro.`
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
                  {conAhorro && <th className="h-9 px-2.5 text-right font-medium">Ahorro · semana</th>}
                  <th className="h-9 px-4 text-right font-medium">Estado</th>
                </tr>
              </thead>
              <tbody>
                {filas.length === 0 && (
                  <tr className="border-t border-border/60">
                    <td colSpan={columnas} className="px-4 py-6 text-center text-xs text-muted-foreground">
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
                    {conAhorro && (
                      <td className="px-2.5 py-2.5 text-right tabular-nums">
                        {s.ahorroMxn === undefined ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          <span className={s.ahorroMxn >= 0 ? "font-medium text-emerald-400" : "text-destructive"}>
                            {fmtMXN.format(s.ahorroMxn)}
                          </span>
                        )}
                      </td>
                    )}
                    <td className="px-4 py-2.5 text-right">
                      <Pill tone={s.programada ? "good" : "neutral"}>
                        {s.programada ? "Programada" : "Sin programar"}
                      </Pill>
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
