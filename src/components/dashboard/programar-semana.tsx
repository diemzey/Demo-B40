"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CircleCheck, Loader2, RotateCcw, Sparkles, TriangleAlert, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { botonOutline } from "@/components/dashboard/tabs/ui";
import { usePanel } from "@/lib/datos/panel-context";
import { TOPE_2030 } from "@/lib/datos/tipos";
import { createClient } from "@/lib/supabase/client";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import {
  programarSemana,
  type ProgresoProgramacion,
  type ResultadoProgramacion,
} from "@/lib/motor/programar";
import { cn } from "@/lib/utils";

/*
 * "Programar semana": corre el motor en el navegador (src/lib/motor/programar)
 * para la sucursal-semana del panel, muestra el avance paso a paso y, al
 * terminar, un resumen del ahorro. Publica baseline y propuesta en Supabase y
 * refresca la ruta para que el panel lea la propuesta (`datos.programacion`).
 * En modo demo (sin Supabase) el botón va deshabilitado.
 */

/** Topes que se pueden elegir (h/semana): el objetivo de la reforma y los transitorios. */
const TOPES = [40, 42, 44, 46, 48] as const;

const PASOS: Record<ProgresoProgramacion["paso"], string> = {
  catalogo: "Leyendo catálogo",
  demanda: "Calculando demanda",
  baseline: "Materializando baseline",
  optimizando: "Optimizando turnos",
  guardando: "Guardando propuesta",
  resumiendo: "Resumiendo costos",
  listo: "Listo",
};

type Estado =
  | { paso: "inactivo" }
  | { paso: "programando"; progreso: ProgresoProgramacion }
  | { paso: "hecho"; resultado: ResultadoProgramacion }
  | { paso: "error"; mensaje: string };

const fmtMXN = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});
const fmtH = new Intl.NumberFormat("es-MX", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const fmtPct = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 1 });
const fmtFecha = new Intl.DateTimeFormat("es-MX", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Mexico_City",
});

const cobertura = (v: number | null) => (v === null ? "—" : `${fmtPct.format(v)} %`);

function fechaPublicacion(iso: string): string | null {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : fmtFecha.format(d).replace(".", "");
}

export function ProgramarSemana({ className }: { className?: string }) {
  const datos = usePanel();
  const router = useRouter();
  const conectado = hasSupabaseEnv();
  const selectId = useId();
  const { sucursal, semana, programacion } = datos;

  const [tope, setTope] = useState<number>(programacion?.tope ?? TOPE_2030);
  const [estado, setEstado] = useState<Estado>({ paso: "inactivo" });
  // Evita actualizar el estado si el componente se desmonta a media corrida.
  const vivo = useRef(true);
  useEffect(() => {
    vivo.current = true;
    return () => {
      vivo.current = false;
    };
  }, []);

  const ocupado = estado.paso === "programando";
  const reprogramar = programacion !== null;
  const listoParaCorrer = conectado && sucursal !== null && semana !== null;
  // Si la propuesta vigente usó un tope fuera del catálogo, se ofrece también.
  const topes: number[] = TOPES.some((t) => t === tope) ? [...TOPES] : [...TOPES, tope].sort((a, b) => a - b);

  async function programar() {
    if (!listoParaCorrer || ocupado || !sucursal || !semana) return;
    let terminado = false;
    setEstado({ paso: "programando", progreso: { paso: "catalogo", pct: 0 } });
    try {
      const resultado = await programarSemana({
        supabase: createClient(),
        sucursalId: sucursal.id,
        semanaIso: semana.inicio,
        tope,
        onProgreso: (p) => {
          if (vivo.current && !terminado) setEstado({ paso: "programando", progreso: p });
        },
      });
      terminado = true;
      if (!vivo.current) return;
      setEstado({ paso: "hecho", resultado });
      // El panel (servidor) vuelve a leer v_ahorro_escenario y la propuesta.
      router.refresh();
    } catch (e) {
      terminado = true;
      if (!vivo.current) return;
      setEstado({
        paso: "error",
        mensaje: e instanceof Error && e.message ? e.message : "No se pudo programar la semana.",
      });
    }
  }

  const cerrar = () => setEstado({ paso: "inactivo" });

  const boton = (
    <Button
      type="button"
      size="sm"
      variant={reprogramar ? "outline" : "default"}
      onClick={programar}
      disabled={!listoParaCorrer || ocupado}
      aria-busy={ocupado || undefined}
      className={cn(
        "text-[13px] font-semibold",
        !reprogramar && "bg-yellow-400 text-neutral-950 hover:bg-yellow-300",
      )}
    >
      {ocupado ? (
        <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
      ) : (
        <Sparkles className="mr-2 size-4" strokeWidth={2} aria-hidden="true" />
      )}
      {ocupado ? "Programando…" : reprogramar ? "Reprogramar" : "Programar semana"}
    </Button>
  );

  const publicado = programacion?.publicadoEn ? fechaPublicacion(programacion.publicadoEn) : null;

  return (
    <div className={cn("relative flex flex-col items-start gap-1 sm:items-end", className)}>
      <div className="flex items-center gap-2">
        <label htmlFor={selectId} className="sr-only">
          Tope semanal en horas
        </label>
        <select
          id={selectId}
          value={tope}
          onChange={(e) => setTope(Number(e.target.value))}
          disabled={!conectado || ocupado}
          title="Tope semanal por colaborador"
          className="h-9 rounded-md border border-border/80 bg-background px-2 text-[13px] tabular-nums text-foreground shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {topes.map((t) => (
            <option key={t} value={t}>
              {t} h
            </option>
          ))}
        </select>
        {conectado ? (
          boton
        ) : (
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span tabIndex={0} className="inline-flex rounded-md">
                  {boton}
                </span>
              </TooltipTrigger>
              <TooltipContent className="text-xs">Conecta Supabase</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      {reprogramar && (
        <p className="text-[11px] text-muted-foreground">
          Propuesta a {programacion.tope} h{publicado ? ` · publicada el ${publicado}` : ""}
        </p>
      )}

      {estado.paso !== "inactivo" && (
        <div
          role={estado.paso === "error" ? "alert" : "status"}
          aria-live="polite"
          aria-busy={ocupado || undefined}
          className="absolute left-0 top-full z-20 mt-2 w-[min(calc(100vw-2rem),380px)] rounded-lg border border-border bg-card p-4 text-[13px] shadow-xl shadow-black/30 sm:left-auto sm:right-0"
        >
          {estado.paso === "programando" && (
            <Progreso
              progreso={estado.progreso}
              detalle={`Sucursal ${sucursal?.nombre ?? "—"} · semana ${semana?.iso ?? "—"} · tope ${tope} h`}
            />
          )}
          {estado.paso === "hecho" && <Resumen resultado={estado.resultado} onCerrar={cerrar} />}
          {estado.paso === "error" && (
            <Fallo mensaje={estado.mensaje} onReintentar={programar} onCerrar={cerrar} />
          )}
        </div>
      )}
    </div>
  );
}

