import type { Metadata } from "next";
import Link from "next/link";

import { PRIVACIDAD } from "@/components/legal/legal-content";
import { JornadaLogo } from "@/components/ui/jornada-logo";
import { LegalCollapsibleCard } from "@/components/ui/legal-collapsible-card";

export const metadata: Metadata = {
  title: "Aviso de privacidad · Jornada40",
  description:
    "Qué datos recaba Jornada40, cuáles nunca guarda y cómo ejercer tus derechos ARCO.",
};

export default function PrivacidadPage() {
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
          title={PRIVACIDAD.title}
          updatedAt={PRIVACIDAD.updatedAt}
          sections={PRIVACIDAD.sections}
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
