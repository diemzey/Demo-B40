import type { Metadata } from "next";
import Link from "next/link";
import { Upload } from "lucide-react";
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
import { obtenerDatosPanel } from "@/lib/datos/dashboard";
import { rangoSemana } from "@/lib/datos/semana";

// El layout raíz aplica la plantilla "%s · Jornada40"; `absolute` evita duplicar el sufijo.
export const metadata: Metadata = { title: { absolute: "Panel · Jornada40" } };

// Los datos dependen de la sesión (cookies): siempre en tiempo de petición.
export const dynamic = "force-dynamic";

const fmtH = new Intl.NumberFormat("es-MX", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export default async function DashboardPage() {
  const datos = await obtenerDatosPanel();
  const { personas, tope, antes, despues, antes2030, semana, semanas } = datos;

  // Horas al doble por semana para la gráfica de costo; la tarjeta compara
  // contra la semana anterior cuando existe en el historial.
  const semanasHoras = semanas.map((s) => ({ semana: s.iso, horas: s.horasAlDoble }));
  const semanaPrevia = semanas.length >= 2 ? semanas[semanas.length - 2] : undefined;
  const semanaIso = semana?.iso ?? semanas[semanas.length - 1]?.iso;
  const nombreSucursal = datos.sucursal?.nombre ?? "sin sucursal";
  const deltaTope =
    datos.topeAnterior !== null && datos.topeAnterior !== tope
      ? `${tope - datos.topeAnterior > 0 ? "+" : "−"}${Math.abs(tope - datos.topeAnterior)} h vs. ${datos.topeAnio - 1}`
      : undefined;

  return (
    <div className="mx-auto w-full max-w-6xl p-4 md:p-6">
      {datos.aviso === "sin-datos" && (
        <p
          role="status"
          className="mb-4 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-[13px] text-amber-400"
        >
          Estás viendo datos de muestra: importa tu primer CSV en la pestaña{" "}
          <Link href="#semanas" className="font-semibold underline underline-offset-2">
            Semanas
          </Link>
          .
        </p>
      )}

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
          </p>
        </div>
        <Button
          asChild
          size="sm"
          className="bg-yellow-400 text-[13px] font-semibold text-neutral-950 hover:bg-yellow-300"
        >
          <Link href="#semanas">
            <Upload className="mr-2 size-4" strokeWidth={2} aria-hidden="true" />
            Subir semana (CSV)
          </Link>
        </Button>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Horas al doble"
          value={fmtH.format(antes.horasAlDoble)}
          unit="h"
          hint={`Arriba de la hora ${tope} esta semana`}
          delta={`${fmtH.format(despues.horasAlDoble - antes.horasAlDoble)} h`}
          deltaTone="good"
          tone="destructive"
        />
        <StatCard
          label="Fuera de norma"
          value={String(antes.fueraDeNorma)}
          unit={`de ${personas.length}`}
          hint={`Quedan ${despues.fueraDeNorma} tras el reacomodo`}
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
          value={String(tope)}
          unit="h"
          hint="Máximo semanal por colaborador"
          delta={deltaTope}
          deltaTone="neutral"
          tone="amber"
        />
      </div>

      <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="border-border shadow-lg shadow-black/5 xl:col-span-2">
          <CardHeader className="space-y-0.5 p-4 pb-2">
            <CardTitle className="text-[13px] font-semibold">Horas por colaborador</CardTitle>
            <CardDescription className="text-xs">
              Semana {semanaIso} · línea ámbar = tope {tope} h
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <HorasPorPersonaChart personas={personas} tope={tope} topeAnio={datos.topeAnio} />
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <Card className="border-border shadow-lg shadow-black/5">
            <CardHeader className="space-y-0.5 p-4 pb-2">
              <CardTitle className="text-[13px] font-semibold">Antes vs. reacomodada</CardTitle>
              <CardDescription className="text-xs">
                Exceso sobre el tope con los mismos contratos
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
