"use client";

import { startTransition, useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { CircleCheck, RotateCcw, Sparkles, TriangleAlert, X } from "lucide-react";
import { LogoCargando } from "@/components/ui/logo-cargando";
import { createClient } from "@/lib/supabase/client";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { alTerminarSemanaCola, iniciarCola, reintentarCola, useCola, type EstadoCola as Cola } from "@/lib/programacion/cola";
import type { Par } from "@/lib/importacion/flujo";
import { useAvisoAntesDeSalir } from "@/lib/use-aviso-antes-de-salir";
import { cn } from "@/lib/utils";

/*
 * Píldora flotante del panel con la cola de programación en segundo plano:
 * "Programando 12 de 199 semanas · Tlalpan · semana 31". Al terminar, avisa
 * unos segundos y refresca el panel. Si la pestaña se cerró a medias en otra
 * sesión, ofrece terminar las semanas cargadas que sigan sin propuesta.
 */

const fmtN = new Intl.NumberFormat("es-MX");
const fmtMXN = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });
/** El panel se refresca como mucho cada tanto mientras la cola avanza. */
const REFRESCO_MS = 25000;
const AVISO_LISTO_MS = 12000;

const BASE =
  "pointer-events-auto flex max-w-[min(92vw,26rem)] items-center gap-2.5 rounded-full border bg-card/95 px-3.5 py-2 text-[13px] shadow-xl shadow-black/20 backdrop-blur";

/**
 * Refresco del panel con calma mientras la cola avanza, y una vez al terminar.
 * Devuelve la corrida (por su `terminoEn`) cuyo aviso de "listo" ya venció.
 */
function useRefrescoCola(terminoEn: number | null): number | null {
  const router = useRouter();
  const ultimoRefresco = useRef(0);
  const [avisoVencido, setAvisoVencido] = useState<number | null>(null);

  useEffect(() => {
    const quitar = alTerminarSemanaCola(() => {
      if (Date.now() - ultimoRefresco.current < REFRESCO_MS) return;
      ultimoRefresco.current = Date.now();
      startTransition(() => router.refresh());
    });
    return quitar;
  }, [router]);
  useEffect(() => {
    if (terminoEn === null) return;
    startTransition(() => router.refresh());
    const termino = terminoEn;
    const t = setTimeout(() => setAvisoVencido(termino), AVISO_LISTO_MS);
    return () => clearTimeout(t);
  }, [terminoEn, router]);

  return avisoVencido;
}

/**
 * Semanas cargadas sin propuesta (pestaña cerrada a medias en otra sesión).
 * Se consultan una vez, cuando la cola está quieta; `null` mientras no se sabe.
 */
function useSemanasSinPropuesta(cola: Cola, conectado: boolean) {
  const [sinPropuesta, setSinPropuesta] = useState<Par[] | null>(null);
  useEffect(() => {
    if (!conectado || cola.activa || cola.terminoEn !== null || sinPropuesta !== null) return;
    let cancelado = false;
    createClient()
      .rpc("semanas_sin_propuesta")
      .then(({ data }) => {
        if (cancelado) return;
        setSinPropuesta(
          (data ?? []).map((r) => ({ sucursal: { id: r.sucursal_id, nombre: r.sucursal, creada: false }, semanaIso: r.semana_iso })),
        );
      });
    return () => {
      cancelado = true;
    };
  }, [conectado, cola.activa, cola.terminoEn, sinPropuesta]);
  return { sinPropuesta, setSinPropuesta };
}

type Pildora = "progreso" | "error" | "listo" | "sin-propuesta" | null;

/** Qué píldora toca mostrar (o ninguna), en orden de prioridad. */
function pildoraActual(cola: Cola, avisoVencido: number | null, cerradoEn: number | null, sinPropuesta: Par[] | null): Pildora {
  if (cola.activa) return "progreso";
  if (cola.error) return "error";
  const listoVisible =
    cola.terminoEn !== null && avisoVencido !== cola.terminoEn && (cerradoEn === null || cerradoEn < cola.terminoEn);
  if (listoVisible) return "listo";
  // Lo que la cola programa (o ya programó en esta sesión) no cuenta como "sin propuesta".
  const sinPropuestaVisible =
    cola.terminoEn === null && cola.pendientes.length === 0 && (sinPropuesta?.length ?? 0) > 0 && cerradoEn === null;
  return sinPropuestaVisible ? "sin-propuesta" : null;
}

