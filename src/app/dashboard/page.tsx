import type { Metadata } from "next";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BarridoInicial, Comparacion, type FilaComparacion } from "@/components/dashboard/comparacion";
import { mxnCompacto } from "@/lib/formato";
import { CoberturaSemana } from "@/components/dashboard/cobertura-semana";
import { DeltasPersona } from "@/components/dashboard/deltas-persona";
import { DiagnosticoTabla } from "@/components/dashboard/diagnostico-tabla";
import { ProgramarSemana } from "@/components/dashboard/programar-semana";
import { SelectorSemana } from "@/components/dashboard/selector-semana";
import { obtenerDatosPanel } from "@/lib/datos/dashboard";
import { rangoLargo } from "@/lib/datos/semana";

// El layout raíz aplica la plantilla "%s · Jornada40"; `absolute` evita duplicar el sufijo.
export const metadata: Metadata = { title: { absolute: "Panel · Jornada40" } };

// Los datos dependen de la sesión (cookies): siempre en tiempo de petición.
export const dynamic = "force-dynamic";

const fmtH = new Intl.NumberFormat("es-MX", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const fmtMXN = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });
const fmtPct = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 1 });
const fmtInt = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 0 });

const horas = (h: number) => `${fmtH.format(h)} h`;
const pct = (v: number | null) => (v === null ? "—" : `${fmtPct.format(v)} %`);
const plural = (n: number, uno: string, varios: string) => `${fmtInt.format(n)} ${n === 1 ? uno : varios}`;

export default async function DashboardPage() {
  const datos = await obtenerDatosPanel();
  // Cuenta real sin datos: el layout muestra el onboarding en vez del shell,
  // así que no hay nada que pintar aquí.
  if (datos.sinDatos) return null;
  const { personas, tope, antes, despues, semana, programacion } = datos;

  const nombreSucursal = datos.sucursal?.nombre ?? "sin sucursal";
  const vacantes = despues.vacantes ?? 0;
  const sinCubrir = despues.horasSinCubrir ?? 0;

  const subirSemana = (
    <Button asChild size="sm" variant="outline">
      <a href="#semanas">
        <Upload className="mr-2 size-4" strokeWidth={1.5} aria-hidden="true" />
        Subir semana
      </a>
    </Button>
  );

  return (
    <div className="mx-auto w-full max-w-6xl p-4 md:p-6">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="j40-eyebrow">Diagnóstico</p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight md:text-2xl">
            Sucursal {nombreSucursal}
            {semana && <> · semana {rangoLargo(semana)}</>}
          </h1>
          <p className="j40-body mt-1 text-muted-foreground">
            {plural(personas.length, "colaborador", "colaboradores")}
            {semana && <> · semana {semana.iso}</>}
            {programacion ? <> · propuesta a {tope} h</> : <> · tope objetivo {tope} h</>}
            {datos.origen === "demo" && <> · datos de muestra</>}
          </p>
        </div>
        <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center">
          <SelectorSemana />
          {programacion && <ProgramarSemana />}
          {subirSemana}
        </div>
      </div>

      {programacion ? (
        <Programado datos={datos} vacantes={vacantes} sinCubrir={sinCubrir} />
      ) : (
        <section
          aria-label="Sin propuesta todavía"
          className="mb-4 rounded-lg border border-amber-400/30 bg-card p-4 shadow-lg shadow-black/5 md:p-5"
        >
          <p className="j40-eyebrow">Tu semana, como está hoy</p>
          <div className="mt-2 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
              <div>
                <dt className="j40-muted">Horas al doble</dt>
                <dd className={`mt-0.5 text-2xl font-semibold tabular-nums ${antes.horasAlDoble > 0 ? "text-destructive" : ""}`}>
                  {horas(antes.horasAlDoble)}
                </dd>
              </div>
              <div>
                <dt className="j40-muted">Fuera de norma</dt>
                <dd className={`mt-0.5 text-2xl font-semibold tabular-nums ${antes.fueraDeNorma > 0 ? "text-destructive" : ""}`}>
                  {fmtInt.format(antes.fueraDeNorma)}
                  <span className="ml-1 text-sm font-medium text-muted-foreground">de {fmtInt.format(personas.length)}</span>
                </dd>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <dt className="j40-muted">Con la propuesta</dt>
                <dd className="j40-body mt-1 text-muted-foreground">
                  Sin propuesta todavía. Genérala en un clic y verás el ahorro y quién cambia de horas.
                </dd>
              </div>
            </dl>
            <ProgramarSemana className="shrink-0" />
          </div>
        </section>
      )}

      {!programacion && (
        <DiagnosticoTabla personas={personas} tope={tope} etiquetaPropuesta="Reacomodada" />
      )}
    </div>
  );
}

