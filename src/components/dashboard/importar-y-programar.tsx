"use client";

import {
  startTransition,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { CircleCheck, FileText, RotateCcw, TriangleAlert, Upload } from "lucide-react";
import { LogoCargando } from "@/components/ui/logo-cargando";
import { Button } from "@/components/ui/button";
import { COOKIE_SEMANA, COOKIE_SUCURSAL } from "@/lib/datos/tipos";
import { iniciarCola } from "@/lib/programacion/cola";
import { usePanel } from "@/lib/datos/panel-context";
import {
  ErrorFlujo,
  TRAMOS,
  etiquetaSemana,
  fraseTurnos,
  importarYProgramarTurnos,
  leerContextoImportacion,
  numeroSemanaIso,
  parsearTurnos,
  proponerDestino,
  resumirTurnos,
  type ContextoImportacion,
  type DestinoResuelto,
  type ErrorFila,
  type EtapaFlujo,
  type ProgramacionFlujo,
  type ProgresoFlujo,
  type ResultadoFlujo,
  type ResultadoImportacion,
  type ResultadoParseo,
  type ResumenTurnos,
  type SucursalBreve,
} from "@/lib/importacion";
import { createClient } from "@/lib/supabase/client";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { cn } from "@/lib/utils";

/**
 * Subir la semana es un solo gesto: soltar el CSV. A partir de ahí, sin
 * botones, la misma tarjeta lee el archivo, decide la sucursal, guarda los
 * turnos y corre el motor para publicar la propuesta; al terminar fija la
 * cookie de sucursal y refresca la ruta para que el Diagnóstico abra ya con
 * el antes/después. Una sola barra 0–100 con frases humanas.
 *
 * Sólo se detiene si el archivo trae filas con error (se muestran y la
 * persona decide si continúa con las válidas) o si algo falla: entonces
 * "Reintentar" retoma desde el paso que falló.
 */

const MAX_ERRORES_VISIBLES = 8;
/** Ventana para cambiar la sucursal propuesta antes de que se cree/use. */
const ESPERA_DESTINO_MS = 2000;
/** Puntos que el avance suave puede adelantarse al último avance real. */
const ADELANTO_MAX = 3;
/** Tope si la empresa no tiene uno guardado (meta de la reforma, 2030). */
const TOPE_POR_DEFECTO = 40;
/** Topes de la transición de la reforma (LFT): 2026 → 2030. */
const TOPES_REFORMA = [48, 46, 44, 42, 40] as const;

const fmtN = new Intl.NumberFormat("es-MX");
const fmtMXN = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });
const fmtPct = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 1 });

type Archivo = { nombre: string; parseo: ResultadoParseo; resumen: ResumenTurnos };

/** Lo necesario para retomar tras un fallo sin repetir lo que ya quedó. */
type Reanudar = {
  contexto: ContextoImportacion | null;
  destino: DestinoResuelto | null;
  resultados: ResultadoImportacion[] | null;
  programaciones: ProgramacionFlujo[];
};

type Estado =
  | { fase: "vacio" }
  | { fase: "revisar"; archivo: Archivo }
  | { fase: "demo"; archivo: Archivo }
  | { fase: "corriendo"; archivo: Archivo; progreso: ProgresoFlujo; /** Último avance real reportado por el flujo. */ real?: number }
  | { fase: "error"; archivo: Archivo; etapa: EtapaFlujo; mensaje: string; reanudar: Reanudar }
  | { fase: "listo"; archivo: Archivo; resultado: ResultadoFlujo };

/** Chip "Se creará la sucursal X · cambiar" que no bloquea el flujo. */
type Chip = {
  destino: Exclude<DestinoResuelto, { tipo: "csv" }>;
  sucursales: SucursalBreve[];
  valor: string;
  editando: boolean;
  /** `true` cuando la ventana para cambiar ya cerró. */
  fijo: boolean;
};

function esCsv(file: File): boolean {
  return /\.csv$/i.test(file.name) || file.type === "text/csv" || file.type === "application/vnd.ms-excel";
}

function mensajeSimple(e: unknown, porDefecto: string): string {
  const m = e instanceof Error ? e.message.trim() : "";
  return m || porDefecto;
}

