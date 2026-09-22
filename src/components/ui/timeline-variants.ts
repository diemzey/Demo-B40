import { cva } from "class-variance-authority";

/**
 * Variantes de `Timeline` (`src/components/ui/timeline.tsx`). Viven aparte,
 * sin componentes, para que Fast Refresh conserve el estado al editar la
 * línea de tiempo.
 */

export const timelineVariants = cva("relative flex flex-col", {
  variants: {
    variant: {
      default: "gap-4",
      compact: "gap-2",
      spacious: "gap-8",
    },
    orientation: {
      vertical: "flex-col",
      horizontal: "flex-row",
    },
  },
  defaultVariants: {
    variant: "default",
    orientation: "vertical",
  },
});

export const timelineItemVariants = cva("relative flex gap-3 pb-2", {
  variants: {
    orientation: {
      vertical: "flex-row",
      horizontal: "flex-col min-w-64 shrink-0",
    },
  },
  defaultVariants: {
    orientation: "vertical",
  },
});

export const timelineConnectorVariants = cva("bg-border", {
  variants: {
    orientation: {
      vertical: "absolute left-3 top-9 h-full w-px",
      horizontal: "absolute top-3 left-8 w-full h-px",
    },
    status: {
      default: "bg-border",
      completed: "bg-primary",
      active: "bg-primary",
      pending: "bg-muted-foreground/30",
      error: "bg-destructive",
    },
  },
  defaultVariants: {
    orientation: "vertical",
    status: "default",
  },
});

export const timelineIconVariants = cva(
  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 bg-background text-xs font-medium",
  {
    variants: {
      status: {
        default: "border-border text-muted-foreground",
        completed: "border-primary bg-primary text-primary-foreground",
        active: "border-primary bg-background text-primary animate-pulse",
        pending: "border-muted-foreground/30 text-muted-foreground",
        error: "border-destructive bg-destructive text-destructive-foreground",
      },
    },
    defaultVariants: {
      status: "default",
    },
  },
);
