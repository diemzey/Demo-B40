"use client";

import { useState, type FormEvent } from "react";
import { Plus, Search, Trash2 } from "lucide-react";
import { JornadaTabla } from "@/components/ui/jornada-artefacto";
import {
  Campo,
  Panel,
  PanelHeader,
  TabHeader,
  botonPrimario,
  inputClass,
} from "@/components/dashboard/tabs/ui";
import { nuevoId, useLocalStore } from "@/components/dashboard/tabs/use-local-store";
import { usePanel } from "@/lib/datos/panel-context";

export type ColaboradorPropio = {
  id: string;
  nombre: string;
  /** Jornada contratada (h/semana); se muestra como "esta semana". */
  jornada: number;
  puesto: string;
};

type Fila = {
  id: string;
  nombre: string;
  foto: string | null;
  puesto: string;
  horas: number;
  propio: boolean;
};

export const COLABORADORES_KEY = "j40:colaboradores";
const VACIO: ColaboradorPropio[] = [];

function normaliza(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function ColaboradoresTab() {
  const datos = usePanel();
  const demo = datos.origen === "demo";
  const tope = datos.tope;
  const [propios, setPropios] = useLocalStore<ColaboradorPropio[]>(COLABORADORES_KEY, VACIO);
  const [busqueda, setBusqueda] = useState("");
  const [nombre, setNombre] = useState("");
  const [jornada, setJornada] = useState("40");
  const [puesto, setPuesto] = useState("");

  // Plantilla de la sucursal y semana del panel (misma fuente que el diagnóstico).
  const plantilla: Fila[] = datos.personas.map((p, i) => ({
    id: `${datos.sucursal?.id ?? "sucursal"}-${i}-${p.nombre}`,
    nombre: p.nombre,
    foto: p.foto || null,
    puesto: p.detalle ?? "Sin puesto",
    horas: p.hoy,
    propio: false,
  }));
  const filas: Fila[] = demo
    ? [
        ...plantilla,
        ...propios.map((p) => ({
          id: p.id,
          nombre: p.nombre,
          foto: null,
          puesto: p.puesto,
          horas: p.jornada,
          propio: true,
        })),
      ]
    : plantilla;
  const q = normaliza(busqueda.trim());
  const visibles = q
    ? filas.filter((f) => normaliza(`${f.nombre} ${f.puesto}`).includes(q))
    : filas;
  // Mismo criterio que `resumenDe`: exceso > 0 ⇔ horas > tope.
  const fuera = filas.filter((f) => f.horas > tope).length;

  function agregar(e: FormEvent) {
    e.preventDefault();
    const n = nombre.trim();
    const j = Number(jornada);
    if (!n || !Number.isFinite(j) || j <= 0) return;
    setPropios((prev) => [
      ...prev,
      { id: nuevoId("col"), nombre: n, jornada: Math.round(j * 2) / 2, puesto: puesto.trim() || "Sin puesto" },
    ]);
    setNombre("");
    setJornada("40");
    setPuesto("");
  }

  return (
    <div className="mx-auto w-full max-w-6xl p-4 md:p-6">
      <TabHeader
        eyebrow="Colaboradores"
        title={datos.sucursal ? `Colaboradores · ${datos.sucursal.nombre}` : "Colaboradores"}
        subtitle={`${filas.length} personas · ${fuera} exceden el tope de ${tope} h esta semana`}
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Panel className="xl:col-span-2">
          <PanelHeader
            title={`Plantilla · ${filas.length}`}
            description={
              datos.semana
                ? `Horas de la semana ${datos.semana.iso} contra el tope de ${tope} h`
                : `Horas de esta semana contra el tope de ${tope} h`
            }
            aside={
              <label className="relative block w-full max-w-56">
                <Search
                  className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
                <input
                  type="search"
                  className={`${inputClass} pl-8`}
                  placeholder="Buscar por nombre o puesto"
                  aria-label="Buscar colaborador"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                />
              </label>
            }
          />
          <div className="px-2 pb-2">
            <JornadaTabla
              personas={visibles.map((f) => ({
                nombre: f.nombre,
                foto: f.foto ?? "",
                detalle: f.puesto,
                hoy: f.horas,
                reacomodada: f.horas,
              }))}
              clave="hoy"
              tope={tope}
              maxAltura="32rem"
              nota={demo ? null : "Los colaboradores se cargan desde el CSV de cada semana."}
              accion={
                demo
                  ? (persona) => {
                      const fila = visibles.find((f) => f.nombre === persona.nombre);
                      if (!fila?.propio) return null;
                      return (
                        <button
                          type="button"
                          onClick={() => setPropios((prev) => prev.filter((p) => p.id !== fila.id))}
                          className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                          aria-label={`Eliminar a ${fila.nombre}`}
                        >
                          <Trash2 className="size-3.5" strokeWidth={1.5} />
                        </button>
                      );
                    }
                  : undefined
              }
              vacio={
                q ? (
                  <>Sin resultados para “{busqueda}”.</>
                ) : (
                  <>Aún no hay colaboradores con horas esta semana.</>
                )
              }
            />
          </div>
        </Panel>

        {demo ? (
          <Panel className="self-start">
            <PanelHeader
              title="Agregar colaborador"
              description="Sin foto se muestran sus iniciales. Se guarda en este navegador."
            />
            <form onSubmit={agregar} className="flex flex-col gap-3 p-4 pt-2">
              <Campo label="Nombre" htmlFor="col-nombre">
                <input
                  id="col-nombre"
                  className={inputClass}
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Apellido Nombre"
                  required
                />
              </Campo>
              <Campo label="Jornada contratada (h)" htmlFor="col-jornada" hint={`Tope vigente: ${tope} h por semana.`}>
                <input
                  id="col-jornada"
                  className={inputClass}
                  type="number"
                  min={1}
                  max={72}
                  step={0.5}
                  inputMode="decimal"
                  value={jornada}
                  onChange={(e) => setJornada(e.target.value)}
                  required
                />
              </Campo>
              <Campo label="Puesto" htmlFor="col-puesto">
                <input
                  id="col-puesto"
                  className={inputClass}
                  value={puesto}
                  onChange={(e) => setPuesto(e.target.value)}
                  placeholder="Ej. Cajero"
                />
              </Campo>
              <button type="submit" className={botonPrimario}>
                <Plus className="size-4" strokeWidth={2} aria-hidden="true" />
                Agregar colaborador
              </button>
            </form>
          </Panel>
        ) : (
          <Panel className="self-start">
            <PanelHeader
              title="Plantilla desde el CSV"
              description="Cada importación da de alta o actualiza a los colaboradores por su clave."
            />
            <p className="px-4 pb-4 text-xs text-muted-foreground">
              Los colaboradores se cargan desde el CSV. Sube la semana en la pestaña{" "}
              <a href="#semanas" className="font-medium text-foreground underline underline-offset-2">
                Semanas
              </a>{" "}
              y aparecerán aquí con sus horas.
            </p>
          </Panel>
        )}
      </div>
    </div>
  );
}
