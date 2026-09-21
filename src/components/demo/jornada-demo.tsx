import {
  JornadaArtefacto,
  type JornadaPersona,
} from "@/components/ui/jornada-artefacto";
import { RippleBackground } from "@/components/ui/ripple-background";

const personas: JornadaPersona[] = [
  { nombre: "Ortega Bruno", foto: "/avatars/ortega-bruno.jpg", hoy: 49.0, reacomodada: 40.0 },
  { nombre: "Nájera Paola", foto: "/avatars/najera-paola.jpg", hoy: 48.5, reacomodada: 46.0 },
  { nombre: "Olvera Héctor", foto: "/avatars/olvera-hector.jpg", hoy: 44.0, reacomodada: 36.0 },
  { nombre: "Molina Rocío", foto: "/avatars/molina-rocio.jpg", hoy: 24.5, reacomodada: 21.0 },
];

export default function JornadaDemo() {
  return (
    <RippleBackground className="px-4 py-16 md:py-24">
      <div className="mx-auto w-full max-w-5xl">
        <JornadaArtefacto
          tope={46}
          personas={personas}
          colaboradores={30}
          antes={{ horasAlDoble: 100.4, fueraDeNorma: 27 }}
          despues={{ horasAlDoble: 0, fueraDeNorma: 0 }}
        />
      </div>
    </RippleBackground>
  );
}
