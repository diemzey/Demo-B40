import { JornadaHero } from "@/components/demo/jornada-hero";
import {
  PLANTILLA_COAPA,
  REACOMODO_COAPA,
  TOPE,
  TOPE_2030,
  resumenDe,
  resumenDespues,
} from "@/components/demo/plantilla-coapa";
import { RippleBackground } from "@/components/ui/ripple-background";

/**
 * Costo por hora ordinaria de referencia (MXN). Un puesto de piso en retail
 * ronda los $11,500 al mes: ≈ $60 por hora en una jornada de 48 h.
 */
const COSTO_HORA = 60;

export default function JornadaDemo() {
  const antes = resumenDe(PLANTILLA_COAPA, "hoy", TOPE);
  // Después: lo que queda arriba del tope (0) más lo que el reacomodo no cubrió.
  const despues = resumenDespues(PLANTILLA_COAPA, REACOMODO_COAPA);
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
