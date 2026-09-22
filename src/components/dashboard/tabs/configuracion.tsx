"use client";

import { useEffect, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Check, Save } from "lucide-react";
import {
  BotonPrimario,
  Campo,
  Panel,
  PanelHeader,
  TabHeader,
  inputClass,
} from "@/components/dashboard/tabs/ui";
import { usePanel } from "@/lib/datos/panel-context";
import { createClient } from "@/lib/supabase/client";

/**
 * Configuración de la empresa: los dos parámetros que usa el motor al armar
 * la propuesta (`programarSemana`, src/lib/motor/programar.ts):
 *   - `empresas.tope_objetivo`      → "Tope objetivo"
 *   - `empresas.costo_hora_default` → "Costo por hora"
 * Se guardan con el cliente de Supabase del navegador; por RLS sólo el
 * owner puede actualizarlos (política `empresas_update`).
 */

const TOPES = [40, 42, 44, 46, 48] as const;
const TOPE_DEFAULT = 40;
const COSTO_DEFAULT = 60;

type Valores = { tope: number; costoHora: number };

function normalizar(tope: unknown, costo: unknown): Valores {
  const t = Number(tope);
  const c = Number(costo);
  return {
    tope: (TOPES as readonly number[]).includes(t) ? t : TOPE_DEFAULT,
    costoHora: Number.isFinite(c) && c > 0 ? c : COSTO_DEFAULT,
  };
}

type Estado =
  | { tipo: "idle" }
  | { tipo: "guardado" }
  | { tipo: "sin-permiso" }
  | { tipo: "error" }
  | { tipo: "demo" };

function Formulario({
  inicial,
  guardando,
  onGuardar,
}: {
  inicial: Valores;
  guardando: boolean;
  onGuardar: (v: Valores) => void;
}) {
  const [tope, setTope] = useState(String(inicial.tope));
  const [costoHora, setCostoHora] = useState(String(inicial.costoHora));
  const costo = Number(costoHora);
  const costoValido = Number.isFinite(costo) && costo > 0;

  function guardar(e: FormEvent) {
    e.preventDefault();
    if (!costoValido) return;
    onGuardar({ tope: Number(tope), costoHora: costo });
  }

  return (
    <form onSubmit={guardar} className="flex flex-col gap-4 p-4 pt-2">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Campo label="Tope objetivo" htmlFor="cfg-tope" hint="Horas por semana y colaborador con las que se arma tu propuesta.">
          <select id="cfg-tope" className={inputClass} value={tope} onChange={(e) => setTope(e.target.value)}>
            {TOPES.map((t) => (
              <option key={t} value={t}>
                {t} h{t === TOPE_DEFAULT ? " · meta 2030" : ""}
              </option>
            ))}
          </select>
        </Campo>
        <Campo label="Costo por hora (MXN)" htmlFor="cfg-costo" hint="Hora ordinaria. Arriba del tope se paga al doble.">
          <input
            id="cfg-costo"
            className={inputClass}
            type="number"
            min={1}
            step={1}
            inputMode="decimal"
            value={costoHora}
            onChange={(e) => setCostoHora(e.target.value)}
            aria-invalid={!costoValido || undefined}
            required
          />
        </Campo>
      </div>

      <div className="flex items-center gap-3">
        <BotonPrimario type="submit" disabled={guardando || !costoValido}>
          <Save className="size-4" strokeWidth={1.5} aria-hidden="true" />
          {guardando ? "Guardando…" : "Guardar"}
        </BotonPrimario>
      </div>
    </form>
  );
}

export function ConfiguracionTab() {
  const datos = usePanel();
  const router = useRouter();
  const empresa = datos.empresa;
  const enSupabase = datos.origen === "supabase" && !!empresa;

  // Valores iniciales: los del panel (`DatosPanel.empresa`), con 40 h y $60 de respaldo.
  const [valores, setValores] = useState<Valores>(() =>
    normalizar(empresa?.topeObjetivo ?? TOPE_DEFAULT, empresa?.costoHoraDefault ?? COSTO_DEFAULT),
  );
  const [estado, setEstado] = useState<Estado>({ tipo: "idle" });
  const [guardando, setGuardando] = useState(false);
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (estado.tipo !== "guardado") return;
    const t = window.setTimeout(() => setEstado({ tipo: "idle" }), 3000);
    return () => window.clearTimeout(t);
  }, [estado]);

  async function guardar(v: Valores) {
    if (!enSupabase || !empresa) {
      setValores(v);
      setEstado({ tipo: "demo" });
      return;
    }
    setGuardando(true);
    setEstado({ tipo: "idle" });
    try {
      const { data, error } = await createClient()
        .from("empresas")
        .update({ tope_objetivo: v.tope, costo_hora_default: v.costoHora })
        .eq("id", empresa.id)
        .select("id");
      if (error) {
        setEstado({ tipo: /permission|policy|row-level|42501/i.test(error.message) ? "sin-permiso" : "error" });
        return;
      }
      // Sin permiso, RLS no toca ninguna fila y no devuelve error.
      if (!data || data.length === 0) {
        setEstado({ tipo: "sin-permiso" });
        return;
      }
      setValores(v);
      setEstado({ tipo: "guardado" });
      startTransition(() => router.refresh());
    } catch {
      setEstado({ tipo: "error" });
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl p-4 md:p-6">
      <TabHeader
        eyebrow="Configuración"
        title="Configuración"
        subtitle="El tope y el costo por hora con los que se arma tu propuesta."
      />
      <Panel className="max-w-3xl">
        <PanelHeader
          title="Propuesta"
          description="Se aplican la próxima vez que programes una semana."
          aside={
            <span
              role="status"
              aria-live="polite"
              className={`inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400 transition-opacity ${
                estado.tipo === "guardado" ? "opacity-100" : "opacity-0"
              }`}
            >
              <Check className="size-3.5" strokeWidth={2} aria-hidden="true" />
              Guardado
            </span>
          }
        />
        {/* `key` reinicia el formulario cuando cambian los valores guardados. */}
        <Formulario
          key={`${valores.tope}-${valores.costoHora}`}
          inicial={valores}
          guardando={guardando}
          onGuardar={(v) => void guardar(v)}
        />
        {estado.tipo !== "idle" && estado.tipo !== "guardado" && (
          <p role="status" className="j40-muted border-t border-border/60 px-4 py-3">
            {estado.tipo === "sin-permiso" && "Solo la persona dueña de la cuenta puede cambiar estos valores."}
            {estado.tipo === "error" && "No pudimos guardar. Inténtalo de nuevo."}
            {estado.tipo === "demo" && "En la demostración los cambios no se guardan."}
          </p>
        )}
      </Panel>
    </div>
  );
}
