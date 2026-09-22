"use client";

import * as React from "react";
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";
import type { VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import {
  scrollAreaVariants,
  scrollBarVariants,
} from "@/components/ui/scroll-area-variants";

// Las variantes viven en `scroll-area-variants.ts`: este archivo sólo exporta
// componentes para que Fast Refresh conserve el estado.

export interface ScrollAreaProps
  extends React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root>,
    VariantProps<typeof scrollAreaVariants> {
  scrollHideDelay?: number;
  type?: "auto" | "always" | "scroll" | "hover";
}

const ScrollArea = React.forwardRef<
  React.ComponentRef<typeof ScrollAreaPrimitive.Root>,
  ScrollAreaProps
>(
  (
    {
      className,
      children,
      orientation,
      scrollHideDelay = 600,
      type = "hover",
      ...props
    },
    ref
  ) => (
    <ScrollAreaPrimitive.Root
      ref={ref}
      className={cn(scrollAreaVariants({ orientation }), className)}
      {...props}
    >
      <ScrollAreaPrimitive.Viewport className="h-full w-full rounded-[inherit]">
        {children}
      </ScrollAreaPrimitive.Viewport>
      <ScrollBar
        orientation="vertical"
        type={type}
        scrollHideDelay={scrollHideDelay}
      />
      {(orientation === "horizontal" || orientation === "both") && (
        <ScrollBar
          orientation="horizontal"
          type={type}
          scrollHideDelay={scrollHideDelay}
        />
      )}
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  )
);

ScrollArea.displayName = ScrollAreaPrimitive.Root.displayName;

interface ScrollBarProps
  extends React.ComponentPropsWithoutRef<
    typeof ScrollAreaPrimitive.ScrollAreaScrollbar
  > {
  scrollHideDelay?: number;
  type?: "auto" | "always" | "scroll" | "hover";
}

const ScrollBar = React.forwardRef<
  React.ComponentRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>,
  ScrollBarProps
>(
  (
    { className, orientation = "vertical", scrollHideDelay, type, ...props },
    ref
  ) => {
    return (
      <ScrollAreaPrimitive.ScrollAreaScrollbar
        ref={ref}
        orientation={orientation}
        className={cn(
          scrollBarVariants({ orientation }),
          "hover:bg-accent",
          className
        )}
        {...(scrollHideDelay && { scrollHideDelay })}
        {...(type && { type })}
        {...props}
      >
        <ScrollAreaPrimitive.ScrollAreaThumb className="relative flex-1 rounded-full bg-border hover:bg-foreground/30 transition-colors" />
      </ScrollAreaPrimitive.ScrollAreaScrollbar>
    );
  }
);

ScrollBar.displayName = ScrollAreaPrimitive.ScrollAreaScrollbar.displayName;

export { ScrollArea, ScrollBar };
