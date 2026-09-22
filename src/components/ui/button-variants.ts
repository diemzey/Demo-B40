import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Variantes de `Button` (`src/components/ui/button.tsx`). Viven en un módulo
 * aparte, sin componentes, para que Fast Refresh conserve el estado de los
 * componentes al editar `button.tsx`.
 */

/**
 * Premium finish shared by the filled variants (default / destructive /
 * secondary). Everything here is independent of the background color so it
 * layers correctly on top of call-site overrides such as `bg-yellow-400`:
 *  - a vertical white-to-transparent gradient (background-image, so it
 *    coexists with any `bg-<color>`),
 *  - an inner top highlight + inner bottom shade + 1px outer hairline, all
 *    via box-shadow (follows `rounded-*` automatically).
 */
const filledFinish =
  "bg-linear-to-b from-white/12 to-white/0 hover:from-white/20 active:translate-y-px active:from-white/5 shadow-[inset_0_1px_0_0_rgb(255_255_255/0.18),inset_0_-1px_0_0_rgb(0_0_0/0.18),0_0_0_1px_rgb(0_0_0/0.3)]"

export const buttonVariants = cva(
  "relative isolate inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-[color,background-color,border-color,box-shadow,transform] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: cn(
          "bg-primary text-primary-foreground hover:bg-primary/90",
          filledFinish,
        ),
        /**
         * Botón principal de Jornada40: amarillo, texto oscuro. Es el único
         * primario del producto (portada, auth y panel); `default` queda
         * para los componentes de shadcn que lo esperan neutro.
         */
        primary: cn(
          "bg-yellow-400 font-semibold text-neutral-950 hover:bg-yellow-300",
          filledFinish,
        ),
        destructive: cn(
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
          filledFinish,
        ),
        outline:
          "border border-border/80 bg-background bg-linear-to-b from-white/6 to-white/0 shadow-[inset_0_1px_0_0_rgb(255_255_255/0.08),0_1px_2px_0_rgb(0_0_0/0.3)] hover:bg-accent hover:text-accent-foreground hover:from-white/10 active:translate-y-px active:from-white/3",
        secondary: cn(
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
          filledFinish,
        ),
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        /** Botones del panel: 36 px en escritorio, 40 px en pantallas táctiles. */
        sm: "h-10 rounded-md px-3 text-[13px] md:h-9",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
)

export type ButtonVariantProps = VariantProps<typeof buttonVariants>