export function ImportarYProgramar({
  compacto = false,
  onListo,
  className,
}: {
  compacto?: boolean;
  onListo?: () => void;
  className?: string;
}) {
  const router = useRouter();
  const datos = usePanel();
  const conectado = hasSupabaseEnv();
  const [estado, setEstado] = useState<Estado>({ fase: "vacio" });
  const [chip, setChip] = useState<Chip | null>(null);
  // Tope de horas con el que se programa: se elige antes de soltar el archivo
  // y queda guardado en la empresa (Configuración lo muestra igual).
  const [tope, setTope] = useState<number>(() => datos.empresa?.topeObjetivo ?? TOPE_POR_DEFECTO);
  const [avisoTope, setAvisoTope] = useState<string | null>(null);
  const elegirTope = (v: number) => {
    setTope(v);
    setAvisoTope(null);
    const empresaId = datos.empresa?.id;
    if (!conectado || !empresaId) return;
    void createClient()
      .from("empresas")
      .update({ tope_objetivo: v })
      .eq("id", empresaId)
      .then(({ error }) => {
        if (error && vivo.current) setAvisoTope("No se pudo guardar el tope en tu empresa; se usará sólo en esta carga.");
      });
  };
  const vivo = useRef(true);
  const espera = useRef<{ resolver: (d: DestinoResuelto) => void; timer: ReturnType<typeof setTimeout> } | null>(null);

  useEffect(() => {
    vivo.current = true;
    return () => {
      vivo.current = false;
      if (espera.current) clearTimeout(espera.current.timer);
    };
  }, []);

  // Cuenta recién creada: el servidor pudo renderizar antes de que la sesión o
  // la empresa del registro estuvieran disponibles. En vez de avisar de
  // inmediato, se vuelve a consultar unas veces y se recarga el panel en
  // cuanto aparece la empresa; sólo si no aparece se muestra el aviso.
  const [buscandoEmpresa, setBuscandoEmpresa] = useState(conectado && !datos.empresa);
  useEffect(() => {
    if (!conectado || datos.empresa) return;
    let cancelado = false;
    let intentos = 0;
    const intentar = async () => {
      try {
        const ctx = await leerContextoImportacion(createClient());
        if (cancelado) return;
        if (ctx.empresa) {
          router.refresh();
          return;
        }
      } catch {
        // se reintenta abajo
      }
      if (cancelado) return;
      intentos += 1;
      if (intentos < 5) {
        setTimeout(() => void intentar(), 1500);
      } else {
        setBuscandoEmpresa(false);
      }
    };
    void intentar();
    return () => {
      cancelado = true;
    };
  }, [conectado, datos.empresa, router]);

  // La barra avanza suavemente mientras un paso largo no reporta progreso,
  // pero nunca más de unos puntos por delante del último avance real: con
  // 200 semanas por programar, el avance real es lento y la barra no debe
  // llegar al final antes que el trabajo.
  useEffect(() => {
    if (estado.fase !== "corriendo") return;
    const id = setInterval(() => {
      setEstado((s) => {
        if (s.fase !== "corriendo" || s.progreso.etapa === "listo") return s;
        const techo = Math.min(TRAMOS[s.progreso.etapa][1] - 1, (s.real ?? s.progreso.pct) + ADELANTO_MAX);
        if (s.progreso.pct >= techo) return s;
        return { ...s, progreso: { ...s.progreso, pct: s.progreso.pct + 1 } };
      });
    }, 700);
    return () => clearInterval(id);
  }, [estado.fase]);

  // Mientras corre, salir de la página cortaría la carga a la mitad: el
  // navegador pregunta antes (una carga cortada se retoma soltando el mismo
  // archivo, pero mejor no cortarla).
  useEffect(() => {
    if (estado.fase !== "corriendo") return;
    const avisar = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Chrome y Safari todavía exigen `returnValue` para mostrar el aviso.
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", avisar);
    return () => window.removeEventListener("beforeunload", avisar);
  }, [estado.fase]);

  const avanzar = (progreso: ProgresoFlujo) => {
    if (!vivo.current) return;
    setEstado((s) => {
      if (s.fase !== "corriendo") return s;
      // La barra nunca retrocede dentro de una misma etapa (el avance suave pudo adelantarse).
      const pct = s.progreso.etapa === progreso.etapa ? Math.max(s.progreso.pct, progreso.pct) : progreso.pct;
      return { ...s, progreso: { ...progreso, pct }, real: progreso.pct };
    });
  };

  /* ---------- 1. Leer el archivo ---------- */

  async function cargarArchivo(file: File | undefined) {
    if (!file) return;
    if (!esCsv(file)) {
      setEstado({
        fase: "error",
        archivo: { nombre: file.name, parseo: { filas: [], errores: [], totales: 0, columnaSucursal: false }, resumen: resumirTurnos([]) },
        etapa: "leyendo",
        mensaje: "Ese archivo no es un CSV. Guarda tu hoja como .csv y vuelve a intentarlo.",
        reanudar: { contexto: null, destino: null, resultados: null, programaciones: [] },
      });
      return;
    }
    let archivo: Archivo;
    try {
      const texto = await file.text();
      const parseo = parsearTurnos(texto);
      archivo = { nombre: file.name, parseo, resumen: resumirTurnos(parseo.filas) };
    } catch {
      setEstado({
        fase: "error",
        archivo: { nombre: file.name, parseo: { filas: [], errores: [], totales: 0, columnaSucursal: false }, resumen: resumirTurnos([]) },
        etapa: "leyendo",
        mensaje: "No pudimos leer el archivo. Revisa que sea un CSV en UTF-8.",
        reanudar: { contexto: null, destino: null, resultados: null, programaciones: [] },
      });
      return;
    }
    if (!vivo.current) return;
    if (archivo.parseo.errores.length > 0 || archivo.parseo.filas.length === 0) {
      setEstado({ fase: "revisar", archivo });
      return;
    }
    if (!conectado) {
      setEstado({ fase: "demo", archivo });
      return;
    }
    void correr(archivo, { contexto: null, destino: null, resultados: null, programaciones: [] });
  }

  function reiniciar() {
    if (espera.current) clearTimeout(espera.current.timer);
    espera.current = null;
    setChip(null);
    setEstado({ fase: "vacio" });
  }

  /* ---------- 2. Destino (chip no bloqueante) ---------- */

  function confirmarDestino(propuesta: Exclude<DestinoResuelto, { tipo: "csv" }>, sucursales: SucursalBreve[]): Promise<DestinoResuelto> {
    return new Promise((resolver) => {
      const timer = setTimeout(() => {
        espera.current = null;
        setChip((c) => (c ? { ...c, fijo: true, editando: false } : c));
        resolver(propuesta);
      }, ESPERA_DESTINO_MS);
      espera.current = { resolver, timer };
      setChip({
        destino: propuesta,
        sucursales,
        valor: propuesta.tipo === "crear" ? propuesta.nombre : propuesta.sucursal.id,
        editando: false,
        fijo: false,
      });
    });
  }

  function chipCambiar() {
    if (!espera.current) return;
    clearTimeout(espera.current.timer);
    setChip((c) => (c ? { ...c, editando: true } : c));
  }

  function chipConfirmar() {
    const e = espera.current;
    if (!e || !chip) return;
    let destino: DestinoResuelto;
    if (chip.destino.tipo === "crear") {
      destino = { tipo: "crear", nombre: chip.valor.trim() || chip.destino.nombre };
    } else {
      const sucursal = chip.sucursales.find((s) => s.id === chip.valor) ?? chip.destino.sucursal;
      destino = { tipo: "existente", sucursal, elegible: true };
    }
    espera.current = null;
    setChip((c) => (c ? { ...c, destino: destino as Chip["destino"], editando: false, fijo: true } : c));
    e.resolver(destino);
  }

  /* ---------- 3–5. Importar, programar, abrir el panel ---------- */

  async function correr(archivo: Archivo, previo: Reanudar) {
    const supabase = createClient();
    const fallar = (etapa: EtapaFlujo, e: unknown, porDefecto: string, reanudar: Reanudar) => {
      if (!vivo.current) return;
      setEstado({ fase: "error", archivo, etapa, mensaje: mensajeSimple(e, porDefecto), reanudar });
    };

    let contexto = previo.contexto;
    let destino = previo.destino;
    if (!contexto || !destino) {
      setEstado({ fase: "corriendo", archivo, progreso: { etapa: "destino", pct: TRAMOS.destino[0], etiqueta: "Revisando tu empresa" } });
      try {
        contexto = await leerContextoImportacion(supabase);
        if (!contexto.empresa) {
          throw new Error("Tu cuenta aún no está ligada a una empresa. Pide a quien administra la cuenta que te agregue.");
        }
        const propuesta = proponerDestino(archivo.parseo, archivo.resumen, contexto, datos.sucursal?.id);
        if (!vivo.current) return;
        if (propuesta.tipo === "csv") {
          destino = propuesta;
        } else {
          avanzar({
            etapa: "destino",
            pct: TRAMOS.destino[1] - 1,
            etiqueta: propuesta.tipo === "crear" ? `Creando la sucursal ${propuesta.nombre}` : `Guardando en ${propuesta.sucursal.nombre}`,
          });
          destino = await confirmarDestino(propuesta, contexto.sucursales);
        }
      } catch (e) {
        fallar("destino", e, "No pudimos preparar la importación.", { contexto: null, destino: null, resultados: null, programaciones: [] });
        return;
      }
    } else {
      // Reintento: la sucursal ya quedó decidida (y, si hubo importación, creada).
      if (previo.resultados) setChip(null);
      const etapa: EtapaFlujo = previo.resultados ? "programando" : "importando";
      setEstado({ fase: "corriendo", archivo, progreso: { etapa, pct: TRAMOS[etapa][0], etiqueta: "Retomando" } });
    }
    if (!vivo.current) return;

    try {
      const resultado = await importarYProgramarTurnos({
        supabase,
        nombreArchivo: archivo.nombre,
        parseo: archivo.parseo,
        resumen: archivo.resumen,
        destino,
        empresa: contexto.empresa ? { ...contexto.empresa, topeObjetivo: tope } : null,
        resultados: previo.resultados,
        programaciones: previo.programaciones,
        // Sólo la primera semana ahora; el resto lo programa la cola del panel.
        enSegundoPlano: true,
        onProgreso: avanzar,
      });
      // El panel abre en la sucursal y semana programadas (mismas cookies que los selectores del shell).
      document.cookie = `${COOKIE_SUCURSAL}=${encodeURIComponent(resultado.sucursalId)}; path=/; max-age=31536000; samesite=lax`;
      if (resultado.semanaIso) {
        document.cookie = `${COOKIE_SEMANA}=${encodeURIComponent(resultado.semanaIso)}; path=/; max-age=31536000; samesite=lax`;
      }
      if (resultado.pendientes.length > 0) iniciarCola(supabase, resultado.pendientes, { tope });
      if (!vivo.current) return;
      setEstado({ fase: "listo", archivo, resultado });
      onListo?.();
      startTransition(() => router.refresh());
    } catch (e) {
      if (e instanceof ErrorFlujo) {
        if (e.resultados) {
          document.cookie = `${COOKIE_SUCURSAL}=${encodeURIComponent(e.resultados[0].sucursal.id)}; path=/; max-age=31536000; samesite=lax`;
        }
        fallar(
          e.etapa,
          e,
          e.etapa === "importando" ? "No pudimos guardar los turnos." : "No pudimos generar la propuesta.",
          { contexto, destino, resultados: e.resultados, programaciones: e.programaciones },
        );
      } else {
        fallar("importando", e, "Algo falló al importar.", { contexto, destino, resultados: null, programaciones: [] });
      }
    }
  }

  function reintentar() {
    if (estado.fase !== "error") return;
    if (estado.etapa === "leyendo") {
      reiniciar();
      return;
    }
    void correr(estado.archivo, estado.reanudar);
  }

  /* ---------- Render ---------- */

  const ocupado = estado.fase === "corriendo";

  return (
    <section
      className={cn("rounded-xl border border-border bg-card shadow-lg shadow-black/5", compacto ? "p-3" : "p-4 md:p-5", className)}
      aria-busy={ocupado || undefined}
    >
      {estado.fase === "vacio" &&
        (conectado && !datos.empresa ? (
          buscandoEmpresa ? (
            <p className="flex items-center gap-2 py-6 text-[13px] text-muted-foreground" role="status" aria-live="polite">
              <LogoCargando size={18} label="" className="text-foreground" />
              Preparando tu cuenta…
            </p>
          ) : (
            <Aviso tono="rosa">
              Tu cuenta aún no está ligada a una empresa, así que no podemos guardar tu semana.{" "}
              <button type="button" onClick={() => router.refresh()} className="underline underline-offset-2">
                Volver a intentar
              </button>{" "}
              o pide a quien administra la cuenta que te agregue.
            </Aviso>
          )
        ) : (
          <div className="flex flex-col gap-3">
            <SelectorTope valor={tope} onChange={elegirTope} compacto={compacto} aviso={avisoTope} />
            <ZonaCsv compacto={compacto} onArchivo={(f) => void cargarArchivo(f)} />
          </div>
        ))}

      {estado.fase !== "vacio" && (
        <div className="flex flex-col gap-3">
          <Encabezado archivo={estado.archivo} />

          {estado.fase === "revisar" && (
            <Revisar
              archivo={estado.archivo}
              conectado={conectado}
              onContinuar={() => {
                if (!conectado) {
                  setEstado({ fase: "demo", archivo: estado.archivo });
                  return;
                }
                void correr(estado.archivo, { contexto: null, destino: null, resultados: null, programaciones: [] });
              }}
              onOtro={reiniciar}
            />
          )}

          {estado.fase === "demo" && (
            <>
              <Aviso tono="ambar">
                Modo demo: el archivo se validó en tu navegador ({fraseTurnos(estado.archivo.resumen.turnos, estado.archivo.resumen.colaboradores)}),
                pero sin Supabase no se guarda.
              </Aviso>
              <Acciones onOtro={reiniciar} />
            </>
          )}

          {estado.fase === "corriendo" && (
            <>
              <ProgresoNarrativo pct={estado.progreso.pct} etiqueta={estado.progreso.etiqueta} />
              {chip && <ChipDestino chip={chip} onCambiar={chipCambiar} onValor={(v) => setChip((c) => (c ? { ...c, valor: v } : c))} onConfirmar={chipConfirmar} />}
            </>
          )}

          {estado.fase === "error" && (
            <>
              <Aviso tono="rosa" icono>
                <span className="font-medium">
                  {estado.etapa === "programando"
                    ? "Tus turnos ya quedaron guardados, pero no pudimos generar la propuesta."
                    : estado.etapa === "importando"
                      ? "No pudimos guardar los turnos."
                      : estado.etapa === "destino"
                        ? "No pudimos preparar la importación."
                        : "No pudimos leer el archivo."}
                </span>{" "}
                <span className="text-rose-200/80">{estado.mensaje}</span>
              </Aviso>
              <Acciones onOtro={reiniciar}>
                <Button type="button" size="sm" variant="outline" onClick={reintentar} className="text-[13px] font-medium">
                  <RotateCcw className="mr-2 size-4" aria-hidden="true" />
                  Reintentar
                </Button>
              </Acciones>
            </>
          )}

          {estado.fase === "listo" && (
            <>
              <ProgresoNarrativo pct={100} etiqueta="Listo: tu antes y después" hecho />
              <ResumenListo resultado={estado.resultado} />
            </>
          )}
        </div>
      )}
    </section>
  );
}

