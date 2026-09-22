import type { Metadata } from "next";

import { TERMINOS } from "@/components/legal/legal-content";
import { LegalPage } from "@/components/ui/legal-page";

export const metadata: Metadata = {
  title: "Términos y condiciones · Jornada40",
  description:
    "Alcance, límites y condiciones de uso del diagnóstico de turnos de Jornada40.",
};

export default function TerminosPage() {
  return <LegalPage documento={TERMINOS} />;
}
