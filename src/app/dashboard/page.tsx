import type { Metadata } from "next";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/dashboard/stat-card";
import {
  ColaboradoresTable,
  TOPE_2027,
  type Colaborador,
} from "@/components/dashboard/colaboradores-table";

// El layout raíz aplica la plantilla "%s · Jornada40"; `absolute` evita duplicar el sufijo.
export const metadata: Metadata = { title: { absolute: "Panel · Jornada40" } };

const colaboradores: Colaborador[] = [
  { nombre: "Ortega Bruno", foto: "/avatars/ortega-bruno.jpg", hoy: 49.0, reacomodada: 40.0 },
  { nombre: "Cárdenas Ismael", foto: "/avatars/cardenas-ismael.jpg", hoy: 49.0, reacomodada: 39.5 },
  { nombre: "Quintero Diego", foto: "/avatars/quintero-diego.jpg", hoy: 49.0, reacomodada: 31.5 },
  { nombre: "Téllez Rodrigo", foto: "/avatars/tellez-rodrigo.jpg", hoy: 49.0, reacomodada: 40.0 },
  { nombre: "Nájera Paola", foto: "/avatars/najera-paola.jpg", hoy: 48.5, reacomodada: 46.0 },
  { nombre: "Olvera Héctor", foto: "/avatars/olvera-hector.jpg", hoy: 44.0, reacomodada: 36.0 },
  { nombre: "Escobar Tomás", foto: "/avatars/escobar-tomas.jpg", hoy: 25.0, reacomodada: 23.5 },
  { nombre: "Molina Rocío", foto: "/avatars/molina-rocio.jpg", hoy: 24.5, reacomodada: 21.0 },
];

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
            30 colaboradores · turnos del 28 de julio al 3 de agosto
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
          value="100.4"
          unit="h"
          hint="Arriba de la hora 47 esta semana"
          tone="destructive"
        />
        <StatCard
          label="Fuera de norma"
          value="27"
          unit="de 30"
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
