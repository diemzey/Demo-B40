"use client";

import { useEffect } from "react";
import Link from "next/link";
import { BotonOutline, BotonPrimario, Panel } from "@/components/dashboard/tabs/ui";

/**
 * Error de servidor al armar el panel. Mensaje corto, sin detalle técnico;
 * "Reintentar" vuelve a pedir la página con `reset()`.
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex w-full max-w-6xl p-4 md:p-6">
      <Panel className="mx-auto w-full max-w-md p-6 text-center">
        <p className="j40-eyebrow">Panel</p>
        <h1 className="mt-2 text-xl font-semibold tracking-tight">No pudimos cargar tu panel</h1>
        <p className="j40-body mt-2 text-muted-foreground">
          Algo falló de nuestro lado. Vuelve a intentarlo; si sigue igual, escríbenos a{" "}
          <a href="mailto:contacto@aivena.ai" className="underline underline-offset-4">
            contacto@aivena.ai
          </a>
          .
        </p>
        <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
          <BotonPrimario type="button" onClick={() => reset()}>
            Reintentar
          </BotonPrimario>
          <BotonOutline asChild>
            <Link href="/">Ir al inicio</Link>
          </BotonOutline>
        </div>
      </Panel>
    </div>
  );
}