/** Semana con propuesta publicada: héroe + comparación, cobertura, deltas y el detalle. */
function Programado({
  datos,
  vacantes,
  sinCubrir,
}: {
  datos: Awaited<ReturnType<typeof obtenerDatosPanel>>;
  vacantes: number;
  sinCubrir: number;
}) {
  const { personas, tope, antes, despues, programacion } = datos;
  if (!programacion) return null;
  const prog = programacion;
  const cobBase = prog.coberturaPicoBaselinePct;
  const cobProp = prog.coberturaPicoPropuestaPct;

  const filas: FilaComparacion[] = [
    {
      etiqueta: "Costo laboral semanal",
      hoy: fmtMXN.format(prog.costoBaseline),
      propuesta: fmtMXN.format(prog.costoPropuesta),
      tonoPropuesta: prog.ahorroMxn > 0 ? "mejora" : prog.ahorroMxn < 0 ? "duele" : "neutral",
    },
    {
      etiqueta: "Horas al doble",
      hoy: horas(prog.horasDoblesBaseline),
      propuesta: horas(despues.horasAlDoble),
      tonoHoy: prog.horasDoblesBaseline > 0 ? "duele" : "neutral",
      tonoPropuesta: despues.horasAlDoble === 0 ? "mejora" : despues.horasAlDoble < prog.horasDoblesBaseline ? "atencion" : "duele",
    },
    {
      etiqueta: "Fuera de norma",
      hoy: `${fmtInt.format(antes.fueraDeNorma)} de ${fmtInt.format(personas.length)}`,
      propuesta: `${fmtInt.format(despues.fueraDeNorma)} de ${fmtInt.format(personas.length)}`,
      tonoHoy: antes.fueraDeNorma > 0 ? "duele" : "neutral",
      tonoPropuesta: despues.fueraDeNorma === 0 ? "mejora" : despues.fueraDeNorma < antes.fueraDeNorma ? "atencion" : "duele",
    },
    {
      etiqueta: "Cobertura pico",
      hoy: pct(cobBase),
      propuesta: pct(cobProp),
      tonoPropuesta:
        cobBase === null || cobProp === null || cobProp === cobBase
          ? "neutral"
          : cobProp > cobBase
            ? "mejora"
            : cobProp >= 95
              ? "atencion"
              : "duele",
    },
  ];

  const notas: React.ReactNode[] = [];
  if (vacantes > 0) {
    notas.push(
      <>
        {plural(vacantes, "vacante sugerida", "vacantes sugeridas")} de {tope} h · {horas(sinCubrir)} que no caben en la plantilla
      </>,
    );
  } else if (prog.deficitPicoHoras > 0) {
    notas.push(<>Faltan {horas(prog.deficitPicoHoras)} en horas pico con la propuesta</>);
  }
  if (cobBase === null) notas.push(<>La semana no tiene intervalos pico en el pronóstico</>);

  return (
    <BarridoInicial publicadoEn={prog.publicadoEn} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        <Comparacion
          className="xl:col-span-2"
          ahorroMxn={prog.ahorroMxn}
          sufijo="/semana"
          detalle={
            <>
              {fmtPct.format(Math.abs(prog.ahorroPct))} % del costo laboral · ≈ {mxnCompacto(prog.ahorroMxn * 52)} al año
            </>
          }
          filas={filas}
          notas={notas}
        />
        {prog.cobertura.length > 0 ? (
          <section
            aria-label="Cobertura de la semana"
            className="min-w-0 rounded-lg border border-border bg-card p-4 shadow-lg shadow-black/5 xl:col-span-3"
          >
            <div className="mb-2 flex flex-col gap-0.5">
              <h2 className="j40-body font-semibold">Cobertura de la semana</h2>
              <p className="j40-muted">
                Personas requeridas por la demanda contra las que hay hoy y con la propuesta, cada 30 minutos.
              </p>
            </div>
            <CoberturaSemana cobertura={prog.cobertura} deficitPicoHoras={prog.deficitPicoHoras} />
          </section>
        ) : (
          // Sin cobertura por intervalo (escenario sin materializar): la lista de deltas ocupa su lugar.
          <DeltasPersona personas={personas} tope={tope} className="min-w-0 xl:col-span-3" />
        )}
      </div>
      {prog.cobertura.length > 0 && <DeltasPersona personas={personas} tope={tope} />}
      <DiagnosticoTabla personas={personas} tope={tope} />
    </BarridoInicial>
  );
}
