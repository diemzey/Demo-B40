"use client";

import { MailCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, type FormEvent, type Ref } from "react";

import { useReportBusy } from "@/components/auth/auth-busy";
import {
  BotonEnviar,
  CampoContrasena,
  CampoTexto,
  EnlaceInactivable,
  ErrorCampo,
  EstadoEnvio,
} from "@/components/auth/form-partes";
import { DEMO_USER, useSession } from "@/components/auth/session";
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
const MENSAJE_EXITO = SUPABASE ? "Cuenta creada. Abriendo tu panel…" : "Cuenta creada (demo).";

const LINK_CLASS =
  "font-medium text-amber-400 underline-offset-4 hover:underline focus-visible:underline focus-visible:outline-none";

type Field =
  | "nombre"
  | "apellido"
  | "empresa"
  | "email"
  | "password"
  | "confirm"
  | "privacy";
type Errors = Partial<Record<Field, string>>;
// `verificar`: la cuenta se creó pero falta confirmar el correo.
type Status = "idle" | "pending" | "success" | "verificar";
type Reenvio = "idle" | "pending" | "ok" | "error";

type Values = {
  nombre: string;
  apellido: string;
  empresa: string;
  email: string;
  password: string;
  confirm: string;
  privacy: boolean;
};

const INITIAL: Values = {
  nombre: "",
  apellido: "",
  empresa: "",
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
  "email",
  "password",
  "confirm",
  "privacy",
];

/** `id` de cada campo a partir del prefijo de `useId`. */
function idsDe(prefijo: string): Record<Field, string> {
  return {
    nombre: `${prefijo}-nombre`,
    apellido: `${prefijo}-apellido`,
    empresa: `${prefijo}-empresa`,
    email: `${prefijo}-email`,
    password: `${prefijo}-password`,
    confirm: `${prefijo}-confirm`,
    privacy: `${prefijo}-privacy`,
  };
}

