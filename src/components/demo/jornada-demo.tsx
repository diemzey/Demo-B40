import { JornadaHero } from "@/components/demo/jornada-hero";
import type { JornadaPersona } from "@/components/ui/jornada-artefacto";
import { RippleBackground } from "@/components/ui/ripple-background";

const personas: JornadaPersona[] = [
  { nombre: "Ortega Bruno", foto: "/avatars/ortega-bruno.jpg", hoy: 49.0, reacomodada: 40.0 },
  { nombre: "Cárdenas Ismael", foto: "/avatars/cardenas-ismael.jpg", hoy: 49.0, reacomodada: 39.5 },
  { nombre: "Quintero Diego", foto: "/avatars/quintero-diego.jpg", hoy: 49.0, reacomodada: 31.5 },
  { nombre: "Téllez Rodrigo", foto: "/avatars/tellez-rodrigo.jpg", hoy: 49.0, reacomodada: 40.0 },
  { nombre: "Nájera Paola", foto: "/avatars/najera-paola.jpg", hoy: 48.5, reacomodada: 46.0 },
  { nombre: "Olvera Héctor", foto: "/avatars/olvera-hector.jpg", hoy: 44.0, reacomodada: 36.0 },
  { nombre: "Escobar Tomás", foto: "/avatars/escobar-tomas.jpg", hoy: 25.0, reacomodada: 23.5 },
  { nombre: "Molina Rocío", foto: "/avatars/molina-rocio.jpg", hoy: 24.5, reacomodada: 21.0 },
];

/**
 * Costo por hora ordinaria de referencia (MXN). Un puesto de piso en retail
 * ronda los $11,500 al mes: ≈ $60 por hora en una jornada de 48 h.
 */
const COSTO_HORA = 60;

export default function JornadaDemo() {
  return (
    <RippleBackground className="px-4 py-16 md:py-24">
      <JornadaHero
        tope={46}
        personas={personas}
        colaboradores={30}
        antes={{ horasAlDoble: 100.4, fueraDeNorma: 27 }}
        despues={{ horasAlDoble: 0, fueraDeNorma: 0 }}
        costoHora={COSTO_HORA}
      />
    </RippleBackground>
  );
}
