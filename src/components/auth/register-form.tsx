"use client";

import { Eye, EyeOff, Loader2, MailCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";

import { useReportBusy } from "@/components/auth/auth-busy";
import { DEMO_USER, useSession } from "@/components/auth/session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { esUsuarioYaRegistrado, mensajeDeErrorAuth } from "@/lib/supabase/auth";
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

type Field =
  | "nombre"
  | "apellido"
  | "empresa"
  | "sucursal"
  | "ciudad"
  | "email"
  | "password"
  | "confirm"
  | "privacy";
type Errors = Partial<Record<Field, string>>;
// `verificar`: la cuenta se creó pero falta confirmar el correo.
type Status = "idle" | "pending" | "success" | "verificar";

type Values = {
  nombre: string;
  apellido: string;
  empresa: string;
  sucursal: string;
  ciudad: string;
  email: string;
  password: string;
  confirm: string;
  privacy: boolean;
};

const INITIAL: Values = {
  nombre: "",
  apellido: "",
  empresa: "",
  sucursal: "",
  ciudad: "",
  email: "",
  password: "",
  confirm: "",
  privacy: false,
};

// Orden de enfoque cuando hay varios errores.
const FIELD_ORDER: Field[] = [
  "nombre",
  "apellido",
  "empresa",
  "sucursal",
  "ciudad",
  "email",
  "password",
  "confirm",
  "privacy",
];

function validate(v: Values): Errors {
  const errors: Errors = {};
  if (!v.nombre.trim()) errors.nombre = "Escribe tu nombre.";
  if (!v.apellido.trim()) errors.apellido = "Escribe tu apellido.";
  if (!v.empresa.trim()) errors.empresa = "Escribe el nombre de tu empresa.";
  if (!v.sucursal.trim()) errors.sucursal = "Escribe el nombre de tu sucursal.";
  if (!v.email.trim()) {
    errors.email = "Escribe tu correo de trabajo.";
  } else if (!EMAIL_RE.test(v.email.trim())) {
    errors.email = "Ese correo no parece válido.";
  }
  if (!v.password) {
    errors.password = "Escribe una contraseña.";
  } else if (v.password.length < MIN_PASSWORD) {
    errors.password = `La contraseña debe tener al menos ${MIN_PASSWORD} caracteres.`;
  }
  if (!v.confirm) {
    errors.confirm = "Repite la contraseña.";
  } else if (v.confirm !== v.password) {
    errors.confirm = "Las contraseñas no coinciden.";
  }
  if (!v.privacy) errors.privacy = "Necesitas aceptar el aviso de privacidad.";
  return errors;
}

export function RegisterForm() {
  const id = useId();
  const ids = {
    nombre: `${id}-nombre`,
    apellido: `${id}-apellido`,
    empresa: `${id}-empresa`,
    sucursal: `${id}-sucursal`,
    ciudad: `${id}-ciudad`,
    email: `${id}-email`,
    password: `${id}-password`,
    confirm: `${id}-confirm`,
    privacy: `${id}-privacy`,
  } satisfies Record<Field, string>;

  const [values, setValues] = useState<Values>(INITIAL);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<Status>("idle");
  const [formError, setFormError] = useState<string | null>(null);

  const router = useRouter();
  const { signIn } = useSession();

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  const verificarRef = useRef<HTMLDivElement>(null);

  // Limpia el temporizador simulado si el componente se desmonta a medias.
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // Al pasar al estado "revisa tu correo", llevamos el foco al aviso.
  useEffect(() => {
    if (status === "verificar") verificarRef.current?.focus();
  }, [status]);

  // Mientras hay una petición (o ya vamos de salida) todo el formulario está
  // en modo carga; también se lo contamos al marco para su barra de progreso.
  const pending = status === "pending" || status === "success";
  useReportBusy(pending);

  function setField<K extends Field>(field: K, value: Values[K]) {
    setValues((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  async function signUpWithSupabase(v: Values) {
    const supabase = createClient();
    const origin = window.location.origin;
    const { data, error } = await supabase.auth.signUp({
      email: v.email.trim(),
      password: v.password,
      options: {
        // Claves que lee el trigger `handle_new_user` (ver supabase/README.md):
        // crea el perfil, la empresa, el hub "Principal" y la sucursal.
        data: {
          nombre: v.nombre.trim(),
          apellido: v.apellido.trim(),
          empresa: v.empresa.trim(),
          sucursal: v.sucursal.trim(),
          ciudad: v.ciudad.trim() || undefined,
        },
        emailRedirectTo: `${origin}/auth/confirm?next=/dashboard`,
      },
    });
    if (!mountedRef.current) return;

    if (error) {
      setFormError(mensajeDeErrorAuth(error));
      setStatus("idle");
      return;
    }
    if (esUsuarioYaRegistrado(data.user)) {
      setFormError(mensajeDeErrorAuth({ code: "user_already_exists" }));
      setStatus("idle");
      document.getElementById(ids.email)?.focus();
      return;
    }
    if (data.session) {
      // Confirmación por correo desactivada: ya hay sesión, vamos al panel.
      setStatus("success");
      router.replace("/dashboard");
      router.refresh();
      return;
    }
    // Hay que confirmar el correo antes de poder entrar.
    setStatus("verificar");
  }

  function signUpDemo(v: Values) {
    // DEMO: no existe backend de registro. Simulamos la latencia de una
    // petición y mostramos un mensaje de éxito sin enviar nada a ningún lado.
    timerRef.current = setTimeout(() => {
      // Guardamos una sesión de demostración con los datos del formulario.
      signIn({
        ...DEMO_USER,
        nombre: `${v.nombre.trim()} ${v.apellido.trim()}`.trim(),
        empresa: v.empresa.trim(),
        sucursal: v.sucursal.trim(),
        correo: v.email.trim(),
      });
      setStatus("success");
      timerRef.current = setTimeout(() => {
        router.push("/dashboard");
      }, REDIRECT_DELAY_MS);
    }, FAKE_LATENCY_MS);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    const nextErrors = validate(values);
    setErrors(nextErrors);
    setFormError(null);
    const firstInvalid = FIELD_ORDER.find((f) => nextErrors[f]);
    if (firstInvalid) {
      // Enfoca el primer campo inválido para que teclado y lector de pantalla
      // aterricen directo en el problema.
      document.getElementById(ids[firstInvalid])?.focus();
      return;
    }

    setStatus("pending");
    if (SUPABASE) {
      void signUpWithSupabase(values);
    } else {
      signUpDemo(values);
    }
  }

  const passwordHintId = `${ids.password}-hint`;

  function describedBy(field: Field, extra?: string) {
    const parts = [errors[field] ? `${ids[field]}-error` : null, extra ?? null].filter(Boolean);
    return parts.length ? parts.join(" ") : undefined;
  }

  function fieldError(field: Field) {
    if (!errors[field]) return null;
    return (
      <p id={`${ids[field]}-error`} role="alert" className="text-destructive text-sm">
        {errors[field]}
      </p>
    );
  }

  const invalidClass = "border-destructive focus-visible:ring-destructive";
  const linkClass =
    "font-medium text-amber-400 underline-offset-4 hover:underline focus-visible:underline focus-visible:outline-none";
  const linkDisabled = pending ? "pointer-events-none" : undefined;

  // Estado final cuando Supabase exige confirmar el correo: sustituye al
  // formulario para que el siguiente paso quede claro.
  if (status === "verificar") {
    return (
      <div
        ref={verificarRef}
        tabIndex={-1}
        role="status"
        aria-live="polite"
        className="space-y-5 outline-none"
      >
        <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-4 py-4 text-sm">
          <div className="flex items-start gap-3">
            <MailCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" aria-hidden="true" />
            <div className="space-y-1">
              <p className="font-semibold text-emerald-400">Revisa tu correo</p>
              <p className="text-foreground/90">
                Enviamos un enlace de confirmación a{" "}
                <span className="font-medium break-all text-foreground">{values.email.trim()}</span>
                . Ábrelo para activar tu cuenta y entrar a tu panel.
              </p>
              <p className="text-muted-foreground">
                Si no lo ves en unos minutos, revisa la carpeta de spam.
              </p>
            </div>
          </div>
        </div>

        <Button
          asChild
          className="w-full bg-yellow-400 font-semibold text-neutral-950 hover:bg-yellow-300"
        >
          <Link href="/login">Ir a entrar</Link>
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          ¿Te equivocaste de correo?{" "}
          <button type="button" onClick={() => setStatus("idle")} className={linkClass}>
            Volver al formulario
          </button>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4" aria-busy={pending}>
      {/* Un solo `fieldset disabled` apaga todos los controles a la vez y
          atenúa el bloque mientras se espera respuesta. */}
      <fieldset
        disabled={pending}
        className={cn(
          "min-w-0 space-y-4 transition-opacity duration-200 ease-out motion-reduce:transition-none",
          pending && "pointer-events-none opacity-60",
        )}
      >
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor={ids.nombre}>Nombre</Label>
            <Input
              id={ids.nombre}
              name="nombre"
              type="text"
              autoComplete="given-name"
              value={values.nombre}
              onChange={(e) => setField("nombre", e.target.value)}
              aria-invalid={errors.nombre ? true : undefined}
              aria-describedby={describedBy("nombre")}
              className={cn(errors.nombre && invalidClass)}
            />
            {fieldError("nombre")}
          </div>

          <div className="space-y-2">
            <Label htmlFor={ids.apellido}>Apellido</Label>
            <Input
              id={ids.apellido}
              name="apellido"
              type="text"
              autoComplete="family-name"
              value={values.apellido}
              onChange={(e) => setField("apellido", e.target.value)}
              aria-invalid={errors.apellido ? true : undefined}
              aria-describedby={describedBy("apellido")}
              className={cn(errors.apellido && invalidClass)}
            />
            {fieldError("apellido")}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor={ids.empresa}>Empresa</Label>
          <Input
            id={ids.empresa}
            name="empresa"
            type="text"
            autoComplete="organization"
            value={values.empresa}
            onChange={(e) => setField("empresa", e.target.value)}
            aria-invalid={errors.empresa ? true : undefined}
            aria-describedby={describedBy("empresa")}
            className={cn(errors.empresa && invalidClass)}
          />
          {fieldError("empresa")}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor={ids.sucursal}>Sucursal</Label>
            <Input
              id={ids.sucursal}
              name="sucursal"
              type="text"
              autoComplete="off"
              placeholder="Centro"
              value={values.sucursal}
              onChange={(e) => setField("sucursal", e.target.value)}
              aria-invalid={errors.sucursal ? true : undefined}
              aria-describedby={describedBy("sucursal")}
              className={cn(errors.sucursal && invalidClass)}
            />
            {fieldError("sucursal")}
          </div>

          <div className="space-y-2">
            <Label htmlFor={ids.ciudad}>
              Ciudad <span className="font-normal text-muted-foreground">(opcional)</span>
            </Label>
            <Input
              id={ids.ciudad}
              name="ciudad"
              type="text"
              autoComplete="address-level2"
              value={values.ciudad}
              onChange={(e) => setField("ciudad", e.target.value)}
              aria-invalid={errors.ciudad ? true : undefined}
              aria-describedby={describedBy("ciudad")}
              className={cn(errors.ciudad && invalidClass)}
            />
            {fieldError("ciudad")}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor={ids.email}>Correo de trabajo</Label>
          <Input
            id={ids.email}
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="tu@empresa.mx"
            value={values.email}
            onChange={(e) => setField("email", e.target.value)}
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={describedBy("email")}
            className={cn(errors.email && invalidClass)}
          />
          {fieldError("email")}
        </div>

        <div className="space-y-2">
          <Label htmlFor={ids.password}>Contraseña</Label>
          <div className="relative">
            <Input
              id={ids.password}
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              value={values.password}
              onChange={(e) => setField("password", e.target.value)}
              aria-invalid={errors.password ? true : undefined}
              aria-describedby={describedBy("password", passwordHintId)}
              className={cn("pr-11", errors.password && invalidClass)}
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
          <p id={passwordHintId} className="text-xs text-muted-foreground">
            Mínimo {MIN_PASSWORD} caracteres
          </p>
          {fieldError("password")}
        </div>

        <div className="space-y-2">
          <Label htmlFor={ids.confirm}>Confirmar contraseña</Label>
          <Input
            id={ids.confirm}
            name="confirm"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            value={values.confirm}
            onChange={(e) => setField("confirm", e.target.value)}
            aria-invalid={errors.confirm ? true : undefined}
            aria-describedby={describedBy("confirm")}
            className={cn(errors.confirm && invalidClass)}
          />
          {fieldError("confirm")}
        </div>

        <div className="space-y-2">
          <div className="flex items-start gap-2 text-sm">
            <input
              id={ids.privacy}
              name="privacy"
              type="checkbox"
              checked={values.privacy}
              onChange={(e) => setField("privacy", e.target.checked)}
              aria-invalid={errors.privacy ? true : undefined}
              aria-describedby={describedBy("privacy")}
              className="mt-0.5 h-4 w-4 shrink-0 rounded accent-yellow-400"
              required
            />
            <label htmlFor={ids.privacy} className="cursor-pointer leading-snug select-none">
              Acepto el{" "}
              <Link
                href="/privacidad"
                className={cn(linkClass, linkDisabled)}
                aria-disabled={pending || undefined}
                tabIndex={pending ? -1 : undefined}
              >
                aviso de privacidad
              </Link>
            </label>
          </div>
          {fieldError("privacy")}
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
            Creando cuenta…
          </>
        ) : (
          "Crear cuenta"
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
            {SUPABASE ? "Cuenta creada. Abriendo tu panel…" : "Cuenta creada (demo)."}
          </p>
        )}
      </div>

      <p className="text-center text-sm text-muted-foreground">
        ¿Ya tienes cuenta?{" "}
        <Link
          href="/login"
          className={cn(linkClass, linkDisabled)}
          aria-disabled={pending || undefined}
          tabIndex={pending ? -1 : undefined}
        >
          Entrar
        </Link>
      </p>
    </form>
  );
}
