import type { Metadata } from "next";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/dashboard/stat-card";
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

export default function DashboardPage() {
  return (
    <div className="mx-auto w-full max-w-6xl p-4 md:p-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-400">
            Diagnóstico
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">
            Sucursal Coapa · semana 31
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {PLANTILLA_COAPA.length} colaboradores · turnos del 28 de julio al 3 de agosto
          </p>
        </div>
        <Button className="bg-yellow-400 font-semibold text-neutral-950 hover:bg-yellow-300">
          <Upload className="mr-2 size-4" strokeWidth={2} aria-hidden="true" />
          Subir semana (CSV)
        </Button>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Horas al doble"
          value={antes.horasAlDoble.toFixed(1)}
          unit="h"
          hint="Arriba de la hora 47 esta semana"
          tone="destructive"
        />
        <StatCard
          label="Fuera de norma"
          value={String(antes.fueraDeNorma)}
          unit={`de ${PLANTILLA_COAPA.length}`}
          hint="Colaboradores que exceden el tope"
          tone="destructive"
        />
        <StatCard
          label="Sin cubrir"
          value="420.3"
          unit="h"
          hint="Horas que hay que reacomodar"
        />
        <StatCard
          label="Tope 2027"
          value={String(TOPE_2027)}
          unit="h"
          hint="Máximo semanal por colaborador"
          tone="amber"
        />
      </div>

      <section id="colaboradores" className="scroll-mt-20">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-base font-semibold">Colaboradores</h2>
          <span className="text-xs text-muted-foreground">
            Estado calculado contra el tope de {TOPE_2027} h
          </span>
        </div>
        <ColaboradoresTable rows={colaboradores} />
      </section>
    </div>
  );
}
