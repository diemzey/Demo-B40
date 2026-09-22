"use client";

import { Eye, EyeOff, Loader2 } from "lucide-react";
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/**
 * Piezas compartidas por los formularios de acceso (`login-form.tsx`,
 * `register-form.tsx`, `restablecer-form.tsx`): campo de texto con error,
 * campo de contraseña con "mostrar/ocultar", botón de envío con spinner y la
 * región viva de error/éxito y enlaces que se apagan durante el envío. Sólo
 * exporta componentes (Fast Refresh).
 */

const INVALIDO = "border-destructive focus-visible:ring-destructive";

/**
 * Mensaje de error bajo un campo. Su `id` es `${campoId}-error`, que es lo que
 * el campo enlaza en `aria-describedby`.
 */
export function ErrorCampo({ campoId, mensaje }: { campoId: string; mensaje?: string | null }) {
  if (!mensaje) return null;
  return (
    <p id={`${campoId}-error`} role="alert" className="text-destructive text-sm">
      {mensaje}
    </p>
  );
}

type CampoTextoProps = Omit<ComponentProps<typeof Input>, "id"> & {
  id: string;
  etiqueta: string;
  error?: string | null;
};

/** Etiqueta + `Input` + mensaje de error, con los atributos ARIA ya enlazados. */
export function CampoTexto({ id, etiqueta, error, className, ...props }: CampoTextoProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{etiqueta}</Label>
      <Input
        {...props}
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={cn(error && INVALIDO, className)}
      />
      <ErrorCampo campoId={id} mensaje={error} />
    </div>
  );
}

type CampoContrasenaProps = ComponentProps<typeof Input> & {
  id: string;
  /** La contraseña se muestra como texto; el estado lo lleva el formulario. */
  visible: boolean;
  onAlternar: () => void;
  /** Mensaje de error del campo: enlaza `aria-invalid` y `aria-describedby` con `${id}-error`. */
  error?: string | null;
  /** `id` de una pista que describe siempre al campo (va después del error). */
  pistaId?: string;
};

/**
 * `Input` de contraseña con el botón de mostrar/ocultar superpuesto a la
 * derecha. Los atributos ARIA pasados explícitamente tienen prioridad sobre
 * los que se derivan de `error` / `pistaId`.
 */
export function CampoContrasena({
  id,
  visible,
  onAlternar,
  error,
  pistaId,
  className,
  ...props
}: CampoContrasenaProps) {
  const describedBy = [error ? `${id}-error` : null, pistaId ?? null].filter(Boolean).join(" ");
  return (
    <div className="relative">
      <Input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        {...props}
        type={visible ? "text" : "password"}
        className={cn("pr-11", error && INVALIDO, className)}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onAlternar}
        aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
        aria-pressed={visible}
        className="absolute top-1/2 right-1 h-8 w-8 -translate-y-1/2 text-muted-foreground hover:text-foreground"
      >
        {visible ? (
          <EyeOff className="h-4 w-4" aria-hidden="true" />
        ) : (
          <Eye className="h-4 w-4" aria-hidden="true" />
        )}
      </Button>
    </div>
  );
}

/**
 * Enlace de los formularios que se "apaga" mientras hay un envío en curso:
 * sin puntero, sin tabulación y marcado como `aria-disabled`.
 */
export function EnlaceInactivable({
  href,
  inactivo,
  className,
  children,
}: {
  href: string;
  inactivo: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(className, inactivo && "pointer-events-none")}
      aria-disabled={inactivo || undefined}
      tabIndex={inactivo ? -1 : undefined}
    >
      {children}
    </Link>
  );
}

/** Botón principal amarillo de envío; mientras `pending` muestra el spinner. */
export function BotonEnviar({
  pending,
  etiqueta,
  etiquetaPendiente,
  disabled,
}: {
  pending: boolean;
  etiqueta: string;
  etiquetaPendiente: string;
  /** Por defecto se deshabilita mientras `pending`. */
  disabled?: boolean;
}) {
  return (
    <Button
      type="submit"
      className={cn(
        "w-full bg-yellow-400 font-semibold text-neutral-950 transition-opacity duration-200 hover:bg-yellow-300 motion-reduce:transition-none",
        // Mientras carga el botón sigue bien visible: es el indicador principal.
        pending && "disabled:opacity-90",
      )}
      disabled={disabled ?? pending}
      aria-busy={pending}
    >
      {pending ? (
        <>
          <Loader2
            className="mr-2 h-4 w-4 animate-spin motion-reduce:[animation-duration:2s]"
            aria-hidden="true"
          />
          {etiquetaPendiente}
        </>
      ) : (
        etiqueta
      )}
    </Button>
  );
}

/** Región viva única para errores/éxito del envío. */
export function EstadoEnvio({ error, exito }: { error: string | null; exito: string | null }) {
  return (
    <div aria-live="polite" aria-atomic="true">
      {error && (
        <p
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </p>
      )}
      {exito && (
        <p
          role="status"
          className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400"
        >
          {exito}
        </p>
      )}
    </div>
  );
}
