import type { Metadata } from "next";
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
import { SEMANAS, SEMANA_ACTUAL } from "@/components/dashboard/semanas-data";
import {
  ColaboradoresTable,
  TOPE_2027,
  type Colaborador,
} from "@/components/dashboard/colaboradores-table";
import { PLANTILLA_COAPA, resumenDe } from "@/components/demo/plantilla-coapa";

// El layout raíz aplica la plantilla "%s · Jornada40"; `absolute` evita duplicar el sufijo.
export const metadata: Metadata = { title: { absolute: "Panel · Jornada40" } };

// Misma plantilla sintética que usa la portada; las cifras se derivan de ella.
const colaboradores: Colaborador[] = PLANTILLA_COAPA;
const antes = resumenDe(PLANTILLA_COAPA, "hoy", TOPE_2027);
const despues = resumenDe(PLANTILLA_COAPA, "reacomodada", TOPE_2027);

// Horas al doble por semana (24–30 de muestra, 31 real); el costo por hora se
// lee de la configuración guardada en el cliente (60 MXN por defecto).
const semanasHoras = SEMANAS.map((s) => ({ semana: s.semana, horas: s.horasAlDoble }));
const semanaPrevia = SEMANAS[SEMANAS.length - 2];

const fmtH = new Intl.NumberFormat("es-MX", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export default function DashboardPage() {
  return (
    <div className="mx-auto w-full max-w-6xl p-4 md:p-6">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-400">
            Diagnóstico
          </p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight md:text-2xl">
            Sucursal Coapa · semana {SEMANA_ACTUAL}
          </h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            {PLANTILLA_COAPA.length} colaboradores · turnos del 28 de julio al 3 de agosto
          </p>
        </div>
        <Button
          size="sm"
          className="bg-yellow-400 text-[13px] font-semibold text-neutral-950 hover:bg-yellow-300"
        >
          <Upload className="mr-2 size-4" strokeWidth={2} aria-hidden="true" />
          Subir semana (CSV)
        </Button>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Horas al doble"
          value={fmtH.format(antes.horasAlDoble)}
          unit="h"
          hint={`Arriba de la hora ${TOPE_2027} esta semana`}
          delta={`${fmtH.format(despues.horasAlDoble - antes.horasAlDoble)} h`}
          deltaTone="good"
          tone="destructive"
        />
        <StatCard
          label="Fuera de norma"
          value={String(antes.fueraDeNorma)}
          unit={`de ${PLANTILLA_COAPA.length}`}
          hint={`Quedan ${despues.fueraDeNorma} tras el reacomodo`}
          delta={`${despues.fueraDeNorma - antes.fueraDeNorma}`}
          deltaTone="good"
          tone="destructive"
        />
        <CostoKpi
          horasActual={antes.horasAlDoble}
          horasPrevia={semanaPrevia.horasAlDoble}
          semanaPrevia={semanaPrevia.semana}
        />
        <StatCard
          label="Tope 2027"
          value={String(TOPE_2027)}
          unit="h"
          hint="Máximo semanal por colaborador"
          delta="−2 h vs. 2026"
          deltaTone="neutral"
          tone="amber"
        />
      </div>

      <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="border-border shadow-lg shadow-black/5 xl:col-span-2">
          <CardHeader className="space-y-0.5 p-4 pb-2">
            <CardTitle className="text-[13px] font-semibold">Horas por colaborador</CardTitle>
            <CardDescription className="text-xs">
              Semana {SEMANA_ACTUAL} · línea ámbar = tope {TOPE_2027} h
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <HorasPorPersonaChart personas={PLANTILLA_COAPA} />
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
                  totalPersonas: PLANTILLA_COAPA.length,
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
              <CostoSemanalChart semanas={semanasHoras} />
            </CardContent>
          </Card>
        </div>
      </div>

      <Card id="tabla-colaboradores" className="scroll-mt-20 border-border shadow-lg shadow-black/5">
        <CardHeader className="flex-row items-baseline justify-between space-y-0 p-4 pb-2">
          <div className="space-y-0.5">
            <CardTitle className="text-[13px] font-semibold">Colaboradores</CardTitle>
            <CardDescription className="text-xs">
              Estado calculado contra el tope de {TOPE_2027} h
            </CardDescription>
          </div>
          <span className="text-xs tabular-nums text-muted-foreground">
            {colaboradores.length} personas
          </span>
        </CardHeader>
        <CardContent className="p-0">
          <ColaboradoresTable rows={colaboradores} />
        </CardContent>
      </Card>
    </div>
  );
}
