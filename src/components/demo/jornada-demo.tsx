import { JornadaHero } from "@/components/demo/jornada-hero";
import { PLANTILLA_COAPA, resumenDe } from "@/components/demo/plantilla-coapa";
import { RippleBackground } from "@/components/ui/ripple-background";

/**
 * Costo por hora ordinaria de referencia (MXN). Un puesto de piso en retail
 * ronda los $11,500 al mes: ≈ $60 por hora en una jornada de 48 h.
 */
const COSTO_HORA = 60;
const TOPE = 46;
/** Tope final de la reforma, desde enero de 2030. */
const TOPE_2030 = 40;

export default function JornadaDemo() {
  const antes = resumenDe(PLANTILLA_COAPA, "hoy", TOPE);
  const despues = resumenDe(PLANTILLA_COAPA, "reacomodada", TOPE);
  const antes2030 = resumenDe(PLANTILLA_COAPA, "hoy", TOPE_2030);
  return (
    <RippleBackground className="px-4 py-16 md:py-24">
      <JornadaHero
        tope={TOPE}
        personas={PLANTILLA_COAPA}
        colaboradores={PLANTILLA_COAPA.length}
        antes={antes}
        despues={despues}
        antes2030={antes2030}
        costoHora={COSTO_HORA}
      />
    </RippleBackground>
  );
}
