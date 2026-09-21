"use client";

import { ViewTransition, type ReactNode } from "react";

import "./transitions.css";

/**
 * Envuelve el contenido de cada pantalla en un `<ViewTransition>` de React,
 * que se apoya en la View Transitions API nativa del navegador. En el App
 * Router de Next 16 cada navegación corre dentro de una Transition, así que
 * la animación se activa sola: la pantalla saliente recibe la clase
 * `j40-page-exit` y la entrante `j40-page-enter` (ver `transitions.css`).
 *
 * `default="none"` evita que el envoltorio se anime en transiciones ajenas
 * (pestañas con `startTransition`, `useDeferredValue`, revalidaciones…).
 *
 * Solo se animan las capturas (`::view-transition-old/new`), nunca el DOM
 * vivo: ningún ancestro recibe `transform`, por lo que la cabecera fija de
 * la landing sigue siendo `position: fixed` antes, durante y después.
 *
 * Sin soporte del navegador, o con `prefers-reduced-motion: reduce`, el
 * cambio de pantalla es instantáneo.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <ViewTransition enter="j40-page-enter" exit="j40-page-exit" default="none">
      <div className="j40-page">{children}</div>
    </ViewTransition>
  );
}
