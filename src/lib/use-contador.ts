"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Anima un número desde el último valor mostrado hasta `objetivo` con easing
 * suave, en ambas direcciones. Con `prefers-reduced-motion` salta directo.
 */
export function useContador(
  objetivo: number,
  duracion = 1400,
  /** Valor inicial antes de la primera animación (por defecto, el objetivo). */
  desde = objetivo,
) {
  const [valor, setValor] = useState(desde);
  const actual = useRef(desde);
  const raf = useRef(0);

  useEffect(() => {
    const reducido = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reducido) {
      raf.current = requestAnimationFrame(() => {
        actual.current = objetivo;
        setValor(objetivo);
      });
      return () => cancelAnimationFrame(raf.current);
    }
    const origen = actual.current;
    if (origen === objetivo) return;
    const inicio = performance.now();
    const paso = (ahora: number) => {
      const t = Math.max(0, Math.min(1, (ahora - inicio) / duracion));
      const ease = 1 - Math.pow(1 - t, 3);
      actual.current = origen + (objetivo - origen) * ease;
      setValor(actual.current);
      if (t < 1) raf.current = requestAnimationFrame(paso);
    };
    raf.current = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(raf.current);
  }, [objetivo, duracion]);

  return valor;
}
