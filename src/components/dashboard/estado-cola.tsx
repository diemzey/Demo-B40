"use client";

import { startTransition, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CircleCheck, RotateCcw, Sparkles, TriangleAlert, X } from "lucide-react";
import { LogoCargando } from "@/components/ui/logo-cargando";
import { createClient } from "@/lib/supabase/client";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { alTerminarSemanaCola, iniciarCola, reintentarCola, useCola } from "@/lib/programacion/cola";
import type { Par } from "@/lib/importacion/flujo";
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

export function EstadoCola() {
  const router = useRouter();
  const cola = useCola();
  const conectado = hasSupabaseEnv();
  const [sinPropuesta, setSinPropuesta] = useState<Par[] | null>(null);
  /** Momento en que la persona cerró la última píldora (la de "listo" o la de "sin propuesta"). */
  const [cerradoEn, setCerradoEn] = useState<number | null>(null);
  /** Corrida (por su `terminoEn`) cuyo aviso de "listo" ya venció. */
  const [avisoVencido, setAvisoVencido] = useState<number | null>(null);
  const ultimoRefresco = useRef(0);

  // Refresco del panel con calma mientras avanza, y una vez al terminar.
  useEffect(() => {
    const quitar = alTerminarSemanaCola(() => {
      if (Date.now() - ultimoRefresco.current < REFRESCO_MS) return;
      ultimoRefresco.current = Date.now();
      startTransition(() => router.refresh());
    });
    return quitar;
  }, [router]);
  useEffect(() => {
    if (cola.terminoEn === null) return;
    startTransition(() => router.refresh());
    const termino = cola.terminoEn;
    const t = setTimeout(() => setAvisoVencido(termino), AVISO_LISTO_MS);
    return () => clearTimeout(t);
  }, [cola.terminoEn, router]);

  // Salir de la página cortaría la cola: el navegador pregunta antes.
  useEffect(() => {
    if (!cola.activa) return;
    const avisar = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", avisar);
    return () => window.removeEventListener("beforeunload", avisar);
  }, [cola.activa]);

  // Semanas cargadas sin propuesta (pestaña cerrada a medias en otra sesión).
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

  if (!conectado) return null;

  const listoVisible =
    cola.terminoEn !== null && avisoVencido !== cola.terminoEn && (cerradoEn === null || cerradoEn < cola.terminoEn);
  // Lo que la cola programa (o ya programó en esta sesión) no cuenta como "sin propuesta".
  const sinPropuestaVisible =
    !cola.activa && cola.terminoEn === null && cola.pendientes.length === 0 && (sinPropuesta?.length ?? 0) > 0 && cerradoEn === null;

  const base =
    "pointer-events-auto flex max-w-[min(92vw,26rem)] items-center gap-2.5 rounded-full border bg-card/95 px-3.5 py-2 text-[13px] shadow-xl shadow-black/20 backdrop-blur";

  let contenido: React.ReactNode = null;
  if (cola.activa) {
    contenido = (
      <div className={cn(base, "border-border/70")} role="status" aria-live="polite">
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
  } else if (cola.error) {
    contenido = (
      <div className={cn(base, "border-rose-400/40")} role="alert">
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
  } else if (listoVisible) {
    contenido = (
      <div className={cn(base, "border-emerald-400/40")} role="status">
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
        <button type="button" onClick={() => setCerradoEn(Date.now())} className="shrink-0 text-muted-foreground hover:text-foreground" aria-label="Cerrar">
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
    );
  } else if (sinPropuestaVisible && sinPropuesta) {
    contenido = (
      <div className={cn(base, "border-amber-400/40")}>
        <Sparkles className="size-4 shrink-0 text-amber-300" strokeWidth={1.5} aria-hidden="true" />
        <p className="min-w-0 truncate">
          {fmtN.format(sinPropuesta.length)} {sinPropuesta.length === 1 ? "semana cargada sin propuesta" : "semanas cargadas sin propuesta"}
        </p>
        <button
          type="button"
          onClick={() => {
            iniciarCola(createClient(), sinPropuesta);
            setSinPropuesta([]);
          }}
          className="shrink-0 font-medium underline underline-offset-2"
        >
          Programar ahora
        </button>
        <button type="button" onClick={() => setCerradoEn(Date.now())} className="shrink-0 text-muted-foreground hover:text-foreground" aria-label="Cerrar">
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
    );
  }

  if (!contenido) return null;
  return <div className="pointer-events-none fixed inset-x-0 bottom-4 z-30 flex justify-center px-4 sm:justify-end sm:pr-6">{contenido}</div>;
}
