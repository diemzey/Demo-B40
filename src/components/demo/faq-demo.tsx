import { FAQ, type FAQItem } from "@/components/ui/faq-section";

// Preguntas tomadas de https://aivena.ai/jornada40#preguntas
const items: FAQItem[] = [
  {
    question: "¿La reforma me quita horas de operación?",
    answer:
      "Baja el tope de la jornada ordinaria, no las horas que tu tienda necesita abierta. Como el salario no puede bajar, para la operación el efecto es de precio: las horas por encima del tope siguen existiendo y pasan a pagarse al doble. Por eso el problema se resuelve reacomodando turnos, no recortándolos.",
  },
  {
    question: "¿Cuándo cambia el tope?",
    answer:
      "El 1.º de enero de cada año: 46 horas en 2027, 44 en 2028, 42 en 2029 y 40 en 2030. En 2026 sigue en 48. La reforma se publicó el 3 de marzo de 2026 y el calendario no depende de la fecha de publicación.",
  },
  {
    question: "¿Qué pasa con las horas extra?",
    answer:
      "El umbral desde el que se pagan al doble baja con el tope: lo que en 2026 es la hora 49, en 2027 es la hora 47 y en 2030 la hora 41. Las primeras horas extraordinarias de la semana se pagan al doble, las siguientes al triple, y la semana tiene un tope absoluto que no se puede cruzar. Jornada40 las muestra aparte del total ordinario, con el tope del año aplicado.",
  },
  {
    question: "¿Puedo ajustar el salario al bajar la jornada?",
    answer:
      "No. El decreto establece que la reducción de jornada no puede implicar disminución de salario ni de prestaciones. Por eso ninguna propuesta de Jornada40 toca la nómina ordinaria.",
  },
  {
    question: "¿Y el registro electrónico de asistencia?",
    answer:
      "Es una obligación nueva de la misma reforma. Con el registro, la carga de la prueba pasa al patrón: si hay una controversia por horas extra, lo que vale es la bitácora. El diagnóstico de Jornada40 trabaja sobre ese mismo registro, así que lo que te decimos es lo que una inspección leería.",
  },
  {
    question: "¿Qué necesito para el diagnóstico?",
    answer:
      "Una sucursal y una semana: los turnos por persona, la plantilla con su jornada contratada y cuánta gente necesitas por franja horaria. Van en CSV y te damos el formato de cada archivo. Con cuatro semanas el retrato es mejor, porque se toma la semana representativa y no una atípica.",
  },
  {
    question: "¿Dónde quedan mis datos?",
    answer:
      "Los archivos se procesan en tu navegador y no guardamos plantillas de personal, nombres ni horarios. Si tu área legal necesita el detalle, te lo mandamos por escrito antes de la primera prueba.",
  },
  {
    question: "¿De dónde salen las cifras de esta página?",
    answer:
      "De una sucursal sintética de 30 colaboradores —Coapa, de Grupo Solmar— calculada por el mismo motor que correría sobre la tuya. Las horas extraordinarias, la gente fuera de norma y las horas sin cubrir salen del diagnóstico; la reacomodada, del motor de propuesta, revisada por el verificador. No son clientes reales y no los presentamos como tales. Si quieres el detalle del cálculo, te lo mandamos por escrito.",
  },
];

export default function FAQDemo() {
  return (
    <FAQ
      id="preguntas"
      badge="Preguntas"
      title="Lo que nos preguntan en la primera llamada."
      description="Respuestas directas sobre la reforma, el calendario y cómo funciona el diagnóstico de Jornada40."
      cta={{ label: "¿Otra duda? Escríbenos", href: "#contacto" }}
      items={items}
    />
  );
}