/* ---------- Tope de horas ---------- */

/**
 * Chips con los topes de la transición de la reforma. Se elige antes de
 * soltar el archivo; la propuesta se calcula con ese tope.
 */
function SelectorTope({
  valor,
  onChange,
  compacto,
  aviso,
}: {
  valor: number;
  onChange: (v: number) => void;
  compacto: boolean;
  aviso: string | null;
}) {
  const opciones: number[] = TOPES_REFORMA.includes(valor as (typeof TOPES_REFORMA)[number]) ? [...TOPES_REFORMA] : [...TOPES_REFORMA, valor];
  return (
    <div className={cn("flex flex-col gap-1.5", compacto ? "" : "sm:flex-row sm:items-center sm:justify-between")}>
      <div>
        <p className={cn("font-medium", compacto ? "text-[13px]" : "text-sm")}>Tope de horas por semana</p>
        {!compacto && <p className="j40-muted">La propuesta reparte las horas sin que nadie pase de este tope.</p>}
      </div>
      <div role="radiogroup" aria-label="Tope de horas por semana" className="flex flex-wrap items-center gap-1.5">
        {opciones.map((v) => {
          const activo = v === valor;
          return (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={activo}
              onClick={() => onChange(v)}
              className={cn(
                "rounded-full border px-3 py-1 text-[13px] font-medium tabular-nums transition-colors",
                activo
                  ? "border-amber-400 bg-amber-400/15 text-foreground"
                  : "border-border text-muted-foreground hover:border-amber-400/60 hover:text-foreground",
              )}
            >
              {fmtN.format(v)} h
            </button>
          );
        })}
      </div>
      {aviso && <p className="text-xs text-rose-300 sm:basis-full">{aviso}</p>}
    </div>
  );
}

