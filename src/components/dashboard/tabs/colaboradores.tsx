"use client";

import { useState, type FormEvent } from "react";
import { Plus, Search, Trash2 } from "lucide-react";
import { PLANTILLA_COAPA } from "@/components/demo/plantilla-coapa";
import { JORNADA_LEGAL, TOPE_2027 } from "@/components/dashboard/colaboradores-table";
import {
  Campo,
  Iniciales,
  Panel,
  PanelHeader,
  Pill,
  TabHeader,
  botonPrimario,
  inputClass,
} from "@/components/dashboard/tabs/ui";
import { nuevoId, useLocalStore } from "@/components/dashboard/tabs/use-local-store";

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

const fmtH = new Intl.NumberFormat("es-MX", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

function estadoDe(h: number): { texto: string; tono: "bad" | "warn" | "good" } {
  if (h > TOPE_2027) return { texto: "Excede", tono: "bad" };
  if (h > JORNADA_LEGAL) return { texto: "En el tope", tono: "warn" };
  return { texto: "Cumple", tono: "good" };
}

const SEMILLA: Fila[] = PLANTILLA_COAPA.map((p) => ({
  id: `coapa-${p.nombre}`,
  nombre: p.nombre,
  foto: p.foto,
  puesto: "Piso de venta",
  horas: p.hoy,
  propio: false,
}));

function normaliza(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function ColaboradoresTab() {
  const [propios, setPropios] = useLocalStore<ColaboradorPropio[]>(COLABORADORES_KEY, VACIO);
  const [busqueda, setBusqueda] = useState("");
  const [nombre, setNombre] = useState("");
  const [jornada, setJornada] = useState("40");
  const [puesto, setPuesto] = useState("");

  const filas: Fila[] = [
    ...SEMILLA,
    ...propios.map((p) => ({
      id: p.id,
      nombre: p.nombre,
      foto: null,
      puesto: p.puesto,
      horas: p.jornada,
      propio: true,
    })),
  ];
  const q = normaliza(busqueda.trim());
  const visibles = q
    ? filas.filter((f) => normaliza(`${f.nombre} ${f.puesto}`).includes(q))
    : filas;
  const fuera = filas.filter((f) => f.horas > TOPE_2027).length;

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
        title="Colaboradores"
        subtitle={`${filas.length} personas · ${fuera} exceden el tope de ${TOPE_2027} h esta semana`}
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Panel className="xl:col-span-2">
          <PanelHeader
            title={`Plantilla · ${filas.length}`}
            description={`Horas de esta semana contra el tope de ${TOPE_2027} h`}
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
          <div className="max-h-[32rem] overflow-auto">
            <table className="w-full text-[13px] [&_th]:whitespace-nowrap">
              <thead className="sticky top-0 z-10 bg-card shadow-[inset_0_-1px_0_0_var(--border)]">
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="h-9 px-4 font-medium">Colaborador</th>
                  <th className="h-9 px-2.5 text-right font-medium">Esta semana</th>
                  <th className="h-9 px-4 text-right font-medium">Estado</th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((f) => {
                  const estado = estadoDe(f.horas);
                  return (
                    <tr key={f.id} className="border-b border-border/60 last:border-0">
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2.5">
                          {f.foto ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={f.foto}
                              alt=""
                              width={28}
                              height={28}
                              className="size-7 shrink-0 rounded-full object-cover ring-1 ring-border/60"
                            />
                          ) : (
                            <Iniciales nombre={f.nombre} className="size-7" />
                          )}
                          <div className="min-w-0">
                            <p className="truncate font-medium text-foreground">{f.nombre}</p>
                            <p className="truncate text-[11px] text-muted-foreground">{f.puesto}</p>
                          </div>
                        </div>
                      </td>
                      <td
                        className={`px-2.5 py-2 text-right tabular-nums ${
                          f.horas > TOPE_2027 ? "text-destructive" : "text-foreground"
                        }`}
                      >
                        {fmtH.format(f.horas)} h
                      </td>
                      <td className="px-4 py-2 text-right">
                        <span className="inline-flex items-center justify-end gap-1.5">
                          <Pill tone={estado.tono}>{estado.texto}</Pill>
                          {f.propio && (
                            <button
                              type="button"
                              onClick={() => setPropios((prev) => prev.filter((p) => p.id !== f.id))}
                              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                              aria-label={`Eliminar a ${f.nombre}`}
                            >
                              <Trash2 className="size-3.5" strokeWidth={1.5} />
                            </button>
                          )}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {visibles.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-xs text-muted-foreground">
                      Sin resultados para “{busqueda}”.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Panel>

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
            <Campo label="Jornada contratada (h)" htmlFor="col-jornada" hint={`Tope vigente: ${TOPE_2027} h por semana.`}>
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
      </div>
    </div>
  );
}
