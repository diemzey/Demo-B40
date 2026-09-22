"use client";

import { Eye, EyeOff, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";

import { useReportBusy } from "@/components/auth/auth-busy";
import { DEMO_USER, useSession } from "@/components/auth/session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { mensajeDeErrorAuth, rutaSegura } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/client";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { cn } from "@/lib/utils";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 8;
// DEMO (sin Supabase): tiempo simulado de "petición" al enviar.
const FAKE_LATENCY_MS = 800;
// DEMO: pausa breve para que se alcance a leer el mensaje de éxito antes de ir al panel.
const REDIRECT_DELAY_MS = 600;

// Se decide una sola vez: las variables públicas se inyectan en build.
const SUPABASE = hasSupabaseEnv();

type Errors = Partial<Record<"email" | "password", string>>;
type Status = "idle" | "pending" | "success";

/** Mensajes para los avisos que llegan por query string (`?error=`, `?confirmado=1`). */
const AVISOS_ERROR: Record<string, string> = {
  confirmacion: "El enlace caducó. Pide uno nuevo desde tu correo de registro.",
  sesion: "Tu sesión terminó. Vuelve a entrar para continuar.",
};
const AVISO_ERROR_GENERICO = "Ocurrió un problema. Inténtalo de nuevo.";
const AVISO_CONFIRMADO = "Correo confirmado. Ya puedes entrar.";

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
  const [formError, setFormError] = useState<string | null>(null);

  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn } = useSession();

  // Destino tras entrar: `?next=` (validado) o el panel.
  const next = rutaSegura(searchParams.get("next"), "/dashboard");
  const errorParam = searchParams.get("error");
  const confirmado = searchParams.get("confirmado") === "1";
  const aviso = errorParam
    ? {
        tipo: "error" as const,
        texto: AVISOS_ERROR[errorParam] ?? AVISO_ERROR_GENERICO,
      }
    : confirmado
      ? { tipo: "ok" as const, texto: AVISO_CONFIRMADO }
      : null;

  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  // Limpia el temporizador simulado si el componente se desmonta a medias.
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // Mientras hay una petición (o ya vamos de salida) todo el formulario está
  // en modo carga; también se lo contamos al marco para su barra de progreso.
  const pending = status !== "idle";
  useReportBusy(pending);

  async function signInWithSupabase(correo: string, contrasena: string) {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: correo,
      password: contrasena,
    });
    if (!mountedRef.current) return;
    if (error) {
      setFormError(mensajeDeErrorAuth(error));
      setStatus("idle");
      // Devuelve el foco al primer campo para reintentar sin ratón.
      emailRef.current?.focus();
      return;
    }
    setStatus("success");
    // `replace` para que "atrás" no vuelva al formulario; `refresh` para que
    // el proxy y los server components vean la cookie recién escrita.
    router.replace(next);
    router.refresh();
  }

  function signInDemo(correo: string) {
    // DEMO: no existe backend de autenticación. Simulamos la latencia de una
    // petición y mostramos un mensaje de éxito sin enviar nada a ningún lado.
    timerRef.current = setTimeout(() => {
      // Guardamos una sesión de demostración con el correo que escribió.
      signIn({ ...DEMO_USER, correo });
      setStatus("success");
      timerRef.current = setTimeout(() => {
        router.push(next);
      }, REDIRECT_DELAY_MS);
    }, FAKE_LATENCY_MS);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    const nextErrors = validate(email, password);
    setErrors(nextErrors);
    setFormError(null);
    if (nextErrors.email) {
      emailRef.current?.focus();
      return;
    }
    if (nextErrors.password) {
      passwordRef.current?.focus();
      return;
    }

    setStatus("pending");
    if (SUPABASE) {
      void signInWithSupabase(email.trim(), password);
    } else {
      signInDemo(email.trim());
    }
  }

  const linkClass =
    "text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:underline focus-visible:outline-none";
  const linkDisabled = pending ? "pointer-events-none" : undefined;

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5" aria-busy={pending}>
      {aviso && !formError && status === "idle" && (
        <p
          role="status"
          aria-live="polite"
          className={cn(
            "rounded-md border px-3 py-2 text-sm",
            aviso.tipo === "ok"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
              : "border-amber-500/30 bg-amber-500/10 text-amber-300",
          )}
        >
          {aviso.texto}
        </p>
      )}

      {/* Un solo `fieldset disabled` apaga todos los controles a la vez y
          atenúa el bloque mientras se espera respuesta. */}
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
              if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
            }}
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={errors.email ? `${emailId}-error` : undefined}
            className={cn(errors.email && "border-destructive focus-visible:ring-destructive")}
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
              className={cn(
                "pr-11",
                errors.password && "border-destructive focus-visible:ring-destructive",
              )}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              aria-pressed={showPassword}
              className="absolute top-1/2 right-1 h-8 w-8 -translate-y-1/2 text-muted-foreground hover:text-foreground"
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
          <label
            htmlFor={rememberId}
            className="flex cursor-pointer items-center gap-2 select-none"
          >
            <input
              id={rememberId}
              name="remember"
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="h-4 w-4 rounded accent-yellow-400"
            />
            Recordarme
          </label>
          <Link
            href="/recuperar"
            className={cn(linkClass, linkDisabled)}
            aria-disabled={pending || undefined}
            tabIndex={pending ? -1 : undefined}
          >
            ¿Olvidaste tu contraseña?
          </Link>
        </div>
      </fieldset>

      <Button
        type="submit"
        className={cn(
          "w-full bg-yellow-400 font-semibold text-neutral-950 transition-opacity duration-200 hover:bg-yellow-300 motion-reduce:transition-none",
          // Mientras carga el botón sigue bien visible: es el indicador principal.
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
            Entrando…
          </>
        ) : (
          "Entrar"
        )}
      </Button>

      {/* Región viva única para errores/éxito del envío. */}
      <div aria-live="polite" aria-atomic="true">
        {formError && (
          <p
            role="alert"
            className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {formError}
          </p>
        )}
        {status === "success" && (
          <p
            role="status"
            className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400"
          >
            {SUPABASE ? "Sesión iniciada. Abriendo tu panel…" : "Sesión iniciada (demo)."}
          </p>
        )}
      </div>

      <p className="text-center text-sm text-muted-foreground">
        ¿No tienes cuenta?{" "}
        <Link
          href="/registro"
          className={cn(
            "font-medium text-amber-400 underline-offset-4 hover:underline focus-visible:underline focus-visible:outline-none",
            linkDisabled,
          )}
          aria-disabled={pending || undefined}
          tabIndex={pending ? -1 : undefined}
        >
          Crear cuenta
        </Link>
      </p>
    </form>
  );
}