/* ---------- Zona de arrastre ---------- */

export function ZonaCsv({
  compacto = false,
  onArchivo,
  className,
}: {
  compacto?: boolean;
  onArchivo: (file: File) => void;
  className?: string;
}) {
  const inputId = useId();
  const [arrastrando, setArrastrando] = useState(false);
  return (
    <label
      htmlFor={inputId}
      onDragOver={(e) => {
        e.preventDefault();
        setArrastrando(true);
      }}
      onDragLeave={() => setArrastrando(false)}
      onDrop={(e) => {
        e.preventDefault();
        setArrastrando(false);
        const f = e.dataTransfer.files?.[0];
        if (f) onArchivo(f);
      }}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed text-center transition-colors focus-within:ring-2 focus-within:ring-ring",
        compacto ? "px-4 py-6" : "px-6 py-12 md:py-16",
        arrastrando
          ? "border-amber-400 bg-amber-400/[0.08] text-foreground"
          : "border-border text-muted-foreground hover:border-amber-400/70 hover:bg-amber-400/[0.03] hover:text-foreground",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "flex items-center justify-center rounded-full bg-amber-400/10 text-amber-400",
          compacto ? "size-9" : "size-14",
        )}
      >
        <Upload className={compacto ? "size-4" : "size-6"} strokeWidth={1.5} />
      </span>
      <span className={cn("font-semibold text-foreground", compacto ? "text-[13px]" : "text-base md:text-lg")}>
        Arrastra aquí el CSV de la semana
      </span>
      <span className={cn("text-muted-foreground", compacto ? "text-[11px]" : "text-[13px]")}>
        o haz clic para elegirlo · una fila por turno
      </span>
      <input
        id={inputId}
        type="file"
        accept=".csv,text/csv"
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) onArchivo(f);
        }}
      />
    </label>
  );
}

