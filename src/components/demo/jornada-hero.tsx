"use client";

import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CostoExtra } from "@/components/ui/costo-extra";
import {
  JornadaArtefacto,
  useFaseCiclica,
  type JornadaPersona,
  type JornadaResumen,
} from "@/components/ui/jornada-artefacto";

type JornadaHeroProps = {
  personas: JornadaPersona[];
  tope: number;
  colaboradores: number;
  antes: JornadaResumen;
  despues: JornadaResumen;
  /** Cifras semanales reales del motor para la tienda del ejemplo. */
  costo: {
    doblesSemanal: number;
    ahorroSemanal: number;
    ahorroPct: number;
    coberturaPicoAntes: number;
    coberturaPicoDespues: number;
  };
};

export function JornadaHero({
  personas,
  tope,
  colaboradores,
  antes,
  despues,
  costo,
}: JornadaHeroProps) {
  const { fase, barriendo } = useFaseCiclica(3500);
  const enAntes = fase === "antes";

  return (
    <div className="mx-auto grid w-full max-w-6xl items-stretch gap-8 md:grid-cols-2 md:gap-12">
      <header className="flex min-w-0 flex-col rounded-2xl bg-neutral-950 px-6 py-8 text-neutral-50 shadow-lg md:px-10 md:py-12">
        <Clock
          className="mb-6 size-10 text-amber-400 md:size-12"
          strokeWidth={1.5}
          aria-hidden="true"
        />
        <h2 className="text-balance font-semibold text-3xl leading-tight tracking-tight md:text-5xl">
          A partir de enero, la <span className="text-amber-400">hora 47</span>{" "}
          de cada semana se paga <span className="text-amber-400">al doble</span>.
        </h2>
        <p className="mt-4 text-neutral-400 text-sm md:text-base">
          Jornada40 reacomoda los turnos de tu sucursal con los mismos
          contratos. Mira cómo cambia la semana.
        </p>
        <CostoExtra
          className="mt-6"
          horasAlDoble={antes.horasAlDoble}
          fueraDeNorma={antes.fueraDeNorma}
          costoDoblesSemanal={costo.doblesSemanal}
          ahorroSemanal={costo.ahorroSemanal}
          ahorroPct={costo.ahorroPct}
          coberturaPicoAntes={costo.coberturaPicoAntes}
          coberturaPicoDespues={costo.coberturaPicoDespues}
          tope={tope}
          activo={enAntes}
        />
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
        tope={tope}
        personas={personas}
        colaboradores={colaboradores}
        antes={antes}
        despues={despues}
        fase={fase}
        barriendo={barriendo}
      />
    </div>
  );
}
