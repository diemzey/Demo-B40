import type { Metadata } from "next";
import { TriangleAlert, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StatCard } from "@/components/dashboard/stat-card";
import { CostoKpi } from "@/components/dashboard/costo-kpi";
import {
  AntesDespuesChart,
  CostoSemanalChart,
  HorasPorPersonaChart,
} from "@/components/dashboard/charts";
import { DiagnosticoTabla } from "@/components/dashboard/diagnostico-tabla";
import { ProgramarSemana } from "@/components/dashboard/programar-semana";
import { obtenerDatosPanel } from "@/lib/datos/dashboard";
import { rangoSemana } from "@/lib/datos/semana";
import type { ProgramacionPanel } from "@/lib/datos/tipos";

// El layout raíz aplica la plantilla "%s · Jornada40"; `absolute` evita duplicar el sufijo.
export const metadata: Metadata = { title: { absolute: "Panel · Jornada40" } };

// Los datos dependen de la sesión (cookies): siempre en tiempo de petición.
export const dynamic = "force-dynamic";

const fmtH = new Intl.NumberFormat("es-MX", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const fmtMXN = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});
const fmtPct = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 1 });

/** Signo tipográfico ("−" en lugar de "-") para deltas. */
const conSigno = (v: number, texto: string) => (v < 0 ? `−${texto}` : v > 0 ? `+${texto}` : texto);
const cobertura = (v: number | null) => (v === null ? "—" : fmtPct.format(v));

/**
 * Tarjetas de la semana ya programada: cada cifra viene de Postgres
 * (`resumen_escenario` del baseline y `v_ahorro_escenario`), no se recalcula.
 */
function TarjetasProgramadas({
  prog,
  tope,
  fueraAntes,
  fueraDespues,
  colaboradores,
  etiquetaVacantes,
}: {
  prog: ProgramacionPanel;
  tope: number;
  fueraAntes: number;
  fueraDespues: number;
  colaboradores: number;
  etiquetaVacantes: string | null;
}) {
  const ahorroPositivo = prog.ahorroMxn > 0;
  const cobBase = prog.coberturaPicoBaselinePct;
  const cobProp = prog.coberturaPicoPropuestaPct;
  const deltaCob = cobBase !== null && cobProp !== null ? cobProp - cobBase : null;
  return (
    <>
      <StatCard
        label="Horas al doble"
        value={fmtH.format(prog.horasDoblesBaseline)}
        unit="h"
        hint={`Hoy, arriba de la hora ${tope} · con la propuesta: 0 h`}
        delta={`−${fmtH.format(prog.horasDoblesBaseline)} h`}
        deltaTone="good"
        tone={prog.horasDoblesBaseline > 0 ? "destructive" : "default"}
      />
      <StatCard
        label="Fuera de norma"
        value={String(fueraAntes)}
        unit={`de ${colaboradores}`}
        hint={`Quedan ${fueraDespues} con la propuesta${etiquetaVacantes ? ` · ${etiquetaVacantes}` : ""}`}
        delta={conSigno(fueraDespues - fueraAntes, String(Math.abs(fueraDespues - fueraAntes)))}
        deltaTone="good"
        tone={fueraAntes > 0 ? "destructive" : "default"}
      />
      <StatCard
        label="Costo laboral semanal"
        value={fmtMXN.format(prog.costoBaseline)}
        hint={`Con la propuesta: ${fmtMXN.format(prog.costoPropuesta)} · ahorro ${fmtMXN.format(prog.ahorroMxn)}`}
        delta={conSigno(-prog.ahorroPct, `${fmtPct.format(Math.abs(prog.ahorroPct))} %`)}
        deltaTone={ahorroPositivo ? "good" : prog.ahorroMxn < 0 ? "bad" : "neutral"}
      />
      <StatCard
        label="Cobertura pico"
        value={cobertura(cobBase)}
        unit={cobBase !== null ? "%" : undefined}
        hint={
          cobProp === null
            ? "Sin intervalos pico en el pronóstico de la semana"
            : `Con la propuesta: ${cobertura(cobProp)} %${
                prog.deficitPicoHoras > 0 ? ` · faltan ${fmtH.format(prog.deficitPicoHoras)} h en picos` : ""
              }`
        }
        delta={deltaCob === null ? undefined : conSigno(deltaCob, `${fmtPct.format(Math.abs(deltaCob))} pts`)}
        deltaTone={deltaCob === null || deltaCob === 0 ? "neutral" : deltaCob > 0 ? "good" : "bad"}
        tone="amber"
      />
    </>
  );
}