/* ---------- Progreso narrativo (una barra, frases humanas) ---------- */

export function ProgresoNarrativo({
  pct,
  etiqueta,
  hecho = false,
  className,
}: {
  pct: number;
  etiqueta: string;
  hecho?: boolean;
  className?: string;
}) {
  const valor = Math.max(0, Math.min(100, Math.round(pct)));
  return (
    <div className={cn("flex flex-col gap-2", className)} role="status" aria-live="polite">
      <p className="flex items-center gap-2 text-[13px] font-medium">
        {hecho ? (
          <CircleCheck className="size-4 shrink-0 text-emerald-400" aria-hidden="true" />
        ) : (
          <LogoCargando size={18} label="" className="text-muted-foreground" />
        )}
        <span className="min-w-0 flex-1 truncate">{etiqueta}</span>
        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{valor} %</span>
      </p>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={valor}
        aria-label={etiqueta}
        className="h-2 w-full overflow-hidden rounded-full bg-muted"
      >
        <div
          className={cn("h-full rounded-full transition-[width] duration-500 ease-out", hecho ? "bg-emerald-400" : "bg-amber-400")}
          style={{ width: `${valor}%` }}
        />
      </div>
    </div>
  );
}

/* ---------- Piezas ---------- */

function Encabezado({ archivo }: { archivo: Archivo }) {
  const { resumen } = archivo;
  const semanas = resumen.semanas;
  return (
    <p className="flex min-w-0 items-center gap-2 text-[13px]">
      <FileText className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.5} aria-hidden="true" />
      <span className="min-w-0 truncate font-medium" title={archivo.nombre}>
        {archivo.nombre}
      </span>
      {resumen.turnos > 0 && (
        <span className="hidden shrink-0 text-muted-foreground sm:inline">
          · {fraseTurnos(resumen.turnos, resumen.colaboradores)}
          {semanas.length === 1 && <> · semana {numeroSemanaIso(semanas[0])}</>}
          {semanas.length > 1 && <> · {semanas.length} semanas</>}
        </span>
      )}
    </p>
  );
}

