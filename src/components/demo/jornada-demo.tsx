import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  JornadaArtefacto,
  type JornadaPersona,
} from "@/components/ui/jornada-artefacto";
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

export default function JornadaDemo() {
  return (
    <RippleBackground className="px-4 py-16 md:py-24">
      <div className="mx-auto grid w-full max-w-6xl items-stretch gap-8 md:grid-cols-2 md:gap-12">
        <header className="flex min-w-0 flex-col rounded-2xl bg-neutral-950 px-6 py-8 text-neutral-50 shadow-lg md:px-10 md:py-12">
          <Clock
            className="mb-6 size-10 text-amber-400 md:size-12"
            strokeWidth={1.5}
            aria-hidden="true"
          />
          <h2 className="text-balance font-semibold text-3xl leading-tight tracking-tight md:text-5xl">
            A partir de enero, la{" "}
            <span className="text-amber-400">hora 47</span> de cada semana se
            paga <span className="text-amber-400">al doble</span>.
          </h2>
          <p className="mt-4 text-neutral-400 text-sm md:text-base">
            Jornada40 reacomoda los turnos de tu sucursal con los mismos
            contratos. Mira cómo cambia la semana.
          </p>
          <div className="mt-8 md:mt-auto md:pt-8">
            <Button
              size="lg"
              className="h-12 w-full bg-yellow-400 px-8 font-semibold text-neutral-950 text-base hover:bg-yellow-300 sm:w-auto"
            >
              Diagnosticar ahora
            </Button>
          </div>
        </header>
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
