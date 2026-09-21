"use client";

import { Loader2, MailCheck } from "lucide-react";
import Link from "next/link";
import { useId, useRef, useState, type FormEvent } from "react";

import { useReportBusy } from "@/components/auth/auth-busy";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { mensajeDeErrorAuth } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/client";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { cn } from "@/lib/utils";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SUPABASE = hasSupabaseEnv();
// DEMO (sin Supabase): tiempo simulado de "petición".
const FAKE_LATENCY_MS = 800;

type Status = "idle" | "pending" | "enviado";

/** Pide a Supabase el correo de recuperación; el enlace vuelve a /auth/confirm → /restablecer. */
export function RecuperarForm() {
  const id = useId();
  const emailId = `${id}-email`;
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const emailRef = useRef<HTMLInputElement>(null);

  const pending = status === "pending";
  useReportBusy(pending);

  async function enviar(correo: string) {
    if (!SUPABASE) {
      // DEMO: no hay backend; simulamos el envío.
      await new Promise((r) => setTimeout(r, FAKE_LATENCY_MS));
      setStatus("enviado");
      return;
    }
    const supabase = createClient();
    const { error: err } = await supabase.auth.resetPasswordForEmail(correo, {
      redirectTo: `${window.location.origin}/auth/confirm?next=/restablecer`,
    });
    if (err) {
      setError(mensajeDeErrorAuth(err));
      setStatus("idle");
      emailRef.current?.focus();
      return;
    }
    setStatus("enviado");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const correo = email.trim();
    if (!correo || !EMAIL_RE.test(correo)) {
      setError(correo ? "Ese correo no parece válido." : "Escribe tu correo de trabajo.");
      emailRef.current?.focus();
      return;
    }
    setError(null);
    setStatus("pending");
    void enviar(correo);
  }

  if (status === "enviado") {
    return (
      <div role="status" aria-live="polite" className="space-y-5">
        <div className="flex items-start gap-3 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-3 text-sm">
          <MailCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" aria-hidden="true" />
          <div className="space-y-1">
            <p className="font-medium text-emerald-400">Revisa tu correo</p>
            <p className="text-muted-foreground">
              Si <span className="text-foreground">{email.trim()}</span> tiene cuenta, te enviamos un
              enlace para elegir una contraseña nueva. Revisa también la carpeta de spam.
            </p>
          </div>
        </div>
        <Button asChild className="w-full bg-yellow-400 font-semibold text-neutral-950 hover:bg-yellow-300">
          <Link href="/login">Volver a entrar</Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5" aria-busy={pending}>
      <fieldset
        disabled={pending}
        className={cn(
          "min-w-0 space-y-5 transition-opacity duration-200 ease-out motion-reduce:transition-none",
          pending && "pointer-events-none opacity-60",
        )}
      >
        <div className="space-y-2">
          <Label htmlFor={emailId}>Correo de trabajo</Label>
          <Input
            ref={emailRef}
            id={emailId}
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="tu@empresa.mx"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (error) setError(null);
            }}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${emailId}-error` : undefined}
            className={cn(error && "border-destructive focus-visible:ring-destructive")}
          />
        </div>
      </fieldset>

      <Button
        type="submit"
        className={cn(
          "w-full bg-yellow-400 font-semibold text-neutral-950 transition-opacity duration-200 hover:bg-yellow-300 motion-reduce:transition-none",
          pending && "disabled:opacity-90",
        )}
        disabled={pending}
        aria-busy={pending}
      >
        {pending ? (
          <>
            <Loader2
              className="mr-2 h-4 w-4 animate-spin motion-reduce:[animation-duration:2s]"
              aria-hidden="true"
            />
            Enviando…
          </>
        ) : (
          "Enviar enlace"
        )}
      </Button>

      <div aria-live="polite" aria-atomic="true">
        {error && (
          <p
            id={`${emailId}-error`}
            role="alert"
            className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {error}
          </p>
        )}
      </div>

      <p className="text-center text-sm text-muted-foreground">
        ¿La recordaste?{" "}
        <Link
          href="/login"
          className={cn(
            "font-medium text-yellow-400 underline-offset-4 hover:underline",
            pending && "pointer-events-none",
          )}
          aria-disabled={pending || undefined}
          tabIndex={pending ? -1 : undefined}
        >
          Entrar
        </Link>
      </p>
    </form>
  );
}
