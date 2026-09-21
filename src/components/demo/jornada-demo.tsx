import {
  JornadaArtefacto,
  type JornadaMitad,
} from "@/components/ui/jornada-artefacto";
import { RippleBackground } from "@/components/ui/ripple-background";

const hoy: JornadaMitad = {
  titulo: "Hoy",
  glosa: "como está",
  filas: [
    { nombre: "Ortega Bruno", horas: 49.0 },
    { nombre: "Cárdenas Ismael", horas: 49.0 },
    { nombre: "Quintero Diego", horas: 49.0 },
    { nombre: "Téllez Rodrigo", horas: 49.0 },
    { nombre: "Nájera Paola", horas: 48.5 },
    { nombre: "Olvera Héctor", horas: 44.0 },
    { nombre: "Escobar Tomás", horas: 25.0 },
    { nombre: "Molina Rocío", horas: 24.5 },
  ],
  cifras: { horasAlDoble: 100.4, fueraDeNorma: 27, sinCubrir: 420.3 },
};

const reacomodada: JornadaMitad = {
  titulo: "Reacomodada",
  glosa: "mismos contratos",
  filas: [
    { nombre: "Ortega Bruno", horas: 40.0 },
    { nombre: "Cárdenas Ismael", horas: 39.5 },
    { nombre: "Quintero Diego", horas: 31.5 },
    { nombre: "Téllez Rodrigo", horas: 40.0 },
    { nombre: "Nájera Paola", horas: 46.0 },
    { nombre: "Olvera Héctor", horas: 36.0 },
    { nombre: "Escobar Tomás", horas: 23.5 },
    { nombre: "Molina Rocío", horas: 21.0 },
  ],
  cifras: { horasAlDoble: 0, fueraDeNorma: 0, sinCubrir: 331.4 },
};

export default function JornadaDemo() {
  return (
    <RippleBackground className="px-4 py-16 md:py-24">
      <div className="mx-auto w-full max-w-5xl">
        <JornadaArtefacto
          sucursal="Sucursal Coapa"
          semana={31}
          anio={2027}
          tope={46}
          colaboradoresMostrados={8}
          colaboradoresTotal={30}
          mitades={[hoy, reacomodada]}
          pie="La línea ámbar marca el tope del año. Las cifras de abajo son de toda la sucursal; la propuesta la calculó el motor de Jornada40 y la revisó un verificador independiente."
        />
      </div>
    </RippleBackground>
  );
}
