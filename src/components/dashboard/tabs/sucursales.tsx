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

export const SUCURSALES_SEMILLA: Sucursal[] = [
  { id: "coapa", nombre: "Coapa", ciudad: "Ciudad de México", personas: 30, estado: "27 fuera de norma", tono: "bad" },
  { id: "polanco", nombre: "Polanco", ciudad: "Ciudad de México", personas: 22, estado: "En norma", tono: "good" },
  { id: "satelite", nombre: "Satélite", ciudad: "Naucalpan", personas: 18, estado: "3 fuera de norma", tono: "warn" },
];

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
  const [propias, setPropias] = useSucursalesPropias();
  const [nombre, setNombre] = useState("");
  const [ciudad, setCiudad] = useState("");
  const [personas, setPersonas] = useState("");

  const todas = [...SUCURSALES_SEMILLA, ...propias];

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
        title="Sucursales"
        subtitle={`${todas.length} sucursales · ${todas.reduce((a, s) => a + s.personas, 0)} colaboradores en total`}
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="grid grid-cols-1 content-start gap-3 sm:grid-cols-2 xl:col-span-2">
          {todas.map((s) => (
            <SucursalCard
              key={s.id}
              s={s}
              onDelete={
                s.propia
                  ? () => setPropias((prev) => prev.filter((x) => x.id !== s.id))
                  : undefined
              }
            />
          ))}
        </div>

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
      </div>
    </div>
  );
}
