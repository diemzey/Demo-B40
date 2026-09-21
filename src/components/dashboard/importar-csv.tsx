"use client";

import { useEffect, useId, useState, type ChangeEvent, type DragEvent } from "react";
import { CircleCheck, Download, FileText, Loader2, TriangleAlert, Upload, X } from "lucide-react";
import {
  Campo,
  Panel,
  PanelHeader,
  Pill,
  botonOutline,
  botonPrimario,
  inputClass,
} from "@/components/dashboard/tabs/ui";
import { createClient } from "@/lib/supabase/client";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import {
  etiquetaSemana,
  importarTurnos,
  numeroSemanaIso,
  parsearTurnos,
  resumirTurnos,
  type ErrorFila,
  type ResultadoImportacion,
  type ResultadoParseo,
  type ResumenTurnos,
} from "@/lib/importacion";

/**
 * "Subir semana (CSV)": zona de arrastre → parseo en el navegador → vista
 * previa → importación a Supabase. En modo demo (sin variables de entorno)
 * parsea y muestra la vista previa, pero no importa.
 */

const MAX_ERRORES_VISIBLES = 10;
const RUTA_PLANTILLA = "/plantillas/turnos-ejemplo.csv";

type Sucursal = { id: string; nombre: string };

type Archivo = {
  nombre: string;
  parseo: ResultadoParseo;
  resumen: ResumenTurnos;
};

type Estado =
  | { paso: "vacio" }
  | { paso: "listo"; archivo: Archivo }
  | { paso: "importando"; archivo: Archivo }
  | { paso: "hecho"; archivo: Archivo; resultado: ResultadoImportacion };

