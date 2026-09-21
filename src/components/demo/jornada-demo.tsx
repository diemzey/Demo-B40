import { ArrowDown, ArrowRight } from "lucide-react";
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
    <RippleBackground id="coapa" className="scroll-mt-16 px-4 py-16 md:py-24">
      <div className="mx-auto grid w-full max-w-6xl items-center gap-8 md:grid-cols-2 md:gap-12">
        <header className="min-w-0 rounded-2xl bg-neutral-950 px-6 py-8 text-neutral-50 shadow-lg md:px-10 md:py-12">
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-neutral-400">
            Reforma de 40 horas · retail · enero de 2027
          </p>
          <h1 className="mt-4 text-balance font-semibold text-3xl leading-tight tracking-tight md:text-5xl">
            A partir de enero, la{" "}
            <span className="text-ambar">hora 47</span> de cada semana se paga{" "}
            <span className="text-ambar">al doble</span>.
          </h1>
          <p className="mt-5 max-w-[56ch] text-neutral-400 text-base leading-relaxed md:text-lg">
            La reforma no te quita horas: te las encarece. Jornada40 reacomoda
            los turnos de cada sucursal para que nadie cruce el tope del año,
            con la misma gente, los mismos contratos y el piso cubierto.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Button
              asChild
              className="h-12 bg-ambar px-6 text-base text-neutral-950 hover:bg-ambar/90"
            >
              <a href="#contacto">
                Actuar ahora
                <ArrowRight className="ml-2 size-4" />
              </a>
            </Button>
            <Button
              asChild
              variant="outline"
              className="h-12 border-neutral-700 bg-transparent px-6 text-base text-neutral-100 hover:bg-neutral-900 hover:text-neutral-50"
            >
              <a href="#coapa-tabla">
                Ver la semana de Coapa
                <ArrowDown className="ml-2 size-4" />
              </a>
            </Button>
          </div>
          <p className="mt-3 text-neutral-400 text-sm">
            Veinte minutos por videollamada, con una semana real de tu sucursal
            en pantalla.
          </p>
        </header>
        <div id="coapa-tabla" className="min-w-0 scroll-mt-24">
          <p className="mb-3 font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-neutral-900/70">
            La semana de Coapa · datos de ejemplo
          </p>
          <JornadaArtefacto
            tope={46}
            personas={personas}
            colaboradores={30}
            antes={{ horasAlDoble: 100.4, fueraDeNorma: 27, sinCubrir: 420.3 }}
            despues={{ horasAlDoble: 0, fueraDeNorma: 0, sinCubrir: 331.4 }}
          />
        </div>
      </div>
    </RippleBackground>
  );
}
