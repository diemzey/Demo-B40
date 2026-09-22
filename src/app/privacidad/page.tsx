import type { Metadata } from "next";

import { PRIVACIDAD } from "@/components/legal/legal-content";
import { LegalPage } from "@/components/ui/legal-page";

export const metadata: Metadata = {
  title: "Aviso de privacidad · Jornada40",
  description:
    "Qué datos recaba Jornada40, cuáles nunca guarda y cómo ejercer tus derechos ARCO.",
};

export default function PrivacidadPage() {
  return <LegalPage documento={PRIVACIDAD} />;
}
