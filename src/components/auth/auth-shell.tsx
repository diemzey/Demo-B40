import type { ReactNode } from "react";

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
      <aside className="hidden flex-col justify-between bg-yellow-400 p-10 text-neutral-950 lg:flex xl:p-14">
        {/* En amarillo, el "40" ámbar del logo no se lee: todas las letras heredan el negro. */}
        <JornadaLogo
          size={36}
          className="text-neutral-950 [&_text]:fill-current"
          animated={false}
        />

        <div className="max-w-md">
          <h2 className="text-balance text-4xl font-semibold leading-tight tracking-tight xl:text-5xl">
            {headline}
          </h2>
          <p className="mt-4 text-pretty text-lg leading-snug text-neutral-950/70">
            {subline}
          </p>
        </div>

        <p className="text-xs text-neutral-950/60">
          Cifras: sucursal sintética Coapa, 30 colaboradores. Ningún cliente
          real.
        </p>
      </aside>

      {/* Área de la tarjeta */}
      <main className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex justify-center lg:hidden">
            <JornadaLogo size={32} animated={false} />
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
