"use client";

import { useRouter } from "next/navigation";
import { Download, FileSpreadsheet, TriangleAlert } from "lucide-react";
import { ProfileMenu, UserChip } from "@/components/auth/profile-menu";
import { ImportarCsv } from "@/components/dashboard/importar-csv";
import { Panel, PanelHeader, Pill, botonOutline, botonPrimario } from "@/components/dashboard/tabs/ui";
import { JornadaLogo } from "@/components/ui/jornada-logo";
import { usePanel } from "@/lib/datos/panel-context";

/**
 * Primer paso de una cuenta real sin datos: explica el CSV de turnos, ofrece
 * las plantillas y monta el importador. El layout del panel lo muestra en
 * lugar del shell mientras `datos.sinDatos` sea `true`; al terminar la
 * importación se refresca la ruta y aparece el panel normal.
 */

const PLANTILLA_MINIMA = "/plantillas/turnos-ejemplo.csv";
const PLANTILLA_COMPLETA = "/plantillas/ejemplo-tienda-semana.csv";

const PASOS = [
  { n: 1, titulo: "Descarga la plantilla", detalle: "Un CSV con el encabezado listo y turnos de ejemplo." },
  { n: 2, titulo: "Llénala con tus turnos", detalle: "Una fila por turno; un turno partido son dos filas." },
  { n: 3, titulo: "Súbela aquí", detalle: "Se valida en tu navegador antes de guardar nada." },
] as const;

type Columna = {
  nombre: string;
  obligatoria: boolean;
  ejemplo: string;
  descripcion: string;
};

const COLUMNAS: Columna[] = [
  { nombre: "clave", obligatoria: true, ejemplo: "EMP-001", descripcion: "Id del colaborador en tu nómina. Único por sucursal." },
  { nombre: "nombre", obligatoria: true, ejemplo: "Bruno", descripcion: "Nombre(s)." },
  { nombre: "apellido", obligatoria: true, ejemplo: "Ortega", descripcion: "Apellido(s)." },
  { nombre: "puesto", obligatoria: false, ejemplo: "Vendedor", descripcion: "Puesto; puede ir vacío." },
  { nombre: "jornada_contratada", obligatoria: false, ejemplo: "48", descripcion: "Horas semanales pactadas (p. ej. 48 o 24.5)." },
  {
    nombre: "sucursal",
    obligatoria: false,
    ejemplo: "Celaya",
    descripcion: "Sucursal del turno; se crea si no existe. Si la columna falta, se te pedirá el nombre.",
  },
  { nombre: "fecha", obligatoria: true, ejemplo: "2026-07-27", descripcion: "Día en que inicia el turno, YYYY-MM-DD." },
  { nombre: "hora_inicio", obligatoria: true, ejemplo: "09:00", descripcion: "Inicio del turno, HH:MM en 24 h." },
  {
    nombre: "hora_fin",
    obligatoria: true,
    ejemplo: "18:00",
    descripcion: "Fin del turno, HH:MM. Si es menor o igual que hora_inicio, el turno cruza medianoche.",
  },
  { nombre: "minutos_descanso", obligatoria: false, ejemplo: "60", descripcion: "Minutos de descanso a descontar; vacío cuenta como 0." },
];

const EJEMPLO = [
  "clave,nombre,apellido,puesto,jornada_contratada,sucursal,fecha,hora_inicio,hora_fin,minutos_descanso",
  "EMP-001,Bruno,Ortega,Encargado de piso,48,Celaya,2026-07-27,09:00,18:00,60",
  "EMP-003,Diego,Quintero,Vendedor,48,Celaya,2026-07-27,08:00,13:00,0",
  "EMP-004,Rodrigo,Téllez,Vigilante,48,Celaya,2026-07-27,22:00,07:00,60",
].join("\n");