function Aviso({ tono, icono = true, children }: { tono: "rosa" | "ambar"; icono?: boolean; children: ReactNode }) {
  return (
    <p
      role={tono === "rosa" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-2 rounded-md border px-3 py-2.5 text-[13px] leading-relaxed",
        tono === "rosa" ? "border-rose-500/30 bg-rose-500/10 text-rose-100" : "border-amber-400/30 bg-amber-400/[0.06] text-foreground",
      )}
    >
      {icono && (
        <TriangleAlert
          className={cn("mt-0.5 size-4 shrink-0", tono === "rosa" ? "text-rose-300" : "text-amber-400")}
          strokeWidth={1.5}
          aria-hidden="true"
        />
      )}
      <span className="min-w-0">{children}</span>
    </p>
  );
}

function Acciones({ onOtro, children }: { onOtro: () => void; children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {children}
      <Button type="button" size="sm" variant={children ? "ghost" : "outline"} onClick={onOtro} className="text-[13px] font-medium">
        <Upload className="mr-2 size-4" strokeWidth={1.5} aria-hidden="true" />
        Subir otro archivo
      </Button>
    </div>
  );
}

function Revisar({
  archivo,
  conectado,
  onContinuar,
  onOtro,
}: {
  archivo: Archivo;
  conectado: boolean;
  onContinuar: () => void;
  onOtro: () => void;
}) {
  const { parseo } = archivo;
  const validas = parseo.filas.length;
  const errores = parseo.errores;
  return (
    <>
      <div className="rounded-md border border-rose-500/30 bg-rose-500/5">
        <p className="px-3 pt-2.5 text-[13px] font-medium text-rose-200">
          {validas === 0
            ? errores.length === 0
              ? "El archivo no trae turnos."
              : "Ninguna fila se pudo leer. Corrige el archivo y vuelve a subirlo."
            : `${fmtN.format(errores.length)} ${errores.length === 1 ? "fila tiene" : "filas tienen"} un error y no se ${errores.length === 1 ? "guardará" : "guardarán"}.`}
        </p>
        {errores.length > 0 && <ListaErrores errores={errores} />}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {validas > 0 && (
          <Button
            type="button"
            size="sm"
            onClick={onContinuar}
            className="bg-yellow-400 text-[13px] font-semibold text-neutral-950 hover:bg-yellow-300"
          >
            {conectado ? `Continuar con las ${fmtN.format(validas)} filas válidas` : "Continuar (demo)"}
          </Button>
        )}
        <Button type="button" size="sm" variant={validas > 0 ? "ghost" : "outline"} onClick={onOtro} className="text-[13px] font-medium">
          <Upload className="mr-2 size-4" strokeWidth={1.5} aria-hidden="true" />
          Subir otro archivo
        </Button>
      </div>
    </>
  );
}

