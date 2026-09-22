import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";
import type { PillTone } from "@/components/dashboard/tabs/ui";

/**
 * Clases y mapas de tono del panel que no son componentes. Viven aparte de
 * `ui.tsx` para que ese archivo sólo exporte componentes y Fast Refresh
 * conserve su estado.
 */

/** Clases del botón primario del panel (36 px; 40 px en táctil). Para `<a download>`. */
export const botonPrimario = cn(buttonVariants({ variant: "primary", size: "sm" }), "gap-2");

/** Clases del botón outline del panel. Para `<a download>`. */
export const botonOutline = cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-2");

/** Tono de `Pill` para el estado de una persona frente al tope (`estadoDe` en jornada-artefacto). */
export const TONO_ESTADO: Record<"excede" | "limite" | "cumple", PillTone> = {
  excede: "bad",
  limite: "warn",
  cumple: "good",
};
