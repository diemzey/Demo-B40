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

export default function ReduccionTimelineDemo() {
  return (
    <section className="container mx-auto px-4 py-16 md:py-24">
      <div className="mx-auto grid max-w-5xl gap-10 md:grid-cols-[1fr_1.4fr] md:gap-16">
        <div>
          <h2 className="font-semibold text-3xl tracking-tight">
            El tope baja dos horas cada enero
          </h2>
          <p className="mt-3 text-muted-foreground">
            La jornada legal pasa de 48 a 40 horas semanales entre 2026 y
            2030. Todo lo que se trabaje por encima del tope de cada año se
            paga al doble.
          </p>
        </div>
        <Timeline items={items} variant="spacious" showTimestamps={false} />
      </div>
    </section>
  );
}
