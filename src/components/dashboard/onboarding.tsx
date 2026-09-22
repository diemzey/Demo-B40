"use client";

import { Download } from "lucide-react";
import { ProfileMenu, UserChip } from "@/components/auth/profile-menu";
import { ImportarYProgramar } from "@/components/dashboard/importar-y-programar";
import { JornadaLogo } from "@/components/ui/jornada-logo";
import { usePanel } from "@/lib/datos/panel-context";

/**
 * Primer paso de una cuenta real sin datos: una sola acción, soltar el CSV.
 * `ImportarYProgramar` lee el archivo, guarda los turnos, corre el motor y
 * refresca la ruta; el layout deja de estar en `sinDatos` y abre el
 * Diagnóstico con el antes/después. El formato del archivo vive colapsado.
 */

const PLANTILLA_EJEMPLO = "/plantillas/ejemplo-tienda-semana.csv";
const PLANTILLA_MINIMA = "/plantillas/turnos-ejemplo.csv";

type Columna = { nombre: string; obligatoria: boolean; ejemplo: string; descripcion: string };

const COLUMNAS: Columna[] = [
  { nombre: "clave", obligatoria: true, ejemplo: "EMP-001", descripcion: "Id del colaborador en tu nómina. Único por sucursal." },
  { nombre: "nombre", obligatoria: true, ejemplo: "Bruno", descripcion: "Nombre(s)." },
  { nombre: "apellido", obligatoria: true, ejemplo: "Ortega", descripcion: "Apellido(s)." },
  { nombre: "puesto", obligatoria: false, ejemplo: "Vendedor", descripcion: "Puesto; puede ir vacío." },
  { nombre: "jornada_contratada", obligatoria: false, ejemplo: "48", descripcion: "Horas semanales pactadas (p. ej. 48 o 24.5)." },
  { nombre: "sucursal", obligatoria: false, ejemplo: "Celaya", descripcion: "Sucursal del turno; se crea si no existe. Si falta, usamos la de tu empresa." },
  { nombre: "fecha", obligatoria: true, ejemplo: "2026-07-27", descripcion: "Día en que inicia el turno, YYYY-MM-DD." },
  { nombre: "hora_inicio", obligatoria: true, ejemplo: "09:00", descripcion: "Inicio del turno, HH:MM en 24 h." },
  { nombre: "hora_fin", obligatoria: true, ejemplo: "18:00", descripcion: "Fin del turno, HH:MM. Si es menor o igual que hora_inicio, cruza medianoche." },
  { nombre: "minutos_descanso", obligatoria: false, ejemplo: "60", descripcion: "Minutos de descanso a descontar; vacío cuenta como 0." },
];

const EJEMPLO = [
  "clave,nombre,apellido,puesto,jornada_contratada,sucursal,fecha,hora_inicio,hora_fin,minutos_descanso",
  "EMP-001,Bruno,Ortega,Encargado de piso,48,Celaya,2026-07-27,09:00,18:00,60",
  "EMP-003,Diego,Quintero,Vendedor,48,Celaya,2026-07-27,08:00,13:00,0",
  "EMP-004,Rodrigo,Téllez,Vigilante,48,Celaya,2026-07-27,22:00,07:00,60",
].join("\n");

export function Onboarding() {
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

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-10 md:px-6 md:py-16">
        <div className="text-center">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-400">Primer paso</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">Sube la semana de tu sucursal</h1>
          <p className="mx-auto mt-3 max-w-xl text-pretty text-[13px] leading-relaxed text-muted-foreground">
            Suelta el CSV con los turnos de una semana y en segundos verás el antes y el después
            {datos.empresa ? <> de {datos.empresa.nombre}</> : null} a 40 h.
          </p>
        </div>

        <ImportarYProgramar />

        <details className="group rounded-lg border border-border/60 bg-card/50 text-[13px]">
          <summary className="cursor-pointer select-none px-4 py-3 font-medium text-muted-foreground transition-colors hover:text-foreground">
            ¿Cómo debe verse el CSV?
          </summary>
          <div className="border-t border-border/60">
            <p className="px-4 pt-3 text-xs text-muted-foreground">
              UTF-8, separado por comas, una fila por turno (un turno partido son dos filas). El orden de las columnas no
              importa.
            </p>
            <div className="overflow-x-auto px-4 pt-3">
              <table className="w-full min-w-[560px] text-xs">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                    <th className="h-8 pr-3 font-medium">Columna</th>
                    <th className="h-8 pr-3 font-medium">Ejemplo</th>
                    <th className="h-8 font-medium">Descripción</th>
                  </tr>
                </thead>
                <tbody>
                  {COLUMNAS.map((c) => (
                    <tr key={c.nombre} className="border-t border-border/60 align-top">
                      <td className="whitespace-nowrap py-2 pr-3 font-mono text-amber-400">
                        {c.nombre}
                        {!c.obligatoria && <span className="ml-1.5 font-sans text-[10px] text-muted-foreground">opcional</span>}
                      </td>
                      <td className="whitespace-nowrap py-2 pr-3 font-mono">{c.ejemplo}</td>
                      <td className="py-2 text-muted-foreground">{c.descripcion}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-4">
              <pre className="overflow-x-auto rounded-md border border-border/60 bg-background/60 px-3 py-2.5 font-mono text-[11px] leading-relaxed text-foreground/90">
                {EJEMPLO}
              </pre>
              <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
                <a
                  href={PLANTILLA_EJEMPLO}
                  download="ejemplo-tienda-semana.csv"
                  className="inline-flex items-center gap-1.5 font-medium text-amber-400 hover:underline"
                >
                  <Download className="size-3.5" strokeWidth={2} aria-hidden="true" />
                  Descargar ejemplo (una tienda, una semana)
                </a>
                <a href={PLANTILLA_MINIMA} download="turnos-ejemplo.csv" className="text-xs text-muted-foreground hover:text-foreground hover:underline">
                  Plantilla mínima
                </a>
              </p>
            </div>
          </div>
        </details>
      </main>
    </div>
  );
}