function ListaErrores({ errores }: { errores: ErrorFila[] }) {
  const visibles = errores.slice(0, MAX_ERRORES_VISIBLES);
  const resto = errores.length - visibles.length;
  return (
    <>
      <ul className="divide-y divide-border/60 px-3 py-1 text-xs">
        {visibles.map((e, i) => (
          <li key={`${e.fila}-${e.columna}-${i}`} className="flex gap-2 py-1.5">
            <span className="shrink-0 tabular-nums text-muted-foreground">Fila {e.fila}</span>
            <span className="shrink-0 font-mono text-[11px] text-amber-400">{e.columna}</span>
            <span className="min-w-0 text-foreground/90">{e.mensaje}</span>
          </li>
        ))}
      </ul>
      {resto > 0 && <p className="px-3 pb-2 text-[11px] text-muted-foreground">y {fmtN.format(resto)} más</p>}
    </>
  );
}

function ChipDestino({
  chip,
  onCambiar,
  onValor,
  onConfirmar,
}: {
  chip: Chip;
  onCambiar: () => void;
  onValor: (v: string) => void;
  onConfirmar: () => void;
}) {
  const inputId = useId();
  const nombre = chip.destino.tipo === "crear" ? chip.destino.nombre : chip.destino.sucursal.nombre;
  const texto = chip.destino.tipo === "crear" ? "Se creará la sucursal" : "Se guardará en";

  if (chip.editando) {
    return (
      <form
        className="flex flex-wrap items-center gap-2 rounded-md border border-amber-400/30 bg-amber-400/[0.06] px-3 py-2 text-xs"
        onSubmit={(e) => {
          e.preventDefault();
          onConfirmar();
        }}
      >
        <label htmlFor={inputId} className="font-medium">
          {chip.destino.tipo === "crear" ? "Nombre de la sucursal" : "Sucursal"}
        </label>
        {chip.destino.tipo === "crear" ? (
          <input
            id={inputId}
            autoFocus
            value={chip.valor}
            onChange={(e) => onValor(e.target.value)}
            className="h-8 min-w-40 flex-1 rounded-md border border-input bg-background px-2.5 text-[13px] text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            autoComplete="off"
          />
        ) : (
          <select
            id={inputId}
            autoFocus
            value={chip.valor}
            onChange={(e) => onValor(e.target.value)}
            className="h-8 min-w-40 flex-1 rounded-md border border-input bg-background px-2 text-[13px] text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          >
            {chip.sucursales.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre}
              </option>
            ))}
          </select>
        )}
        <Button type="submit" size="sm" className="h-8 bg-yellow-400 text-[13px] font-semibold text-neutral-950 hover:bg-yellow-300">
          Continuar
        </Button>
      </form>
    );
  }

  return (
    <p className="inline-flex flex-wrap items-center gap-x-1.5 self-start rounded-full border border-amber-400/30 bg-amber-400/[0.06] px-3 py-1 text-xs">
      <span className="text-muted-foreground">{texto}</span>
      <span className="font-semibold text-foreground">{nombre}</span>
      {!chip.fijo && (
        <>
          <span aria-hidden="true" className="text-muted-foreground">
            ·
          </span>
          <button type="button" onClick={onCambiar} className="font-medium text-amber-400 underline-offset-2 hover:underline">
            cambiar
          </button>
        </>
      )}
    </p>
  );
}

