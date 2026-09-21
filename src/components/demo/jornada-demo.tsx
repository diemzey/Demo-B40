import {
  JornadaArtefacto,
  type JornadaFila,
} from "@/components/ui/jornada-artefacto";
import { RippleBackground } from "@/components/ui/ripple-background";

const filas: JornadaFila[] = [
  { nombre: "Ortega Bruno", hoy: 49.0, reacomodada: 40.0 },
  { nombre: "Nájera Paola", hoy: 48.5, reacomodada: 46.0 },
  { nombre: "Olvera Héctor", hoy: 44.0, reacomodada: 36.0 },
  { nombre: "Molina Rocío", hoy: 24.5, reacomodada: 21.0 },
];

export default function JornadaDemo() {
  return (
    <RippleBackground className="px-4 py-16 md:py-24">
      <div className="mx-auto w-full max-w-3xl">
        <JornadaArtefacto
          sucursal="Sucursal Coapa"
          semana={31}
          anio={2027}
          tope={46}
          filas={filas}
          totales={{
            horasAlDoble: { hoy: 100.4, reacomodada: 0 },
            fueraDeNorma: { hoy: 27, reacomodada: 0 },
            colaboradores: 30,
          }}
        />
      </div>
    </RippleBackground>
  );
}
