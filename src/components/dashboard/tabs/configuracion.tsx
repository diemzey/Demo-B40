"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Check, Save } from "lucide-react";
import { SUCURSALES_SEMILLA, useSucursalesPropias } from "@/components/dashboard/tabs/sucursales";
import {
  Campo,
  Panel,
  PanelHeader,
  TabHeader,
  botonPrimario,
  inputClass,
} from "@/components/dashboard/tabs/ui";
import { useConfig, type Config } from "@/components/dashboard/tabs/use-local-store";

const TOPES: { valor: number; etiqueta: string }[] = [
  { valor: 48, etiqueta: "48 h · hasta 2026" },
  { valor: 46, etiqueta: "46 h · 2027" },
  { valor: 44, etiqueta: "44 h · 2028" },
  { valor: 42, etiqueta: "42 h · 2029" },
  { valor: 40, etiqueta: "40 h · 2030 (meta)" },
];

function Formulario({
  inicial,
  sucursales,
  onGuardar,
}: {
  inicial: Config;
  sucursales: string[];
  onGuardar: (c: Config) => void;
}) {
  const [tope, setTope] = useState(String(inicial.tope));
  const [costoHora, setCostoHora] = useState(String(inicial.costoHora));
  const [sucursal, setSucursal] = useState(inicial.sucursalPrincipal);
  const [registro, setRegistro] = useState(inicial.registroConectado);

  function guardar(e: FormEvent) {
    e.preventDefault();
    const costo = Number(costoHora);
    onGuardar({
      tope: Number(tope),
      costoHora: Number.isFinite(costo) && costo > 0 ? costo : inicial.costoHora,
      sucursalPrincipal: sucursal,
      registroConectado: registro,
    });
  }

  return (
    <form onSubmit={guardar} className="flex flex-col gap-4 p-4 pt-2">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Campo label="Tope vigente" htmlFor="cfg-tope" hint="Horas máximas por semana y colaborador.">
          <select id="cfg-tope" className={inputClass} value={tope} onChange={(e) => setTope(e.target.value)}>
            {TOPES.map((t) => (
              <option key={t.valor} value={t.valor}>
                {t.etiqueta}
              </option>
            ))}
          </select>
        </Campo>
        <Campo label="Costo por hora (MXN)" htmlFor="cfg-costo" hint="Referencia para el costo extra; la hora arriba del tope se paga al doble.">
          <input
            id="cfg-costo"
            className={inputClass}
            type="number"
            min={1}
            step={1}
            inputMode="decimal"
            value={costoHora}
            onChange={(e) => setCostoHora(e.target.value)}
            required
          />
        </Campo>
        <Campo label="Sucursal principal" htmlFor="cfg-sucursal">
          <select
            id="cfg-sucursal"
            className={inputClass}
            value={sucursal}
            onChange={(e) => setSucursal(e.target.value)}
          >
            {sucursales.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Campo>
      </div>

      <label className="flex items-start gap-2.5 rounded-md border border-border/60 p-3 text-[13px]">
        <input
          type="checkbox"
          className="mt-0.5 size-4 shrink-0 accent-yellow-400"
          checked={registro}
          onChange={(e) => setRegistro(e.target.checked)}
        />
        <span>
          <span className="font-medium">Registro electrónico de asistencia conectado</span>
          <span className="mt-0.5 block text-xs text-muted-foreground">
            Toma las entradas y salidas directamente del checador en lugar del CSV semanal.
          </span>
        </span>
      </label>

      <div className="flex items-center gap-3">
        <button type="submit" className={botonPrimario}>
          <Save className="size-4" strokeWidth={2} aria-hidden="true" />
          Guardar
        </button>
      </div>
    </form>
  );
}

export function ConfiguracionTab() {
  const [config, setConfig] = useConfig();
  const [propias] = useSucursalesPropias();
  const [guardado, setGuardado] = useState(false);

  useEffect(() => {
    if (!guardado) return;
    const t = window.setTimeout(() => setGuardado(false), 2500);
    return () => window.clearTimeout(t);
  }, [guardado]);

  const sucursales = Array.from(
    new Set([
      ...SUCURSALES_SEMILLA.map((s) => s.nombre),
      ...propias.map((s) => s.nombre),
      config.sucursalPrincipal,
    ]),
  );

  return (
    <div className="mx-auto w-full max-w-6xl p-4 md:p-6">
      <TabHeader
        eyebrow="Configuración"
        title="Configuración"
        subtitle="Parámetros del diagnóstico. Se guardan en este navegador."
      />
      <Panel className="max-w-3xl">
        <PanelHeader
          title="Parámetros"
          description="El costo por hora alimenta las tarjetas y la gráfica de costo del diagnóstico."
          aside={
            <span
              role="status"
              aria-live="polite"
              className={`inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400 transition-opacity ${
                guardado ? "opacity-100" : "opacity-0"
              }`}
            >
              <Check className="size-3.5" strokeWidth={2} aria-hidden="true" />
              Guardado
            </span>
          }
        />
        {/* `key` reinicia el formulario cuando cambia lo guardado (p. ej. tras hidratar). */}
        <Formulario
          key={JSON.stringify(config)}
          inicial={config}
          sucursales={sucursales}
          onGuardar={(c) => {
            setConfig(c);
            setGuardado(true);
          }}
        />
      </Panel>
    </div>
  );
}
