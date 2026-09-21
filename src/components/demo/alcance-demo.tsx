import Comparison03 from "@/components/ui/comparison-03";

const SI = [
  "Reacomoda los turnos de la misma gente con los mismos contratos. No propone bajar salario ni prestaciones.",
  "Respeta el día de descanso por cada seis trabajados, el tope diario de cada tipo de jornada y quién está habilitado para qué actividad.",
  "Cuando la plantilla no alcanza, te dice cuántas horas quedan sin cubrir y en qué franjas, en lugar de entregarte un cuadrante que no cumple.",
  "Pasa cada propuesta por un verificador independiente que no comparte código con el motor que la generó.",
] as const;

const NO = [
  "No promete ahorro de nómina. Lo único que cuantificamos son las horas que dejan de pagarse al doble; la nómina ordinaria no cambia.",
  "No toca tu nómina ni tu checador. Propone un cuadrante; tú lo apruebas y lo aplicas donde lo aplicas hoy.",
  "No guarda plantillas de personal, nombres ni horarios: los archivos se procesan en tu navegador y se quedan contigo.",
  "Hoy lee CSV, no Excel directo. Cualquier hoja de cálculo lo exporta en un clic.",
] as const;

const OUTCOMES = [
  { value: "Mismos contratos", label: "sin bajar salario ni prestaciones" },
  { value: "1 verificador", label: "independiente del motor" },
  { value: "0 datos", label: "salen de tu navegador" },
] as const;

export default function AlcanceDemo() {
  return (
    <Comparison03
      eyebrow="Alcance"
      title="Lo que hace y lo que no."
      yes={{ label: "Sí", items: SI }}
      no={{ label: "No", items: NO }}
      outcomes={OUTCOMES}
      cta={{ label: "Diagnosticar ahora", href: "#contacto" }}
    />
  );
}
