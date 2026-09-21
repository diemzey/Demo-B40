"use client";

import { useState, type FormEvent } from "react";
import { Building2, MapPin, Plus, Trash2, Users } from "lucide-react";
import {
  Campo,
  Panel,
  PanelHeader,
  Pill,
  TabHeader,
  botonPrimario,
  inputClass,
  type PillTone,
} from "@/components/dashboard/tabs/ui";
import { nuevoId, useLocalStore } from "@/components/dashboard/tabs/use-local-store";
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
  const [propias, setPropias] = useSucursalesPropias();
  const [nombre, setNombre] = useState("");
  const [ciudad, setCiudad] = useState("");
  const [personas, setPersonas] = useState("");

  // En demo se conservan las sucursales guardadas en este navegador; con
  // Supabase se muestran sólo las reales de la empresa.
  const reales = datos.sucursales.map(aSucursal);
  const todas = demo ? [...reales, ...propias] : reales;

  function agregar(e: FormEvent) {
    e.preventDefault();
    const n = nombre.trim();
    const c = ciudad.trim();
    const p = Math.max(0, Math.round(Number(personas)));
    if (!n || !c || !Number.isFinite(p)) return;
    setPropias((prev) => [
      ...prev,
      {
        id: nuevoId("suc"),
        nombre: n,
        ciudad: c,
        personas: p,
        estado: "Sin diagnóstico",
        tono: "neutral",
        propia: true,
      },
    ]);
    setNombre("");
    setCiudad("");
    setPersonas("");
  }

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
              onDelete={
                demo && s.propia
                  ? () => setPropias((prev) => prev.filter((x) => x.id !== s.id))
                  : undefined
              }
            />
          ))}
        </div>

        {demo ? (
          <Panel className="self-start">
            <PanelHeader
              title="Agregar sucursal"
              description="Se guarda en este navegador y aparece en la lista."
            />
            <form onSubmit={agregar} className="flex flex-col gap-3 p-4 pt-2">
              <Campo label="Nombre" htmlFor="suc-nombre">
                <input
                  id="suc-nombre"
                  className={inputClass}
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej. Del Valle"
                  required
                />
              </Campo>
              <Campo label="Ciudad" htmlFor="suc-ciudad">
                <input
                  id="suc-ciudad"
                  className={inputClass}
                  value={ciudad}
                  onChange={(e) => setCiudad(e.target.value)}
                  placeholder="Ej. Ciudad de México"
                  required
                />
              </Campo>
              <Campo label="Colaboradores" htmlFor="suc-personas">
                <input
                  id="suc-personas"
                  className={inputClass}
                  type="number"
                  min={0}
                  step={1}
                  inputMode="numeric"
                  value={personas}
                  onChange={(e) => setPersonas(e.target.value)}
                  placeholder="0"
                  required
                />
              </Campo>
              <button type="submit" className={botonPrimario}>
                <Plus className="size-4" strokeWidth={2} aria-hidden="true" />
                Agregar sucursal
              </button>
            </form>
          </Panel>
        ) : (
          <Panel className="self-start">
            <PanelHeader
              title="Sucursales de la empresa"
              description="Las cifras salen de la semana más reciente importada en cada sucursal."
            />
            <p className="px-4 pb-4 text-xs text-muted-foreground">
              Las sucursales se crean al registrar la empresa; para agregar otra escríbenos y la
              damos de alta en tu cuenta.
            </p>
          </Panel>
        )}
      </div>
    </div>
  );
}
