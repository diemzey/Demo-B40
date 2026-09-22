import { JornadaHero } from "@/components/demo/jornada-hero";
import {
  EJEMPLO,
  PLANTILLA_COAPA,
  TOPE,
  resumenAntesEjemplo,
  resumenDespuesEjemplo,
} from "@/components/demo/plantilla-coapa";
import { RippleBackground } from "@/components/ui/ripple-background";

/**
 * Ejemplo real: una tienda-semana programada por el motor (scripts/motor)
 * con el tope de 40 h. Cada cifra sale de esa corrida, no de una estimación.
 */
export default function JornadaDemo() {
  const antes = resumenAntesEjemplo();
  const despues = resumenDespuesEjemplo();
  return (
    <RippleBackground className="px-4 py-16 md:py-24">
      <JornadaHero
        tope={TOPE}
        personas={PLANTILLA_COAPA}
        colaboradores={PLANTILLA_COAPA.length}
        antes={antes}
        despues={despues}
        costo={{
          doblesSemanal: EJEMPLO.baseline.costoDobles,
          ahorroSemanal: EJEMPLO.ahorro.mxn,
          ahorroPct: EJEMPLO.ahorro.pct,
          coberturaPicoAntes: EJEMPLO.baseline.coberturaPicoPct,
          coberturaPicoDespues: EJEMPLO.propuesta.coberturaPicoPct,
        }}
      />
    </RippleBackground>
  );
}
