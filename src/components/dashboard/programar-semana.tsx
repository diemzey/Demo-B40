"use client";

import { startTransition, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw, Sparkles, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProgresoNarrativo } from "@/components/dashboard/importar-y-programar";
import { usePanel } from "@/lib/datos/panel-context";
import { etiquetaPasoMotor } from "@/lib/importacion";
import { createClient } from "@/lib/supabase/client";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { programarSemana, type ResultadoProgramacion } from "@/lib/motor/programar";
import { cn } from "@/lib/utils";

/*
 * "Reprogramar": control secundario dentro de la tarjeta de la propuesta.
 * Vuelve a correr el motor para la sucursal-semana del panel con el tope de
 * la empresa (Configuración: `empresas.tope_objetivo`, lo lee
 * `programarSemana`), muestra el avance inline con la misma narrativa que la
 * importación y refresca la ruta al terminar. Útil si cambió el tope o los
 * datos; la propuesta normal ya se genera sola al importar.
 */

type Estado =
  | { paso: "inactivo" }
  | { paso: "programando"; pct: number; etiqueta: string }
  | { paso: "hecho"; resultado: ResultadoProgramacion }
  | { paso: "error"; mensaje: string };

const fmtMXN = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });
const fmtPct = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 1 });
const fmtFecha = new Intl.DateTimeFormat("es-MX", {
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "America/Mexico_City",
});

/** "21 sep, 2:05 p.m." o null si la fecha no es válida. */
export function fechaPublicacion(iso: string): string | null {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : fmtFecha.format(d);
}

function sinCodigos(m: string): string {
  return m.replace(/\s*\[[0-9A-Z]{5}\]/g, "").trim();
}

export function ReprogramarSemana({ className }: { className?: string }) {
  const datos = usePanel();
  const router = useRouter();
  const conectado = hasSupabaseEnv();
  const { sucursal, semana, programacion } = datos;

  const [estado, setEstado] = useState<Estado>({ paso: "inactivo" });
  const vivo = useRef(true);
  useEffect(() => {
    vivo.current = true;
    return () => {
      vivo.current = false;
    };
  }, []);

  const ocupado = estado.paso === "programando";
  const listoParaCorrer = conectado && sucursal !== null && semana !== null;

  async function programar() {
    if (!listoParaCorrer || ocupado || !sucursal || !semana) return;
    let terminado = false;
    setEstado({ paso: "programando", pct: 0, etiqueta: "Leyendo los turnos" });
    try {
      const resultado = await programarSemana({
        supabase: createClient(),
        sucursalId: sucursal.id,
        semanaIso: semana.inicio,
        onProgreso: (p) => {
          if (!vivo.current || terminado) return;
          setEstado({ paso: "programando", pct: p.pct, etiqueta: etiquetaPasoMotor(p, { tope: p.tope ?? datos.tope }) });
        },
      });
      terminado = true;
      if (!vivo.current) return;
      setEstado({ paso: "hecho", resultado });
      // El panel (servidor) vuelve a leer v_ahorro_escenario y la propuesta.
      startTransition(() => router.refresh());
    } catch (e) {
      terminado = true;
      if (!vivo.current) return;
      setEstado({ paso: "error", mensaje: e instanceof Error && e.message ? sinCodigos(e.message) : "No se pudo programar la semana." });
    }
  }

  const publicado = programacion?.publicadoEn ? fechaPublicacion(programacion.publicadoEn) : null;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={programar}
          disabled={!listoParaCorrer || ocupado}
          aria-busy={ocupado || undefined}
          title={conectado ? undefined : "Conecta Supabase"}
          className="text-[13px] font-medium"
        >
          <Sparkles className="mr-2 size-4" strokeWidth={2} aria-hidden="true" />
          {ocupado ? "Reprogramando…" : programacion ? "Reprogramar" : "Generar propuesta"}
        </Button>
        {programacion && (
          <p className="text-[11px] text-muted-foreground">
            Propuesta a {programacion.tope} h{publicado ? <> · publicada el {publicado}</> : null}
          </p>
        )}
      </div>

      {estado.paso === "programando" && <ProgresoNarrativo pct={estado.pct} etiqueta={estado.etiqueta} className="max-w-md" />}

      {estado.paso === "hecho" && (
        <p role="status" className="text-[13px] text-muted-foreground">
          Propuesta a {estado.resultado.tope} h publicada · ahorro{" "}
          <span className={cn("font-semibold tabular-nums", estado.resultado.ahorroMxn >= 0 ? "text-emerald-400" : "text-rose-300")}>
            {fmtMXN.format(estado.resultado.ahorroMxn)}
          </span>{" "}
          <span className="tabular-nums">({fmtPct.format(estado.resultado.ahorroPct)} %)</span>. Actualizando el panel…
        </p>
      )}

      {estado.paso === "error" && (
        <div className="flex max-w-md flex-col gap-2 rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2.5 text-[13px] text-rose-100">
          <p role="alert" className="flex items-start gap-2">
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-rose-300" aria-hidden="true" />
            <span>
              <span className="font-medium">No pudimos generar la propuesta.</span>{" "}
              <span className="text-rose-200/80">{estado.mensaje}</span>
            </span>
          </p>
          <div className="flex items-center gap-2">
            <Button type="button" size="sm" variant="outline" onClick={programar} className="text-[13px] font-medium">
              <RotateCcw className="mr-2 size-4" aria-hidden="true" />
              Reintentar
            </Button>
            <button
              type="button"
              onClick={() => setEstado({ paso: "inactivo" })}
              className="text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Nombre anterior; el botón primario "Programar semana" y el selector de tope ya no existen. */
export const ProgramarSemana = ReprogramarSemana;
