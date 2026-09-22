"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";

import { useReportBusy } from "@/components/auth/auth-busy";
import {
  BotonEnviar,
  CampoContrasena,
  CampoTexto,
  EstadoEnvio,
} from "@/components/auth/form-partes";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { mensajeDeErrorAuth } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/client";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { cn } from "@/lib/utils";

const MIN_PASSWORD = 8;
const SUPABASE = hasSupabaseEnv();
const FAKE_LATENCY_MS = 800;
const MENSAJE_EXITO = "Contraseña guardada. Abriendo tu panel…";

type Status = "idle" | "pending" | "success";
type Sesion = "comprobando" | "activa" | "ausente";

/** Sin sesión de recuperación: el enlace caducó o ya se usó. */
function EnlaceCaducado() {
  return (
    <div role="status" className="space-y-5">
      <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-300">
        El enlace caducó o ya se usó. Pide uno nuevo para elegir tu contraseña.
      </p>
      <Button asChild className="w-full bg-yellow-400 font-semibold text-neutral-950 hover:bg-yellow-300">
        <Link href="/recuperar">Pedir otro enlace</Link>
      </Button>
    </div>
  );
}

/**
 * Elige una contraseña nueva. Se llega aquí desde el enlace del correo de
 * recuperación (/auth/confirm ya abrió la sesión); sin sesión se ofrece pedir
 * otro enlace.
 */
export function RestablecerForm() {
  const id = useId();
  const passwordId = `${id}-password`;
  const confirmId = `${id}-confirm`;
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [sesion, setSesion] = useState<Sesion>(SUPABASE ? "comprobando" : "activa");
  const passwordRef = useRef<HTMLInputElement>(null);

  const pending = status !== "idle";
  useReportBusy(pending);

  useEffect(() => {
    if (!SUPABASE) return;
    let vivo = true;
    createClient()
      .auth.getUser()
      .then(({ data }) => {
        if (vivo) setSesion(data.user ? "activa" : "ausente");
      })
      .catch(() => {
        if (vivo) setSesion("ausente");
      });
    return () => {
      vivo = false;
    };
  }, []);

  async function guardar() {
    if (!SUPABASE) {
      await new Promise((r) => setTimeout(r, FAKE_LATENCY_MS));
      setStatus("success");
      setTimeout(() => router.replace("/dashboard"), 600);
      return;
    }
    const supabase = createClient();
    const { error: err } = await supabase.auth.updateUser({ password });
    if (err) {
      setError(mensajeDeErrorAuth(err));
      setStatus("idle");
      passwordRef.current?.focus();
      return;
    }
    setStatus("success");
    router.replace("/dashboard");
    router.refresh();
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    if (password.length < MIN_PASSWORD) {
      setError(`La contraseña debe tener al menos ${MIN_PASSWORD} caracteres.`);
      passwordRef.current?.focus();
      return;
    }
    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setError(null);
    setStatus("pending");
    void guardar();
  }

  if (sesion === "ausente") return <EnlaceCaducado />;

  const comprobando = sesion === "comprobando";
  const bloqueado = pending || comprobando;

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5" aria-busy={bloqueado}>
      <fieldset
        disabled={bloqueado}
        className={cn(
          "min-w-0 space-y-5 transition-opacity duration-200 ease-out motion-reduce:transition-none",
          bloqueado && "pointer-events-none opacity-60",
        )}
      >
        <div className="space-y-2">
          <Label htmlFor={passwordId}>Contraseña nueva</Label>
          <CampoContrasena
            ref={passwordRef}
            id={passwordId}
            name="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (error) setError(null);
            }}
            aria-invalid={error ? true : undefined}
            className={cn(error && "border-destructive focus-visible:ring-destructive")}
            visible={show}
            onAlternar={() => setShow((v) => !v)}
          />
          <p className="text-xs text-muted-foreground">Al menos {MIN_PASSWORD} caracteres.</p>
        </div>

        <CampoTexto
          id={confirmId}
          etiqueta="Confirmar contraseña"
          name="confirm"
          type={show ? "text" : "password"}
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => {
            setConfirm(e.target.value);
            if (error) setError(null);
          }}
        />
      </fieldset>

      <BotonEnviar
        pending={pending}
        disabled={bloqueado}
        etiqueta="Guardar contraseña"
        etiquetaPendiente="Guardando…"
      />

      <EstadoEnvio error={error} exito={status === "success" ? MENSAJE_EXITO : null} />
    </form>
  );
}
