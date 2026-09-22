"use client";

import { Building2, MapPin, Trash2, Users } from "lucide-react";
import { Panel, PanelHeader, Pill, TabHeader, type PillTone } from "@/components/dashboard/tabs/ui";
import { useLocalStore } from "@/components/dashboard/tabs/use-local-store";
import { SUCURSALES_DEMO } from "@/lib/datos/demo";
import { usePanel } from "@/lib/datos/panel-context";
import type { SucursalPanel } from "@/lib/datos/tipos";

export type Sucursal = {
  id: string;
  nombre: string;
  ciudad: string;
  personas: number;
  estado: string;
  tono: PillTone;
  /** true cuando la creó la persona (se puede borrar). */
  propia?: boolean;
};

/** Tarjeta a partir de una sucursal del panel: el estado se deriva de sus cifras. */
function aSucursal(s: SucursalPanel): Sucursal {
  const sinDatos = s.personas === 0;
  const proporcion = sinDatos ? 0 : s.fueraDeNorma / s.personas;
  return {
    id: s.id,
    nombre: s.nombre,
    ciudad: s.ciudad ?? s.hub,
    personas: s.personas,
    estado: sinDatos
      ? "Sin diagnóstico"
      : s.fueraDeNorma === 0
        ? "En norma"
        : `${s.fueraDeNorma} fuera de norma`,
    tono: sinDatos ? "neutral" : s.fueraDeNorma === 0 ? "good" : proporcion <= 0.25 ? "warn" : "bad",
  };
}

/** Sucursales de muestra (modo demo); también las usa la pestaña Configuración. */
export const SUCURSALES_SEMILLA: Sucursal[] = SUCURSALES_DEMO.map(aSucursal);

export const SUCURSALES_KEY = "j40:sucursales";
const VACIO: Sucursal[] = [];

/** Sucursales guardadas por la persona (sin las semilla). */
export function useSucursalesPropias() {
  return useLocalStore<Sucursal[]>(SUCURSALES_KEY, VACIO);
}

function SucursalCard({ s, onDelete }: { s: Sucursal; onDelete?: () => void }) {
  return (
    <Panel className="flex flex-col gap-3 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-md bg-muted text-muted-foreground">
            <Building2 className="size-4" strokeWidth={1.5} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold">{s.nombre}</p>
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="size-3" strokeWidth={1.5} aria-hidden="true" />
              {s.ciudad}
            </p>
          </div>
        </div>
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            aria-label={`Eliminar sucursal ${s.nombre}`}
          >
            <Trash2 className="size-4" strokeWidth={1.5} />
          </button>
        )}
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-border/60 pt-3">
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Users className="size-3.5" strokeWidth={1.5} aria-hidden="true" />
          <span className="tabular-nums text-foreground">{s.personas}</span> colaboradores
        </span>
        <Pill tone={s.tono}>{s.estado}</Pill>
      </div>
    </Panel>
  );
}

export function SucursalesTab() {
  const datos = usePanel();
  const demo = datos.origen === "demo";
  const [propias] = useSucursalesPropias();

  // En demo se conservan las sucursales guardadas en este navegador; con
  // Supabase se muestran sólo las reales de la empresa. Las sucursales se
  // crean únicamente al importar un CSV.
  const reales = datos.sucursales.map(aSucursal);
  const todas = demo ? [...reales, ...propias] : reales;

  return (
    <div className="mx-auto w-full max-w-6xl p-4 md:p-6">
      <TabHeader
        eyebrow="Sucursales"
        title={datos.empresa ? `Sucursales · ${datos.empresa.nombre}` : "Sucursales"}
        subtitle={`${todas.length} ${todas.length === 1 ? "sucursal" : "sucursales"} · ${todas.reduce((a, s) => a + s.personas, 0)} colaboradores en total`}
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="grid grid-cols-1 content-start gap-3 sm:grid-cols-2 xl:col-span-2">
          {todas.map((s) => (
            <SucursalCard
              key={s.id}
              s={s}
            />
          ))}
        </div>

        <Panel className="self-start">
          <PanelHeader
            title="Sucursales de la empresa"
            description="Las cifras salen de la semana más reciente importada en cada sucursal."
          />
          <p className="px-4 pb-4 text-xs text-muted-foreground">
            Las sucursales se crean al importar un CSV: usa la columna{" "}
            <code className="font-mono text-[11px]">sucursal</code> (o el nombre que se te pide al
            subirlo) y aparecerán aquí con su diagnóstico.
          </p>
        </Panel>
      </div>
    </div>
  );
}
