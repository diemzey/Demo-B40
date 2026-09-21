"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { PLANTILLA_COAPA, resumenDe } from "@/components/demo/plantilla-coapa";
import { TOPE_2027 } from "@/components/dashboard/colaboradores-table";
import {
  JornadaArtefacto,
  type JornadaFase,
} from "@/components/ui/jornada-artefacto";

const SHIMMER_MS = 1200;

/**
 * La misma tabla de la portada, pero con el cambio Antes / Después a mano
 * en lugar del ciclo automático.
 */
export function DiagnosticoTabla() {
  const [fase, setFase] = useState<JornadaFase>("antes");
  const [barriendo, setBarriendo] = useState(false);
  const timer = useRef(0);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const cambiar = (nueva: JornadaFase) => {
    if (nueva === fase) return;
    setBarriendo(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      setFase(nueva);
      timer.current = window.setTimeout(() => setBarriendo(false), SHIMMER_MS / 2);
    }, SHIMMER_MS / 2);
  };

  const antes = resumenDe(PLANTILLA_COAPA, "hoy", TOPE_2027);
  const despues = resumenDe(PLANTILLA_COAPA, "reacomodada", TOPE_2027);

  return (
    <section id="tabla-colaboradores" className="scroll-mt-20">
      <div className="mb-3 flex items-center justify-end">
        <div
          role="tablist"
          aria-label="Vista de la semana"
          className="inline-flex rounded-lg border border-border bg-card p-0.5"
        >
          {(
            [
              ["antes", "Antes"],
              ["despues", "Después"],
            ] as const
          ).map(([valor, etiqueta]) => (
            <button
              key={valor}
              type="button"
              role="tab"
              aria-selected={fase === valor}
              onClick={() => cambiar(valor)}
              className={cn(
                "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                fase === valor
                  ? "bg-yellow-400 text-neutral-950"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {etiqueta}
            </button>
          ))}
        </div>
      </div>
      <JornadaArtefacto
        tope={TOPE_2027}
        personas={PLANTILLA_COAPA}
        colaboradores={PLANTILLA_COAPA.length}
        antes={antes}
        despues={despues}
        fase={fase}
        barriendo={barriendo}
      />
    </section>
  );
}
