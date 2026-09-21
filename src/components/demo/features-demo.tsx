import { FeatureSection, FeatureShowcase } from "@/components/ui/feature-sections"

const features = [
  {
    image: "/features/feature-analisis.jpg",
    width: 800,
    height: 533,
    title: "Análisis de horas",
    description: "Detecta al instante quién excede el tope semanal.",
    alt: "Panel de análisis de horas en una laptop",
  },
  {
    image: "/features/feature-personal.jpg",
    width: 800,
    height: 534,
    title: "Gestión de personal",
    description: "Contratos, turnos y sucursales en un solo lugar.",
    alt: "Equipo de trabajo colaborando en una oficina",
  },
  {
    image: "/features/feature-reportes.jpg",
    width: 800,
    height: 459,
    title: "Reportes claros",
    description: "Evidencia lista para auditoría y nómina.",
    alt: "Documentos y calculadora sobre un escritorio",
  },
]

export default function FeaturesDemo() {
  return (
    <div className="container mx-auto px-4 py-16">
      <FeatureSection
        title="Todo lo que necesitas"
        description="Reacomoda turnos, controla horas y cumple la jornada de 40 horas sin fricción."
        features={features}
      />
      <FeatureShowcase
        intro="Jornada40 convierte una semana desordenada en turnos que cumplen la ley y respetan los contratos."
        showcase={{
          image: "/features/showcase.jpg",
          width: 1400,
          height: 997,
          alt: "Gráficas de horas trabajadas en una laptop",
        }}
        side={{
          image: "/features/feature-personal.jpg",
          width: 800,
          height: 534,
          alt: "Equipo revisando turnos de la semana",
        }}
        title="Mejor diseño de turnos, misma nómina"
        description="Optimiza la jornada sin cambiar contratos ni contratar más gente."
        linkLabel="Conoce el producto"
        href="#"
      />
    </div>
  )
}