function ResumenListo({ resultado }: { resultado: ResultadoFlujo }) {
  const turnos = resultado.resultados.reduce((n, r) => n + r.horarios, 0);
  const personas = resultado.resultados.reduce((n, r) => n + r.empleados, 0);
  const sucursales = [...new Set(resultado.resultados.map((r) => r.sucursal.nombre))];
  const yaCargadas = resultado.resultados.filter((r) => r.omitida).length;
  const semanas = [...new Set(resultado.resultados.flatMap((r) => r.semanas))].sort();
  const ahorro = resultado.programaciones.reduce((n, p) => n + p.resultado.ahorroMxn, 0);
  const base = resultado.programaciones.reduce((n, p) => n + p.resultado.costoBaseline, 0);
  const pct = base > 0 ? (ahorro / base) * 100 : 0;
  return (
    <p className="text-[13px] leading-relaxed text-muted-foreground">
      <span className="text-foreground">{fraseTurnos(turnos, personas)}</span> en{" "}
      {sucursales.length > 3 ? `${fmtN.format(sucursales.length)} sucursales` : sucursales.join(", ")}
      {semanas.length === 1 && <> · {etiquetaSemana(semanas[0])}</>}
      {semanas.length > 1 && <> · {semanas.length} semanas</>}
      {yaCargadas > 0 && (
        <>
          {" "}
          · {yaCargadas === sucursales.length ? "ya estaban guardadas" : `${fmtN.format(yaCargadas)} ya estaban guardadas`}
        </>
      )}
      {resultado.omitidas > 0 && <> · {fmtN.format(resultado.omitidas)} {resultado.omitidas === 1 ? "semana ya tenía propuesta" : "semanas ya tenían propuesta"}</>}
      {resultado.pendientes.length > 0 && (
        <>
          {" "}
          · {fmtN.format(resultado.pendientes.length)} {resultado.pendientes.length === 1 ? "semana se programa" : "semanas se programan"} mientras navegas
        </>
      )}
      {resultado.programaciones.length > 0 && (
        <>
          {" "}
          · ahorro estimado{" "}
          <span className={cn("font-semibold tabular-nums", ahorro >= 0 ? "text-emerald-400" : "text-rose-300")}>
            {fmtMXN.format(ahorro)}
          </span>{" "}
          <span className="tabular-nums">({fmtPct.format(pct)} %)</span>
        </>
      )}
      . {resultado.pendientes.length > 0 ? "Abriendo tu panel…" : "Abriendo tu antes y después…"}
    </p>
  );
}
