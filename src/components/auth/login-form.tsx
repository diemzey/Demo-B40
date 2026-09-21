"use client";

import { Eye, EyeOff, Loader2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 8;
// Tiempo simulado de "petición" al enviar (no hay backend).
const FAKE_LATENCY_MS = 800;

type Errors = Partial<Record<"email" | "password", string>>;
type Status = "idle" | "pending" | "success";

function validate(email: string, password: string): Errors {
  const errors: Errors = {};
  if (!email.trim()) {
    errors.email = "Escribe tu correo de trabajo.";
  } else if (!EMAIL_RE.test(email.trim())) {
    errors.email = "Ese correo no parece válido.";
  }
  if (!password) {
    errors.password = "Escribe tu contraseña.";
  } else if (password.length < MIN_PASSWORD) {
    errors.password = `La contraseña debe tener al menos ${MIN_PASSWORD} caracteres.`;
  }
  return errors;
}

export function LoginForm() {
  const id = useId();
  const emailId = `${id}-email`;
  const passwordId = `${id}-password`;
  const rememberId = `${id}-remember`;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<Status>("idle");

  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Limpia el temporizador simulado si el componente se desmonta a medias.
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "pending") return;

    const nextErrors = validate(email, password);
    setErrors(nextErrors);
    if (nextErrors.email) {
      emailRef.current?.focus();
      return;
    }
    if (nextErrors.password) {
      passwordRef.current?.focus();
      return;
    }

    // DEMO: no existe backend de autenticación. Simulamos la latencia de una
    // petición y mostramos un mensaje de éxito sin enviar nada a ningún lado.
    setStatus("pending");
    timerRef.current = setTimeout(() => {
      setStatus("success");
    }, FAKE_LATENCY_MS);
  }

  const pending = status === "pending";

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
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
            if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
          }}
          aria-invalid={errors.email ? true : undefined}
          aria-describedby={errors.email ? `${emailId}-error` : undefined}
          className={cn(errors.email && "border-destructive focus-visible:ring-destructive")}
          disabled={pending}
        />
        {errors.email && (
          <p id={`${emailId}-error`} role="alert" className="text-destructive text-sm">
            {errors.email}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor={passwordId}>Contraseña</Label>
        <div className="relative">
          <Input
            ref={passwordRef}
            id={passwordId}
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
            }}
            aria-invalid={errors.password ? true : undefined}
            aria-describedby={errors.password ? `${passwordId}-error` : undefined}
            className={cn("pr-11", errors.password && "border-destructive focus-visible:ring-destructive")}
            disabled={pending}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            aria-pressed={showPassword}
            className="absolute top-1/2 right-1 h-8 w-8 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            disabled={pending}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Eye className="h-4 w-4" aria-hidden="true" />
            )}
          </Button>
        </div>
        {errors.password && (
          <p id={`${passwordId}-error`} role="alert" className="text-destructive text-sm">
            {errors.password}
          </p>
        )}
      </div>

      <div className="flex items-center justify-between gap-4 text-sm">
        <label htmlFor={rememberId} className="flex cursor-pointer items-center gap-2 select-none">
          <input
            id={rememberId}
            name="remember"
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="h-4 w-4 rounded accent-yellow-400"
            disabled={pending}
          />
          Recordarme
        </label>
        <Link
          href="/recuperar"
          className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:underline focus-visible:outline-none"
        >
          ¿Olvidaste tu contraseña?
        </Link>
      </div>

      <Button
        type="submit"
        className="w-full bg-yellow-400 font-semibold text-neutral-950 hover:bg-yellow-300"
        disabled={pending}
        aria-busy={pending}
      >
        {pending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
            Entrando…
          </>
        ) : (
          "Entrar"
        )}
      </Button>

      {status === "success" && (
        <p
          role="status"
          className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400"
        >
          Sesión iniciada (demo).
        </p>
      )}

      <p className="text-center text-sm text-muted-foreground">
        ¿No tienes cuenta?{" "}
        <Link
          href="/registro"
          className="font-medium text-amber-400 underline-offset-4 hover:underline focus-visible:underline focus-visible:outline-none"
        >
          Crear cuenta
        </Link>
      </p>
    </form>
  );
}
