import { ChevronDown } from "lucide-react";

const preguntas = [
  {
    pregunta: "¿La reforma me quita horas de operación?",
    respuesta:
      "Baja el tope de la jornada ordinaria, no las horas que tu tienda necesita abierta. Como el salario no puede bajar, para la operación el efecto es de precio: las horas por encima del tope siguen existiendo y pasan a pagarse al doble. Por eso el problema se resuelve reacomodando turnos, no recortándolos.",
  },
  {
    pregunta: "¿Cuándo cambia el tope?",
    respuesta:
      "El 1.º de enero de cada año: 46 horas en 2027, 44 en 2028, 42 en 2029 y 40 en 2030. En 2026 sigue en 48. La reforma se publicó el 3 de marzo de 2026 y el calendario no depende de la fecha de publicación.",
  },
  {
    pregunta: "¿Qué pasa con las horas extra?",
    respuesta:
      "El umbral desde el que se pagan al doble baja con el tope: lo que en 2026 es la hora 49, en 2027 es la hora 47 y en 2030 la hora 41. Las primeras horas extraordinarias de la semana se pagan al doble, las siguientes al triple, y la semana tiene un tope absoluto que no se puede cruzar. Jornada40 las muestra aparte del total ordinario, con el tope del año aplicado.",
  },
  {
    pregunta: "¿Puedo ajustar el salario al bajar la jornada?",
    respuesta:
      "No. El decreto establece que la reducción de jornada no puede implicar disminución de salario ni de prestaciones. Por eso ninguna propuesta de Jornada40 toca la nómina ordinaria.",
  },
  {
    pregunta: "¿Y el registro electrónico de asistencia?",
    respuesta:
      "Es una obligación nueva de la misma reforma. Con el registro, la carga de la prueba pasa al patrón: si hay una controversia por horas extra, lo que vale es la bitácora. El diagnóstico de Jornada40 trabaja sobre ese mismo registro, así que lo que te decimos es lo que una inspección leería.",
  },
  {
    pregunta: "¿Qué necesito para el diagnóstico?",
    respuesta:
      "Una sucursal y una semana: los turnos por persona, la plantilla con su jornada contratada y cuánta gente necesitas por franja horaria. Van en CSV y te damos el formato de cada archivo. Con cuatro semanas el retrato es mejor, porque se toma la semana representativa y no una atípica.",
  },
  {
    pregunta: "¿Dónde quedan mis datos?",
    respuesta:
      "Los archivos se procesan en tu navegador y no guardamos plantillas de personal, nombres ni horarios. Si tu área legal necesita el detalle, te lo mandamos por escrito antes de la primera prueba.",
  },
  {
    pregunta: "¿De dónde salen las cifras de esta página?",
    respuesta:
      "De una sucursal sintética de 30 colaboradores —Coapa, de Grupo Solmar— calculada por el mismo motor que correría sobre la tuya. Las horas extraordinarias, la gente fuera de norma y las horas sin cubrir salen del diagnóstico; la reacomodada, del motor de propuesta, revisada por el verificador. No son clientes reales y no los presentamos como tales. Si quieres el detalle del cálculo, te lo mandamos por escrito.",
  },
];

export function Preguntas() {
  return (
    <section id="preguntas" className="scroll-mt-24 py-16 md:py-24">
      <div className="container mx-auto max-w-6xl px-4">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
          <div className="lg:sticky lg:top-24 lg:self-start">
            <p className="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Preguntas
            </p>
            <h2 className="mt-3 text-3xl md:text-4xl font-semibold tracking-tight text-balance">
              Lo que nos preguntan en la primera llamada.
            </h2>
          </div>

          <div className="border-t">
            {preguntas.map(({ pregunta, respuesta }) => (
              <details key={pregunta} className="group border-b py-4">
                <summary className="flex cursor-pointer items-center justify-between gap-4 font-medium list-none [&::-webkit-details-marker]:hidden">
                  <span>{pregunta}</span>
                  <ChevronDown
                    aria-hidden="true"
                    className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180"
                  />
                </summary>
                <p className="mt-3 max-w-[64ch] text-sm leading-relaxed text-muted-foreground">
                  {respuesta}
                </p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default Preguntas;
