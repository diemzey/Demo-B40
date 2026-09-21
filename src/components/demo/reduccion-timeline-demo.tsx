import type React from "react";
import { CalendarDays, Clock } from "lucide-react";
import { Timeline, type TimelineItem } from "@/components/ui/timeline";

const items: TimelineItem[] = [
  {
    id: "2026",
    title: "Hoy · 2026: tope de 48 h por semana",
    description: "La hora 49 se paga al doble.",
    status: "active",
    icon: <Clock className="h-3 w-3" />,
  },
  {
    id: "2027",
    title: "Desde enero de 2027: 46 h",
    description: "La hora 47 se paga al doble.",
    status: "pending",
    icon: <CalendarDays className="h-3 w-3" />,
  },
  {
    id: "2028",
    title: "Desde enero de 2028: 44 h",
    description: "La hora 45 se paga al doble.",
    status: "pending",
    icon: <CalendarDays className="h-3 w-3" />,
  },
  {
    id: "2029",
    title: "Desde enero de 2029: 42 h",
    description: "La hora 43 se paga al doble.",
    status: "pending",
    icon: <CalendarDays className="h-3 w-3" />,
  },
  {
    id: "2030",
    title: "Desde enero de 2030: 40 h",
    description: "La hora 41 se paga al doble. Fin de la transición.",
    status: "pending",
    icon: <CalendarDays className="h-3 w-3" />,
  },
];

function Mark({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-medium text-yellow-400">{children}</span>
  );
}

export default function ReduccionTimelineDemo() {
  return (
    <section className="container mx-auto px-4 py-16 md:py-24">
      <div className="mx-auto grid max-w-5xl gap-10 md:grid-cols-[1fr_1.2fr] md:gap-16">
        <Timeline
          items={items}
          variant="spacious"
          showTimestamps={false}
          className="order-2 md:order-1"
        />
        <div className="order-1 md:order-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Calendario
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
            El tope baja dos horas cada enero
          </h2>
          <div className="mt-5 space-y-4 text-muted-foreground leading-relaxed">
            <p>
              La reforma publicada el{" "}
              <Mark>3 de marzo de 2026</Mark> baja el tope de la semana{" "}
              <Mark>dos horas cada 1.º de enero</Mark> hasta llegar a 40 en
              2030, y <Mark>prohíbe bajar el salario</Mark>.
            </p>
            <p>
              Para la nómina eso no se siente como menos horas: se siente
              como <Mark>un umbral que baja</Mark>. La hora que hoy es
              ordinaria pasa a pagarse <Mark>al doble</Mark> en cuanto cruza
              el tope del año, y más arriba <Mark>al triple</Mark>, hasta un
              tope absoluto que ya no se puede cruzar. Nada cambia en el
              piso; cambia el precio de lo que ya se trabaja.
            </p>
            <p>
              La misma reforma obliga al{" "}
              <Mark>registro electrónico de asistencia</Mark>. Con él,{" "}
              <Mark>la carga de la prueba pasa al patrón</Mark>: cada hora
              por encima del tope queda escrita.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
