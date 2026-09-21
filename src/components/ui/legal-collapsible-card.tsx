"use client";

import { ChevronDownIcon } from "lucide-react";
import { useState } from "react";

import { Card, CardHeader, CardPanel, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsiblePanel,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

export type LegalSection = {
  id: string;
  title: string;
  description: string;
};

export type LegalCollapsibleCardProps = {
  /** Título del documento (p. ej. "Aviso de privacidad"). */
  title: string;
  /** Fecha legible de la última actualización. */
  updatedAt: string;
  sections: LegalSection[];
  /** `id` de la sección abierta al montar. Por defecto, la primera. `null` para ninguna. */
  defaultOpen?: string | null;
  /** Limita la altura de la lista y la hace desplazable (para usar dentro de un modal). */
  scrollable?: boolean;
  className?: string;
};

/**
 * Tarjeta con un documento legal dividido en secciones plegables: encabezado
 * con título y "Última actualización", lista dividida por líneas y una sola
 * sección abierta a la vez.
 */
export function LegalCollapsibleCard({
  title,
  updatedAt,
  sections,
  defaultOpen,
  scrollable = false,
  className,
}: LegalCollapsibleCardProps) {
  const [open, setOpen] = useState<string | null>(
    defaultOpen === undefined ? (sections[0]?.id ?? null) : defaultOpen,
  );

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="border-b px-5 pb-3 pt-5">
        <CardTitle className="text-sm">{title}</CardTitle>
        <p className="text-muted-foreground text-xs">
          Última actualización: {updatedAt}
        </p>
      </CardHeader>
      <CardPanel
        className={cn(
          "space-y-0 divide-y px-5 py-0",
          scrollable && "max-h-[60vh] overflow-y-auto overscroll-contain",
        )}
      >
        {sections.map((s) => {
          const isOpen = open === s.id;
          return (
            <Collapsible
              key={s.id}
              open={isOpen}
              onOpenChange={(o) => setOpen(o ? s.id : null)}
            >
              <CollapsibleTrigger className="flex w-full items-center justify-between gap-4 py-3 text-left font-medium text-sm transition-colors hover:text-amber-400 focus-visible:outline-none focus-visible:text-amber-400">
                {s.title}
                <ChevronDownIcon
                  aria-hidden="true"
                  className={cn(
                    "size-3.5 shrink-0 text-muted-foreground transition-transform duration-200",
                    isOpen && "rotate-180",
                  )}
                />
              </CollapsibleTrigger>
              <CollapsiblePanel>
                <p className="pb-3 text-muted-foreground text-xs leading-relaxed">
                  {s.description}
                </p>
              </CollapsiblePanel>
            </Collapsible>
          );
        })}
      </CardPanel>
    </Card>
  );
}