export function Onboarding() {
  const router = useRouter();
  const datos = usePanel();

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border/50 bg-card px-4 md:px-6">
        <JornadaLogo size={28} animated={false} />
        <ProfileMenu align="end">
          <button
            type="button"
            className="rounded-lg px-2 py-1 text-left outline-none transition-colors hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Abrir menú de cuenta"
          >
            <UserChip />
          </button>
        </ProfileMenu>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8 md:px-6 md:py-12">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-400">Primer paso</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">
            Sube la semana de tu sucursal
          </h1>
          <p className="mt-3 max-w-2xl text-pretty text-[13px] leading-relaxed text-muted-foreground">
            Jornada40 no usa datos de ejemplo: el diagnóstico sale de tus turnos reales. Sube un CSV con
            una fila por turno y en segundos verás cuántas horas exceden el tope semanal
            {datos.empresa ? <> en {datos.empresa.nombre}</> : null}, quién queda fuera de norma y
            cuánto cuesta.
          </p>
        </div>

        {!datos.empresa && (
          <p
            role="status"
            className="flex items-start gap-2 rounded-md border border-amber-400/30 bg-amber-400/[0.06] px-3 py-2 text-xs"
          >
            <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-amber-400" strokeWidth={1.5} aria-hidden="true" />
            <span>
              Tu cuenta aún no está ligada a una empresa, así que no podrás guardar la importación. Pide a
              quien administra la cuenta que te agregue.
            </span>
          </p>
        )}

        <ol className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {PASOS.map((p) => (
            <li key={p.n} className="flex gap-3 rounded-lg border border-border bg-card px-3 py-3">
              <span
                aria-hidden="true"
                className="flex size-6 shrink-0 items-center justify-center rounded-full bg-yellow-400 text-[11px] font-semibold text-neutral-950"
              >
                {p.n}
              </span>
              <span className="min-w-0">
                <span className="block text-[13px] font-semibold">{p.titulo}</span>
                <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">{p.detalle}</span>
              </span>
            </li>
          ))}
        </ol>

        <Panel>
          <PanelHeader
            title="Cómo debe verse el CSV"
            description="UTF-8, separado por comas, con esta primera fila de encabezados (el orden de las columnas no importa)."
          />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-[13px]">
              <thead>
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="h-9 px-4 font-medium">Columna</th>
                  <th className="h-9 px-2.5 font-medium">Obligatoria</th>
                  <th className="h-9 px-2.5 font-medium">Ejemplo</th>
                  <th className="h-9 px-4 font-medium">Descripción</th>
                </tr>
              </thead>
              <tbody>
                {COLUMNAS.map((c) => (
                  <tr key={c.nombre} className="border-t border-border/60 align-top">
                    <td className="whitespace-nowrap px-4 py-2 font-mono text-xs text-amber-400">{c.nombre}</td>
                    <td className="px-2.5 py-2">
                      <Pill tone={c.obligatoria ? "amber" : "neutral"}>{c.obligatoria ? "Sí" : "No"}</Pill>
                    </td>
                    <td className="whitespace-nowrap px-2.5 py-2 font-mono text-xs">{c.ejemplo}</td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">{c.descripcion}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-border/60 p-4">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Ejemplo: encabezado y tres turnos
            </p>
            <pre className="overflow-x-auto rounded-md border border-border/60 bg-background/60 px-3 py-2.5 font-mono text-[11px] leading-relaxed text-foreground/90">
              {EJEMPLO}
            </pre>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <a href={PLANTILLA_MINIMA} download="turnos-ejemplo.csv" className={botonPrimario}>
                <Download className="size-3.5" strokeWidth={2} aria-hidden="true" />
                Plantilla mínima (12 filas)
              </a>
              <a href={PLANTILLA_COMPLETA} download="ejemplo-tienda-semana.csv" className={botonOutline}>
                <FileSpreadsheet className="size-3.5" strokeWidth={1.5} aria-hidden="true" />
                Ejemplo completo: una tienda, una semana (72 personas)
              </a>
            </div>
          </div>
        </Panel>

        <ImportarCsv onImportado={() => router.refresh()} />
      </main>
    </div>
  );
}
