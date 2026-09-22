import { cva } from "class-variance-authority";

/**
 * Variantes de `ScrollArea` / `ScrollBar` (`src/components/ui/scroll-area.tsx`).
 * Viven aparte, sin componentes, para que Fast Refresh conserve el estado.
 */

export const scrollAreaVariants = cva("relative overflow-hidden", {
  variants: {
    orientation: {
      vertical: "h-full",
      horizontal: "w-full",
      both: "h-full w-full",
    },
  },
  defaultVariants: {
    orientation: "vertical",
  },
});

export const scrollBarVariants = cva("flex touch-none select-none transition-colors", {
  variants: {
    orientation: {
      vertical: "h-full w-2.5 border-l border-l-transparent p-[1px]",
      horizontal: "h-2.5 w-full border-t border-t-transparent p-[1px]",
    },
  },
  defaultVariants: {
    orientation: "vertical",
  },
});
