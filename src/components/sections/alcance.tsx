import { Check, X } from "lucide-react";

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

export function Alcance() {
  return (
    <section id="alcance" className="scroll-mt-24 py-16 md:py-24">
      <div className="container mx-auto px-4 max-w-6xl">
        <p className="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          Alcance
        </p>
        <h2 className="mt-3 text-3xl md:text-4xl font-semibold tracking-tight text-balance">
          Lo que hace y lo que no.
        </h2>

        <div className="mt-10 grid gap-8 md:grid-cols-2">
          <div className="bg-card border rounded-xl p-6">
            <h3 className="text-lg font-semibold">Sí</h3>
            <ul className="mt-4 space-y-3">
              {SI.map((item) => (
                <li
                  key={item}
                  className="flex gap-3 items-start text-sm leading-relaxed"
                >
                  <Check
                    className="mt-0.5 size-4 shrink-0 text-emerald-500"
                    aria-hidden="true"
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-card border rounded-xl p-6">
            <h3 className="text-lg font-semibold">No</h3>
            <ul className="mt-4 space-y-3">
              {NO.map((item) => (
                <li
                  key={item}
                  className="flex gap-3 items-start text-sm leading-relaxed"
                >
                  <X
                    className="mt-0.5 size-4 shrink-0 text-terracota"
                    aria-hidden="true"
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Alcance;