const fmtH = new Intl.NumberFormat("es-MX", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const fmtN = new Intl.NumberFormat("es-MX");

function esCsv(file: File): boolean {
  return /\.csv$/i.test(file.name) || file.type === "text/csv" || file.type === "application/vnd.ms-excel";
}

function etiquetaSemanas(semanas: string[]): string {
  if (semanas.length === 0) return "—";
  if (semanas.length === 1) return etiquetaSemana(semanas[0]);
  return semanas.map((s) => `S${numeroSemanaIso(s)}`).join(", ");
}

export function ImportarCsv({
  className,
  onImportado,
}: {
  className?: string;
  onImportado?: (resultado: ResultadoImportacion) => void;
}) {
  const conectado = hasSupabaseEnv();
  const inputId = useId();
  const [estado, setEstado] = useState<Estado>({ paso: "vacio" });
  const [arrastrando, setArrastrando] = useState(false);
  const [mensajeError, setMensajeError] = useState<string | null>(null);
  const [sucursales, setSucursales] = useState<Sucursal[] | null>(conectado ? null : []);
  const [sucursalId, setSucursalId] = useState("");

  // Sucursales de la empresa (RLS ya las filtra). Si hay una sola, se preselecciona.
  useEffect(() => {
    if (!conectado) return;
    let vivo = true;
    (async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("sucursales")
        .select("id, nombre, hubs!inner(empresa_id)")
        .order("nombre");
      if (!vivo) return;
      if (error) {
        setSucursales([]);
        setMensajeError(`No se pudieron cargar las sucursales (${error.message}).`);
        return;
      }
      const lista = (data ?? []).map((s) => ({ id: s.id, nombre: s.nombre }));
      setSucursales(lista);
      if (lista.length === 1) setSucursalId(lista[0].id);
    })();
    return () => {
      vivo = false;
    };
  }, [conectado]);

  async function cargarArchivo(file: File | undefined) {
    if (!file) return;
    setMensajeError(null);
    if (!esCsv(file)) {
      setMensajeError("Solo se aceptan archivos .csv.");
      return;
    }
    try {
      const texto = await file.text();
      const parseo = parsearTurnos(texto);
      const resumen = resumirTurnos(parseo.filas);
      setEstado({ paso: "listo", archivo: { nombre: file.name, parseo, resumen } });
    } catch {
      setMensajeError("No se pudo leer el archivo.");
    }
  }

  function onInput(e: ChangeEvent<HTMLInputElement>) {
    void cargarArchivo(e.target.files?.[0]);
    e.target.value = "";
  }

  function onDrop(e: DragEvent<HTMLElement>) {
    e.preventDefault();
    setArrastrando(false);
    void cargarArchivo(e.dataTransfer.files?.[0]);
  }

  function reiniciar() {
    setEstado({ paso: "vacio" });
    setMensajeError(null);
  }

  async function importar() {
    if (estado.paso !== "listo" || !conectado || !sucursalId) return;
    const { archivo } = estado;
    setMensajeError(null);
    setEstado({ paso: "importando", archivo });
    try {
      const resultado = await importarTurnos({
        supabase: createClient(),
        sucursalId,
        nombreArchivo: archivo.nombre,
        filas: archivo.parseo.filas,
        totales: archivo.parseo.totales,
        errores: archivo.parseo.errores,
      });
      setEstado({ paso: "hecho", archivo, resultado });
      onImportado?.(resultado);
    } catch (e) {
      setMensajeError(e instanceof Error ? e.message : "No se pudo importar el archivo.");
      setEstado({ paso: "listo", archivo });
    }
  }

  const enlacePlantilla = (
    <a
      href={RUTA_PLANTILLA}
      download="turnos-ejemplo.csv"
      className="inline-flex shrink-0 items-center gap-1.5 text-xs font-medium text-amber-400 hover:underline"
    >
      <Download className="size-3.5" strokeWidth={1.5} aria-hidden="true" />
      Descargar plantilla
    </a>
  );

  return (
    <Panel className={className}>
      <PanelHeader
        title="Subir semana (CSV)"
        description="Una fila por segmento de turno; un turno partido son dos filas."
        aside={enlacePlantilla}
      />

      <div className="flex flex-col gap-3 p-4 pt-2">
        {estado.paso === "vacio" && (
          <label
            htmlFor={inputId}
            onDragOver={(e) => {
              e.preventDefault();
              setArrastrando(true);
            }}
            onDragLeave={() => setArrastrando(false)}
            onDrop={onDrop}
            className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed px-4 py-6 text-center text-xs transition-colors ${
              arrastrando
                ? "border-amber-400 bg-amber-400/[0.06] text-foreground"
                : "border-border text-muted-foreground hover:border-amber-400/60 hover:text-foreground"
            }`}
          >
            <Upload className="size-5" strokeWidth={1.5} aria-hidden="true" />
            <span>Arrastra el CSV o elige un archivo</span>
            <span className="text-[11px] text-muted-foreground/80">
              Encabezado: clave, nombre, apellido, puesto, jornada_contratada, fecha, hora_inicio,
              hora_fin, minutos_descanso
            </span>
            <input
              id={inputId}
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              onChange={onInput}
            />
          </label>
        )}

        {(estado.paso === "listo" || estado.paso === "importando") && (
          <fieldset disabled={estado.paso === "importando"} className="flex flex-col gap-3">
            <VistaPrevia archivo={estado.archivo} onQuitar={reiniciar} />

            {conectado ? (
              <Campo label="Sucursal" htmlFor={`${inputId}-sucursal`}>
                <select
                  id={`${inputId}-sucursal`}
                  className={inputClass}
                  value={sucursalId}
                  onChange={(e) => setSucursalId(e.target.value)}
                >
                  <option value="" disabled>
                    {sucursales === null
                      ? "Cargando sucursales…"
                      : sucursales.length === 0
                        ? "No hay sucursales en tu empresa"
                        : "Elige una sucursal"}
                  </option>
                  {(sucursales ?? []).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nombre}
                    </option>
                  ))}
                </select>
              </Campo>
            ) : null}

            <div className="flex flex-col gap-2">
              <button
                type="button"
                className={botonPrimario}
                disabled={!conectado || !sucursalId || estado.archivo.parseo.filas.length === 0}
                onClick={importar}
              >
                {estado.paso === "importando" ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                    Importando…
                  </>
                ) : conectado ? (
                  `Importar ${fmtN.format(estado.archivo.parseo.filas.length)} turnos`
                ) : (
                  "Conecta Supabase para importar"
                )}
              </button>
              {!conectado && (
                <p className="text-[11px] text-muted-foreground">
                  Modo demo: el archivo se valida en tu navegador, pero no se guarda. Configura
                  NEXT_PUBLIC_SUPABASE_URL y la llave pública para importar.
                </p>
              )}
            </div>
          </fieldset>
        )}

        {estado.paso === "hecho" && (
          <Exito archivo={estado.archivo} resultado={estado.resultado} onReiniciar={reiniciar} />
        )}

        {mensajeError && (
          <p role="alert" className="flex items-start gap-2 rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
            <TriangleAlert className="mt-0.5 size-3.5 shrink-0" strokeWidth={1.5} aria-hidden="true" />
            <span>{mensajeError}</span>
          </p>
        )}
      </div>
    </Panel>
  );
}

/* ---------- Vista previa ---------- */

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="rounded-md border border-border/60 bg-background/40 px-3 py-2">
      <p className="text-[11px] text-muted-foreground">{etiqueta}</p>
      <p className="mt-0.5 text-[13px] font-semibold tabular-nums">{valor}</p>
    </div>
  );
}

function VistaPrevia({ archivo, onQuitar }: { archivo: Archivo; onQuitar: () => void }) {
  const { parseo, resumen } = archivo;
  const conErrores = parseo.errores.length > 0;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 text-[13px]">
        <FileText className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.5} aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate font-medium" title={archivo.nombre}>
          {archivo.nombre}
        </span>
        {conErrores ? (
          <Pill tone={parseo.filas.length === 0 ? "bad" : "warn"}>
            {fmtN.format(parseo.errores.length)} {parseo.errores.length === 1 ? "error" : "errores"}
          </Pill>
        ) : (
          <Pill tone="good">Sin errores</Pill>
        )}
        <button
          type="button"
          onClick={onQuitar}
          className="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          aria-label="Quitar archivo"
        >
          <X className="size-3.5" strokeWidth={1.5} aria-hidden="true" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Dato etiqueta="Colaboradores" valor={fmtN.format(resumen.colaboradores)} />
        <Dato etiqueta="Turnos" valor={`${fmtN.format(resumen.turnos)} de ${fmtN.format(parseo.totales)}`} />
        <Dato
          etiqueta={resumen.semanas.length > 1 ? "Semanas detectadas" : "Semana detectada"}
          valor={etiquetaSemanas(resumen.semanas)}
        />
        <Dato etiqueta="Horas totales" valor={`${fmtH.format(resumen.horasTotales)} h`} />
      </div>

      {conErrores && <ListaErrores errores={parseo.errores} />}
    </div>
  );
}

function ListaErrores({ errores }: { errores: ErrorFila[] }) {
  const visibles = errores.slice(0, MAX_ERRORES_VISIBLES);
  const resto = errores.length - visibles.length;
  return (
    <div className="rounded-md border border-destructive/30 bg-destructive/5">
      <p className="px-3 pt-2 text-[11px] font-semibold uppercase tracking-wider text-destructive">
        Filas con error (no se importan)
      </p>
      <ul className="divide-y divide-border/60 px-3 py-1 text-xs">
        {visibles.map((e, i) => (
          <li key={`${e.fila}-${e.columna}-${i}`} className="flex gap-2 py-1.5">
            <span className="shrink-0 tabular-nums text-muted-foreground">Fila {e.fila}</span>
            <span className="shrink-0 font-mono text-[11px] text-amber-400">{e.columna}</span>
            <span className="min-w-0 text-foreground/90">{e.mensaje}</span>
          </li>
        ))}
      </ul>
      {resto > 0 && (
        <p className="px-3 pb-2 text-[11px] text-muted-foreground">y {fmtN.format(resto)} más</p>
      )}
    </div>
  );
}

/* ---------- Resultado ---------- */

function Exito({
  archivo,
  resultado,
  onReiniciar,
}: {
  archivo: Archivo;
  resultado: ResultadoImportacion;
  onReiniciar: () => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5">
        <CircleCheck className="mt-0.5 size-4 shrink-0 text-emerald-400" strokeWidth={1.5} aria-hidden="true" />
        <div className="min-w-0 text-[13px]">
          <p className="font-semibold text-emerald-400">Importación completada</p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground" title={archivo.nombre}>
            {archivo.nombre}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Dato etiqueta="Colaboradores" valor={fmtN.format(resultado.empleados)} />
        <Dato etiqueta="Turnos guardados" valor={fmtN.format(resultado.horarios)} />
        <Dato
          etiqueta={resultado.semanas.length > 1 ? "Semanas" : "Semana"}
          valor={etiquetaSemanas(resultado.semanas)}
        />
        <Dato
          etiqueta="Filas con error"
          valor={resultado.filasError > 0 ? fmtN.format(resultado.filasError) : "Ninguna"}
        />
      </div>

      {resultado.filasError > 0 && (
        <p className="text-[11px] text-muted-foreground">
          Las filas con error quedaron registradas en la bitácora de la importación; corrígelas y vuelve
          a subir el archivo: los turnos ya guardados se actualizan, no se duplican.
        </p>
      )}

      <button type="button" className={botonOutline} onClick={onReiniciar}>
        <Upload className="size-3.5" strokeWidth={1.5} aria-hidden="true" />
        Importar otro archivo
      </button>
    </div>
  );
}
