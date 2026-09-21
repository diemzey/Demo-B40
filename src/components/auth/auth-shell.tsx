import type { ReactNode } from "react";

import { CalendarClock } from "lucide-react";

import { JornadaLogo } from "@/components/ui/jornada-logo";

export type AuthShellProps = {
  /** Titular grande del panel amarillo (solo escritorio). */
  headline: string;
  /** Frase corta de apoyo debajo del titular. */
  subline: string;
  children: ReactNode;
};

/**
 * Marco de dos columnas para las pantallas de acceso.
 *
 * Es un server component: no tiene estado ni handlers. El sitio no fija el
 * tema oscuro en el layout raíz (lo enciende el footer de la landing en el
 * cliente), así que el marco lleva la clase `dark` y `color-scheme: dark`
 * para que los tokens de shadcn y los controles nativos rendericen en oscuro
 * también en estas rutas, que no incluyen ese footer.
 */
export function AuthShell({ headline, subline, children }: AuthShellProps) {
  return (
    <div
      className="dark grid min-h-screen bg-background text-foreground lg:grid-cols-2"
      style={{ colorScheme: "dark" }}
    >
      {/* Panel de marca: solo en escritorio */}
      <aside className="hidden flex-col bg-yellow-400 p-10 text-neutral-950 lg:flex xl:p-14">
        {/* Sobre amarillo, el logo va monocromático en negro, con su intro. */}
        <JornadaLogo size={56} variant="mono" className="text-neutral-950" />

        <div className="my-auto max-w-md">
          <CalendarClock
            className="mb-6 size-12 xl:size-14"
            strokeWidth={1.5}
            aria-hidden="true"
          />
          <h2 className="text-balance text-4xl font-semibold leading-tight tracking-tight xl:text-5xl">
            {headline}
          </h2>
          <p className="mt-4 text-pretty text-lg leading-snug text-neutral-950/70">
            {subline}
          </p>
        </div>
      </aside>

      {/* Área de la tarjeta */}
      <main className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex justify-center lg:hidden">
            <JornadaLogo size={36} />
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
