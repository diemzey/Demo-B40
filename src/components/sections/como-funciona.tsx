import { CalendarCheck, ScanSearch, Upload } from "lucide-react";

const PASOS = [
  {
    dia: "Día 1",
    icon: Upload,
    titulo: "Nos mandas una semana como la tienes.",
    texto:
      "Los archivos que ya exporta tu checador o tu hoja de turnos: quién trabaja qué horario, tu plantilla y cuánta gente necesitas por franja. Te damos el formato de cada uno. No hay que capturar nada.",
  },
  {
    dia: "Día 3",
    icon: ScanSearch,
    titulo: "Te decimos quién cruza la línea y cuánto cuesta.",
    texto:
      "Por persona: horas de la semana, cuántas pasan al doble con el tope del año, quién queda fuera de norma y qué franjas del piso quedan cortas aunque las horas alcancen. «Excede 3.0 h», no un semáforo.",
  },
  {
    dia: "Día 4",
    icon: CalendarCheck,
    titulo: "Recibes el cuadrante reacomodado.",
    texto:
      "Los mismos contratos y la misma gente, con los turnos repartidos para que nadie cruce el tope y el piso quede cubierto donde hace falta. Cada propuesta pasa por un verificador independiente antes de llegarte. Tú decides si se aplica.",
  },
] as const;

export function ComoFunciona() {
  return (
    <section id="como-funciona" className="scroll-mt-24 py-16 md:py-24">
      <div className="container mx-auto px-4 max-w-6xl">
        <p className="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          Cómo funciona
        </p>
        <h2 className="mt-3 text-3xl md:text-4xl font-semibold tracking-tight text-balance">
          Una sucursal, una semana, cuatro días.
        </h2>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {PASOS.map((paso) => {
            const Icon = paso.icon;
            return (
              <article key={paso.dia} className="bg-card border rounded-xl p-6">
                <Icon className="size-5 text-ambar" aria-hidden="true" />
                <p className="mt-4 font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-ambar">
                  {paso.dia}
                </p>
                <h3 className="mt-2 text-lg font-semibold tracking-tight text-balance">
                  {paso.titulo}
                </h3>
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                  {paso.texto}
                </p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default ComoFunciona;