export function EstadoCola() {
  const cola = useCola();
  const conectado = hasSupabaseEnv();
  /** Momento en que la persona cerró la última píldora (la de "listo" o la de "sin propuesta"). */
  const [cerradoEn, setCerradoEn] = useState<number | null>(null);
  const avisoVencido = useRefrescoCola(cola.terminoEn);
  const { sinPropuesta, setSinPropuesta } = useSemanasSinPropuesta(cola, conectado);
  // Salir de la página cortaría la cola: el navegador pregunta antes.
  useAvisoAntesDeSalir(cola.activa);

  if (!conectado) return null;

  const cerrar = () => setCerradoEn(Date.now());
  const pildora = pildoraActual(cola, avisoVencido, cerradoEn, sinPropuesta);

  let contenido: ReactNode = null;
  if (pildora === "progreso") {
    contenido = <PildoraProgreso cola={cola} />;
  } else if (pildora === "error") {
    contenido = <PildoraError cola={cola} />;
  } else if (pildora === "listo") {
    contenido = <PildoraListo cola={cola} onCerrar={cerrar} />;
  } else if (pildora === "sin-propuesta" && sinPropuesta) {
    contenido = (
      <PildoraSinPropuesta
        pares={sinPropuesta}
        onProgramar={() => {
          iniciarCola(createClient(), sinPropuesta);
          setSinPropuesta([]);
        }}
        onCerrar={cerrar}
      />
    );
  }

  if (!contenido) return null;
  return <div className="pointer-events-none fixed inset-x-0 bottom-4 z-30 flex justify-center px-4 sm:justify-end sm:pr-6">{contenido}</div>;
}

/* ---------- Píldoras ---------- */

function PildoraProgreso({ cola }: { cola: Cola }) {
  return (
    <div className={cn(BASE, "border-border/70")} role="status" aria-live="polite">
      <LogoCargando size={18} label="" className="shrink-0 text-foreground" />
      <div className="min-w-0">
        <p className="truncate">
          Programando <span className="tabular-nums">{fmtN.format(Math.min(cola.hechas + 1, cola.total))}</span> de{" "}
          <span className="tabular-nums">{fmtN.format(cola.total)}</span> semanas
          {cola.actual && <span className="text-muted-foreground"> · {cola.actual}</span>}
        </p>
        <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-border/60" aria-hidden="true">
          <div className="h-full rounded-full bg-amber-400 transition-[width] duration-500" style={{ width: `${Math.round(cola.fraccion * 100)}%` }} />
        </div>
      </div>
    </div>
  );
}

function PildoraError({ cola }: { cola: Cola }) {
  return (
    <div className={cn(BASE, "border-rose-400/40")} role="alert">
      <TriangleAlert className="size-4 shrink-0 text-rose-300" strokeWidth={1.5} aria-hidden="true" />
      <p className="min-w-0 truncate">
        Faltan {fmtN.format(cola.pendientes.length)} semanas por programar.{" "}
        <span className="text-muted-foreground">{cola.error}</span>
      </p>
      <button type="button" onClick={reintentarCola} className="inline-flex shrink-0 items-center gap-1 font-medium underline underline-offset-2">
        <RotateCcw className="size-3.5" aria-hidden="true" />
        Reintentar
      </button>
    </div>
  );
}

function BotonCerrar({ onCerrar }: { onCerrar: () => void }) {
  return (
    <button type="button" onClick={onCerrar} className="shrink-0 text-muted-foreground hover:text-foreground" aria-label="Cerrar">
      <X className="size-4" aria-hidden="true" />
    </button>
  );
}

function PildoraListo({ cola, onCerrar }: { cola: Cola; onCerrar: () => void }) {
  return (
    <div className={cn(BASE, "border-emerald-400/40")} role="status">
      <CircleCheck className="size-4 shrink-0 text-emerald-400" strokeWidth={1.5} aria-hidden="true" />
      <p className="min-w-0 truncate">
        Listo: {fmtN.format(cola.hechas)} semanas con propuesta
        {cola.ahorroMxn !== 0 && (
          <span className="text-muted-foreground">
            {" "}
            · ahorro <span className="tabular-nums text-emerald-400">{fmtMXN.format(cola.ahorroMxn)}</span>/semana
          </span>
        )}
      </p>
      <BotonCerrar onCerrar={onCerrar} />
    </div>
  );
}

function PildoraSinPropuesta({ pares, onProgramar, onCerrar }: { pares: Par[]; onProgramar: () => void; onCerrar: () => void }) {
  return (
    <div className={cn(BASE, "border-amber-400/40")}>
      <Sparkles className="size-4 shrink-0 text-amber-300" strokeWidth={1.5} aria-hidden="true" />
      <p className="min-w-0 truncate">
        {fmtN.format(pares.length)} {pares.length === 1 ? "semana cargada sin propuesta" : "semanas cargadas sin propuesta"}
      </p>
      <button type="button" onClick={onProgramar} className="shrink-0 font-medium underline underline-offset-2">
        Programar ahora
      </button>
      <BotonCerrar onCerrar={onCerrar} />
    </div>
  );
}
