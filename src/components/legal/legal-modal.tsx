"use client";

import type { ReactNode } from "react";

import { PRIVACIDAD, TERMINOS } from "@/components/legal/legal-content";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { LegalCollapsibleCard } from "@/components/ui/legal-collapsible-card";
import { cn } from "@/lib/utils";

export type LegalKind = "privacidad" | "terminos";

const DOCUMENTS = {
  privacidad: PRIVACIDAD,
  terminos: TERMINOS,
} as const;

export type LegalModalProps = {
  kind: LegalKind;
  /** Disparador personalizado. Si se omite, se usa un enlace de texto con el nombre del documento. */
  children?: ReactNode;
  /** Clases extra para el enlace de texto por defecto. */
  triggerClassName?: string;
};

const DEFAULT_TRIGGER_CLASS =
  "underline underline-offset-4 transition-colors hover:text-amber-400";

/**
 * Abre un documento legal (aviso de privacidad o términos) en un diálogo,
 * sin sacar al usuario de la página.
 */
export function LegalModal({ kind, children, triggerClassName }: LegalModalProps) {
  const doc = DOCUMENTS[kind];

  return (
    <Dialog>
      {children ? (
        <DialogTrigger asChild>{children}</DialogTrigger>
      ) : (
        <DialogTrigger
          type="button"
          className={cn(DEFAULT_TRIGGER_CLASS, triggerClassName)}
        >
          {doc.title}
        </DialogTrigger>
      )}
      <DialogContent className="max-w-lg overflow-hidden p-0 sm:max-w-lg">
        <DialogTitle className="sr-only">{doc.title}</DialogTitle>
        <LegalCollapsibleCard
          title={doc.title}
          updatedAt={doc.updatedAt}
          sections={doc.sections}
          scrollable
          className="rounded-none border-0 bg-transparent shadow-none"
        />
      </DialogContent>
    </Dialog>
  );
}

export type LegalModalKindProps = Omit<LegalModalProps, "kind">;

export function PrivacidadModal(props: LegalModalKindProps) {
  return <LegalModal kind="privacidad" {...props} />;
}

export function TerminosModal(props: LegalModalKindProps) {
  return <LegalModal kind="terminos" {...props} />;
}

/** Ambos enlaces legales separados por "·", listos para un pie de página. */
export function LegalLinks({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex flex-wrap items-center gap-x-2", className)}>
      <PrivacidadModal />
      <span aria-hidden="true">·</span>
      <TerminosModal />
    </span>
  );
}