export default async function DashboardPage() {
  const datos = await obtenerDatosPanel();
  // Cuenta real sin datos: el layout muestra el onboarding en vez del shell,
  // así que no hay nada que pintar aquí.
  if (datos.sinDatos) return null;
  const { personas, tope, antes, despues, antes2030, semana, semanas, programacion } = datos;

  // Horas al doble por semana para la gráfica de costo; la tarjeta compara
  // contra la semana anterior cuando existe en el historial.
  const semanasHoras = semanas.map((s) => ({ semana: s.iso, horas: s.horasAlDoble }));
  const semanaPrevia = semanas.length >= 2 ? semanas[semanas.length - 2] : undefined;
  const semanaIso = semana?.iso ?? semanas[semanas.length - 1]?.iso;
  const nombreSucursal = datos.sucursal?.nombre ?? "sin sucursal";
  // Lo que el reacomodo (o la propuesta) no pudo cubrir con la plantilla actual.
  const vacantes = despues.vacantes ?? 0;
  const sinCubrir = despues.horasSinCubrir ?? 0;
  const etiquetaVacantes = `${vacantes} ${vacantes === 1 ? "vacante" : "vacantes"}`;
  const deltaTope =
    datos.topeAnterior !== null && datos.topeAnterior !== datos.topeLegal
      ? `${datos.topeLegal - datos.topeAnterior > 0 ? "+" : "−"}${Math.abs(datos.topeLegal - datos.topeAnterior)} h vs. ${datos.topeAnio - 1}`
      : undefined;
  // Sin propuesta, el panel diagnostica contra el objetivo (40 h); con ella, contra su tope.
  const etiquetaTope = programacion ? `tope de la propuesta ${tope} h` : `tope objetivo ${tope} h`;

  return (
    <div className="mx-auto w-full max-w-6xl p-4 md:p-6">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-400">
            Diagnóstico
          </p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight md:text-2xl">
            Sucursal {nombreSucursal}
            {semanaIso !== undefined && <> · semana {semanaIso}</>}
          </h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            {personas.length} colaboradores
            {semana && <> · turnos del {rangoSemana(semana)}</>}
            {programacion ? <> · propuesta a {tope} h</> : <> · {etiquetaTope}</>}
          </p>
        </div>
        <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-start">
          <ProgramarSemana />
          <Button asChild size="sm" variant="outline" className="text-[13px] font-medium">
            <a href="#semanas">
              <Upload className="mr-2 size-4" strokeWidth={2} aria-hidden="true" />
              Subir semana (CSV)
            </a>
          </Button>
        </div>
      </div>

      {!programacion && datos.origen === "supabase" && (
        <div
          role="status"
          className="mb-4 flex items-start gap-2.5 rounded-lg border border-amber-400/30 bg-amber-400/[0.06] px-4 py-3 text-[13px]"
        >
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-400" aria-hidden="true" />
          <p className="text-muted-foreground">
            <span className="font-medium text-foreground">Esta semana aún no está programada:</span>{" "}
            presiona <span className="font-medium text-foreground">Programar semana</span> para
            generar la propuesta a {datos.tope2030} h.
          </p>
        </div>
      )}

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {programacion ? (
          <TarjetasProgramadas
            prog={programacion}
            tope={tope}
            fueraAntes={antes.fueraDeNorma}
            fueraDespues={despues.fueraDeNorma}
            colaboradores={personas.length}
            etiquetaVacantes={vacantes > 0 ? etiquetaVacantes : null}
          />
        ) : (
          <>
            <StatCard
              label="Horas al doble"
              value={fmtH.format(antes.horasAlDoble)}
              unit="h"
              hint={`Arriba de la hora ${tope} (${datos.origen === "supabase" ? "tope objetivo" : "tope vigente"}) esta semana`}
              delta={`${fmtH.format(despues.horasAlDoble - antes.horasAlDoble)} h`}
              deltaTone="good"
              tone="destructive"
            />
            <StatCard
              label="Fuera de norma"
              value={String(antes.fueraDeNorma)}
              unit={`de ${personas.length}`}
              hint={`Quedan ${despues.fueraDeNorma} tras el reacomodo${vacantes > 0 ? ` · ${etiquetaVacantes}` : ""}`}
              delta={`${despues.fueraDeNorma - antes.fueraDeNorma}`}
              deltaTone="good"
              tone="destructive"
            />
            <CostoKpi
              horasActual={antes.horasAlDoble}
              horasPrevia={semanaPrevia?.horasAlDoble}
              semanaPrevia={semanaPrevia?.iso}
            />
            <StatCard
              label={`Tope ${datos.topeAnio}`}
              value={String(datos.topeLegal)}
              unit="h"
              hint={
                datos.topeLegal === tope
                  ? "Máximo semanal por colaborador"
                  : `Máximo legal este año · el panel optimiza a ${tope} h`
              }
              delta={deltaTope}
              deltaTone="neutral"
              tone="amber"
            />
          </>
        )}
      </div>

      <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="border-border shadow-lg shadow-black/5 xl:col-span-2">
          <CardHeader className="space-y-0.5 p-4 pb-2">
            <CardTitle className="text-[13px] font-semibold">Horas por colaborador</CardTitle>
            <CardDescription className="text-xs">
              Semana {semanaIso} · línea ámbar = {etiquetaTope}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <HorasPorPersonaChart
              personas={personas}
              tope={tope}
              topeAnio={tope === datos.topeLegal ? datos.topeAnio : undefined}
            />
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <Card className="border-border shadow-lg shadow-black/5">
            <CardHeader className="space-y-0.5 p-4 pb-2">
              <CardTitle className="text-[13px] font-semibold">
                {programacion ? "Antes vs. propuesta" : "Antes vs. reacomodada"}
              </CardTitle>
              <CardDescription className="text-xs">
                Exceso sobre el tope con los mismos contratos
                {sinCubrir > 0 && <> · Sin cubrir: {fmtH.format(sinCubrir)} h → {etiquetaVacantes}</>}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-1">
              <AntesDespuesChart
                resumen={{
                  horasAntes: antes.horasAlDoble,
                  horasDespues: despues.horasAlDoble,
                  personasAntes: antes.fueraDeNorma,
                  personasDespues: despues.fueraDeNorma,
                  totalPersonas: personas.length,
                }}
              />
            </CardContent>
          </Card>

          <Card className="border-border shadow-lg shadow-black/5">
            <CardHeader className="space-y-0.5 p-4 pb-2">
              <CardTitle className="text-[13px] font-semibold">Costo extra por semana</CardTitle>
              <CardDescription className="text-xs">
                Horas al doble × costo por hora × 2 · MXN
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-1">
              <CostoSemanalChart
                semanas={semanasHoras}
                nota={
                  datos.origen === "supabase"
                    ? `${semanas.length} ${semanas.length === 1 ? "semana importada" : "semanas importadas"} de ${nombreSucursal} · horas al doble × costo por hora × 2.`
                    : undefined
                }
              />
            </CardContent>
          </Card>
        </div>
      </div>

      <DiagnosticoTabla
        personas={personas}
        tope={tope}
        antes={antes}
        despues={despues}
        antes2030={antes2030}
      />
    </div>
  );
}
