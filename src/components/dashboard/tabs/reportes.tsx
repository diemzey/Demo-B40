"use client";

import { Download, FileBarChart2, FileCheck2, Receipt, type LucideIcon } from "lucide-react";
import { Panel, TabHeader, botonOutline } from "@/components/dashboard/tabs/ui";

const REPORTES: { id: string; titulo: string; descripcion: string; icon: LucideIcon; meta: string }[] = [
  {
    id: "diagnostico",
    titulo: "Diagnóstico semanal",
    descripcion:
      "Horas por colaborador, exceso sobre el tope y la propuesta reacomodada de la semana 31.",
    icon: FileBarChart2,
    meta: "PDF · semana 31",
  },
  {
    id: "auditoria",
    titulo: "Evidencia para auditoría",
    descripcion:
      "Turnos originales y reacomodados con fecha, hora y firma digital, listos para una inspección laboral.",
    icon: FileCheck2,
    meta: "PDF + CSV · semanas 24–31",
  },
  {
    id: "nomina",
    titulo: "Resumen de nómina",
    descripcion:
      "Horas al doble por persona y el costo extra estimado con el costo por hora configurado.",
    icon: Receipt,
    meta: "XLSX · semana 31",
  },
];

export function ReportesTab() {
  return (
    <div className="mx-auto w-full max-w-6xl p-4 md:p-6">
      <TabHeader
        eyebrow="Reportes"
        title="Reportes"
        subtitle="Documentos generados a partir del diagnóstico de la sucursal Coapa."
      />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {REPORTES.map((r) => (
          <Panel key={r.id} className="flex flex-col gap-3 p-4">
            <span className="flex size-8 items-center justify-center rounded-md bg-amber-400/10 text-amber-400">
              <r.icon className="size-4" strokeWidth={1.5} aria-hidden="true" />
            </span>
            <div className="flex-1 space-y-1">
              <h2 className="text-[13px] font-semibold">{r.titulo}</h2>
              <p className="text-xs leading-relaxed text-muted-foreground">{r.descripcion}</p>
            </div>
            <div className="flex items-center justify-between gap-2 border-t border-border/60 pt-3">
              <span className="text-[11px] text-muted-foreground">{r.meta}</span>
              <button type="button" className={`${botonOutline} shrink-0 whitespace-nowrap`} onClick={() => undefined}>
                <Download className="size-3.5" strokeWidth={1.5} aria-hidden="true" />
                Descargar (demo)
              </button>
            </div>
          </Panel>
        ))}
      </div>
    </div>
  );
}