function validate(v: Values): Errors {
  const errors: Errors = {};
  if (!v.nombre.trim()) errors.nombre = "Escribe tu nombre.";
  if (!v.apellido.trim()) errors.apellido = "Escribe tu apellido.";
  if (!v.empresa.trim()) errors.empresa = "Escribe el nombre de tu empresa.";
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

/** Enlace "Reenviar" y su resultado (sólo con Supabase). */
function ReenviarEnlace({ reenvio, onReenviar }: { reenvio: Reenvio; onReenviar: () => void }) {
  if (reenvio === "ok") return <span className="text-emerald-400">Enlace reenviado.</span>;
  if (reenvio === "error") {
    return <span className="text-destructive">No se pudo reenviar; inténtalo en un minuto.</span>;
  }
  return (
    <>
      ¿No llegó?{" "}
      <button
        type="button"
        onClick={onReenviar}
        disabled={reenvio === "pending"}
        className={LINK_CLASS}
      >
        {reenvio === "pending" ? "Reenviando…" : "Reenviar enlace"}
      </button>
    </>
  );
}

/**
 * Estado final cuando Supabase exige confirmar el correo: sustituye al
 * formulario para que el siguiente paso quede claro.
 */
function RevisaTuCorreo({
  ref,
  email,
  reenvio,
  onVolver,
  onReenviar,
}: {
  /** Recibe el foco al aparecer (lo gestiona el formulario). */
  ref: Ref<HTMLDivElement>;
  email: string;
  reenvio: Reenvio;
  onVolver: () => void;
  onReenviar: () => void;
}) {
  return (
    <div ref={ref} tabIndex={-1} role="status" aria-live="polite" className="space-y-5 outline-none">
      <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-4 py-4 text-sm">
        <div className="flex items-start gap-3">
          <MailCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" aria-hidden="true" />
          <div className="space-y-1">
            <p className="font-semibold text-emerald-400">Revisa tu correo</p>
            <p className="text-foreground/90">
              Enviamos un enlace de confirmación a{" "}
              <span className="font-medium break-all text-foreground">{email}</span>
              . Al abrirlo entras directo a tu panel.
            </p>
            <p className="text-muted-foreground">
              Si no lo ves en unos minutos, revisa la carpeta de spam.
            </p>
          </div>
        </div>
      </div>

      <p className="text-center text-sm text-muted-foreground">
        ¿Te equivocaste de correo?{" "}
        <button type="button" onClick={onVolver} className={LINK_CLASS}>
          Volver al formulario
        </button>
        {" · "}
        <Link href="/login" className={LINK_CLASS}>
          Ya tengo cuenta
        </Link>
      </p>
      {SUPABASE && (
        <p className="text-center text-sm text-muted-foreground">
          <ReenviarEnlace reenvio={reenvio} onReenviar={onReenviar} />
        </p>
      )}
    </div>
  );
}

/** Casilla "Acepto el aviso de privacidad" con su enlace y su error. */
function CampoPrivacidad({
  id,
  checked,
  onChange,
  error,
  pending,
}: {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  error?: string;
  pending: boolean;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-start gap-2 text-sm">
        <input
          id={id}
          name="privacy"
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className="mt-0.5 h-4 w-4 shrink-0 rounded accent-yellow-400"
          required
        />
        <label htmlFor={id} className="cursor-pointer leading-snug select-none">
          Acepto el{" "}
          <EnlaceInactivable href="/privacidad" inactivo={pending} className={LINK_CLASS}>
            aviso de privacidad
          </EnlaceInactivable>
        </label>
      </div>
      <ErrorCampo campoId={id} mensaje={error} />
    </div>
  );
}

export function RegisterForm() {
  const ids = idsDe(useId());

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
  const [reenvio, setReenvio] = useState<Reenvio>("idle");

  async function reenviarConfirmacion() {
    if (!SUPABASE || reenvio === "pending") return;
    setReenvio("pending");
    const supabase = createClient();
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: values.email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/confirm?next=/dashboard` },
    });
    if (!mountedRef.current) return;
    setReenvio(error ? "error" : "ok");
  }

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
        // crea el perfil, la empresa y el hub "Principal"; las sucursales se
        // dan de alta después desde el panel o el CSV.
        data: {
          nombre: v.nombre.trim(),
          apellido: v.apellido.trim(),
          empresa: v.empresa.trim(),
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
        sucursal: "",
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

  if (status === "verificar") {
    return (
      <RevisaTuCorreo
        ref={verificarRef}
        email={values.email.trim()}
        reenvio={reenvio}
        onVolver={() => setStatus("idle")}
        onReenviar={reenviarConfirmacion}
      />
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
          <CampoTexto
            id={ids.nombre}
            etiqueta="Nombre"
            name="nombre"
            type="text"
            autoComplete="given-name"
            value={values.nombre}
            onChange={(e) => setField("nombre", e.target.value)}
            error={errors.nombre}
          />
          <CampoTexto
            id={ids.apellido}
            etiqueta="Apellido"
            name="apellido"
            type="text"
            autoComplete="family-name"
            value={values.apellido}
            onChange={(e) => setField("apellido", e.target.value)}
            error={errors.apellido}
          />
        </div>

        <CampoTexto
          id={ids.empresa}
          etiqueta="Empresa"
          name="empresa"
          type="text"
          autoComplete="organization"
          value={values.empresa}
          onChange={(e) => setField("empresa", e.target.value)}
          error={errors.empresa}
        />

        <CampoTexto
          id={ids.email}
          etiqueta="Correo de trabajo"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="tu@empresa.mx"
          value={values.email}
          onChange={(e) => setField("email", e.target.value)}
          error={errors.email}
        />

        <div className="space-y-2">
          <Label htmlFor={ids.password}>Contraseña</Label>
          <CampoContrasena
            id={ids.password}
            name="password"
            autoComplete="new-password"
            value={values.password}
            onChange={(e) => setField("password", e.target.value)}
            error={errors.password}
            pistaId={passwordHintId}
            visible={showPassword}
            onAlternar={() => setShowPassword((v) => !v)}
          />
          <p id={passwordHintId} className="text-xs text-muted-foreground">
            Mínimo {MIN_PASSWORD} caracteres
          </p>
          <ErrorCampo campoId={ids.password} mensaje={errors.password} />
        </div>

        <CampoTexto
          id={ids.confirm}
          etiqueta="Confirmar contraseña"
          name="confirm"
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          value={values.confirm}
          onChange={(e) => setField("confirm", e.target.value)}
          error={errors.confirm}
        />

        <CampoPrivacidad
          id={ids.privacy}
          checked={values.privacy}
          onChange={(checked) => setField("privacy", checked)}
          error={errors.privacy}
          pending={pending}
        />
      </fieldset>

      <BotonEnviar pending={pending} etiqueta="Crear cuenta" etiquetaPendiente="Creando cuenta…" />

      <EstadoEnvio error={formError} exito={status === "success" ? MENSAJE_EXITO : null} />

      <p className="text-center text-sm text-muted-foreground">
        ¿Ya tienes cuenta?{" "}
        <EnlaceInactivable href="/login" inactivo={pending} className={LINK_CLASS}>
          Entrar
        </EnlaceInactivable>
      </p>
    </form>
  );
}
