import Link from "next/link";

import type { LegalDocument } from "@/components/legal/legal-content";
import { JornadaLogo } from "@/components/ui/jornada-logo";
import { LegalCollapsibleCard } from "@/components/ui/legal-collapsible-card";

/**
 * Página completa de un documento legal (aviso de privacidad, términos):
 * fondo oscuro, logo que lleva al inicio, tarjeta plegable y enlace de vuelta.
 * La comparten `src/app/privacidad/page.tsx` y `src/app/terminos/page.tsx`.
 */
export function LegalPage({ documento }: { documento: LegalDocument }) {
  return (
    <div
      className="dark flex min-h-screen flex-col items-center bg-background px-4 py-12 text-foreground sm:py-16"
      style={{ colorScheme: "dark" }}
    >
      <main className="flex w-full max-w-2xl flex-col items-center gap-8">
        <Link href="/" aria-label="Ir al inicio">
          <JornadaLogo size={28} animated={false} />
        </Link>
        <LegalCollapsibleCard
          title={documento.title}
          updatedAt={documento.updatedAt}
          sections={documento.sections}
        />
        <Link
          href="/"
          className="text-sm text-muted-foreground underline underline-offset-4 transition-colors hover:text-amber-400"
        >
          Volver al inicio
        </Link>
      </main>
    </div>
  );
}
