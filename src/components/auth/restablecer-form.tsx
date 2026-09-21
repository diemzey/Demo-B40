"use client";

import { Eye, EyeOff, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";

import { useReportBusy } from "@/components/auth/auth-busy";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { mensajeDeErrorAuth } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/client";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { cn } from "@/lib/utils";

const MIN_PASSWORD = 8;
const SUPABASE = hasSupabaseEnv();
const FAKE_LATENCY_MS = 800;

type Status = "idle" | "pending" | "success";
type Sesion = "comprobando" | "activa" | "ausente";

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

  if (sesion === "ausente") {
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

  const comprobando = sesion === "comprobando";

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5" aria-busy={pending || comprobando}>
      <fieldset
        disabled={pending || comprobando}
        className={cn(
          "min-w-0 space-y-5 transition-opacity duration-200 ease-out motion-reduce:transition-none",
          (pending || comprobando) && "pointer-events-none opacity-60",
        )}
      >
        <div className="space-y-2">
          <Label htmlFor={passwordId}>Contraseña nueva</Label>
          <div className="relative">
            <Input
              ref={passwordRef}
              id={passwordId}
              name="password"
              type={show ? "text" : "password"}
              autoComplete="new-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError(null);
              }}
              aria-invalid={error ? true : undefined}
              className={cn("pr-11", error && "border-destructive focus-visible:ring-destructive")}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setShow((v) => !v)}
              aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
              aria-pressed={show}
              className="absolute top-1/2 right-1 h-8 w-8 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {show ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">Al menos {MIN_PASSWORD} caracteres.</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor={confirmId}>Confirmar contraseña</Label>
          <Input
            id={confirmId}
            name="confirm"
            type={show ? "text" : "password"}
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => {
              setConfirm(e.target.value);
              if (error) setError(null);
            }}
          />
        </div>
      </fieldset>

      <Button
        type="submit"
        className={cn(
          "w-full bg-yellow-400 font-semibold text-neutral-950 transition-opacity duration-200 hover:bg-yellow-300 motion-reduce:transition-none",
          pending && "disabled:opacity-90",
        )}
        disabled={pending || comprobando}
        aria-busy={pending}
      >
        {pending ? (
          <>
            <Loader2
              className="mr-2 h-4 w-4 animate-spin motion-reduce:[animation-duration:2s]"
              aria-hidden="true"
            />
            Guardando…
          </>
        ) : (
          "Guardar contraseña"
        )}
      </Button>

      <div aria-live="polite" aria-atomic="true">
        {error && (
          <p
            role="alert"
            className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {error}
          </p>
        )}
        {status === "success" && (
          <p
            role="status"
            className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400"
          >
            Contraseña guardada. Abriendo tu panel…
          </p>
        )}
      </div>
    </form>
  );
}