function Progreso({ progreso, detalle }: { progreso: ProgresoProgramacion; detalle: string }) {
  const pct = Math.max(0, Math.min(100, Math.round(progreso.pct)));
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 font-medium">
          <Loader2 className="size-3.5 animate-spin text-amber-400" aria-hidden="true" />
          {PASOS[progreso.paso]}
        </p>
        <span className="text-xs tabular-nums text-muted-foreground">{pct} %</span>
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-label={PASOS[progreso.paso]}
        className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
      >
        <div
          className="h-full rounded-full bg-amber-400 transition-[width] duration-300 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
      {progreso.detalle && <p className="text-xs text-muted-foreground">{progreso.detalle}</p>}
      <p className="text-[11px] text-muted-foreground/80">{detalle}</p>
    </div>
  );
}

function Resumen({ resultado: r, onCerrar }: { resultado: ResultadoProgramacion; onCerrar: () => void }) {
  const vacantes = r.vacantesHoras > 0 ? Math.ceil(r.vacantesHoras / r.tope) : 0;
  const positivo = r.ahorroMxn >= 0;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <p className="flex items-center gap-2 font-semibold">
          <CircleCheck className="size-4 text-emerald-400" aria-hidden="true" />
          Propuesta publicada
        </p>
        <button
          type="button"
          onClick={onCerrar}
          aria-label="Cerrar"
          className="-mr-1 -mt-1 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
      <div>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Ahorro · semana</p>
        <p
          className={cn(
            "mt-0.5 text-2xl font-semibold tabular-nums",
            positivo ? "text-emerald-400" : "text-destructive",
          )}
        >
          {fmtMXN.format(r.ahorroMxn)}
        </p>
        <p className="text-xs text-muted-foreground">
          {fmtPct.format(r.ahorroPct)} % del costo laboral · {fmtMXN.format(r.costoBaseline)} →{" "}
          {fmtMXN.format(r.costoPropuesta)}
        </p>
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs">
        <dt className="text-muted-foreground">Horas al doble</dt>
        <dd className="text-right tabular-nums">
          <span className="text-destructive">{fmtH.format(r.horasDoblesBaseline)} h</span> → 0 h
        </dd>
        <dt className="text-muted-foreground">Cobertura pico</dt>
        <dd className="text-right tabular-nums">
          {cobertura(r.coberturaPicoBaselinePct)} → {cobertura(r.coberturaPicoPropuestaPct)}
        </dd>
        {vacantes > 0 && (
          <>
            <dt className="text-muted-foreground">Vacantes sugeridas</dt>
            <dd className="text-right tabular-nums text-amber-400">
              {vacantes} · {fmtH.format(r.vacantesHoras)} h sin cubrir
            </dd>
          </>
        )}
        <dt className="text-muted-foreground">Turnos asignados</dt>
        <dd className="text-right tabular-nums">
          {r.asignaciones} · {fmtH.format(r.ms / 1000)} s
        </dd>
      </dl>
      <p className="text-[11px] text-muted-foreground">El panel ya muestra la propuesta a {r.tope} h.</p>
    </div>
  );
}

function Fallo({
  mensaje,
  onReintentar,
  onCerrar,
}: {
  mensaje: string;
  onReintentar: () => void;
  onCerrar: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-md border border-rose-500/30 bg-rose-500/10 p-3">
      <p className="flex items-start gap-2 text-rose-300">
        <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span>
          <span className="font-medium">No se pudo programar la semana.</span>{" "}
          <span className="text-rose-300/80">{mensaje}</span>
        </span>
      </p>
      <div className="flex items-center gap-2">
        <button type="button" onClick={onReintentar} className={botonOutline}>
          <RotateCcw className="size-3.5" aria-hidden="true" />
          Reintentar
        </button>
        <button
          type="button"
          onClick={onCerrar}
          className="text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}
