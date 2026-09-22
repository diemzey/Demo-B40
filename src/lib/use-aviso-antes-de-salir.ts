"use client";

import { useEffect } from "react";

/**
 * Mientras `activo`, salir de la página (cerrar pestaña, recargar) cortaría un
 * trabajo a la mitad: el navegador pregunta antes. Lo usan la carga del CSV y
 * la cola de programación en segundo plano.
 */
export function useAvisoAntesDeSalir(activo: boolean) {
  useEffect(() => {
    if (!activo) return;
    const avisar = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Chrome y Safari todavía exigen `returnValue` para mostrar el aviso.
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", avisar);
    return () => window.removeEventListener("beforeunload", avisar);
  }, [activo]);
}
