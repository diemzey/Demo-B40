import type { Metadata } from "next";

import { NotFoundPage } from "@/components/ui/not-found-page";

export const metadata: Metadata = {
  title: { absolute: "Página no encontrada · Jornada40" },
};

export default function NotFound() {
  return <NotFoundPage />;
}
