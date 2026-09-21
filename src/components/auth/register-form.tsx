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

type Field = "name" | "company" | "email" | "password" | "confirm" | "privacy";
type Errors = Partial<Record<Field, string>>;
type Status = "idle" | "pending" | "success";

type Values = {
  name: string;
  company: string;
  email: string;
  password: string;
  confirm: string;
  privacy: boolean;
};

const INITIAL: Values = {
  name: "",
  company: "",
  email: "",
  password: "",
  confirm: "",
  privacy: false,
};

// Orden de enfoque cuando hay varios errores.
const FIELD_ORDER: Field[] = ["name", "company", "email", "password", "confirm", "privacy"];

function validate(v: Values): Errors {
  const errors: Errors = {};
  if (!v.name.trim()) errors.name = "Escribe tu nombre.";
  if (!v.company.trim()) errors.company = "Escribe el nombre de tu empresa.";
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
    name: `${id}-name`,
    company: `${id}-company`,
    email: `${id}-email`,
    password: `${id}-password`,
    confirm: `${id}-confirm`,
    privacy: `${id}-privacy`,
  } satisfies Record<Field, string>;

  const [values, setValues] = useState<Values>(INITIAL);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<Status>("idle");

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Limpia el temporizador simulado si el componente se desmonta a medias.
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  function setField<K extends Field>(field: K, value: Values[K]) {
    setValues((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "pending") return;

    const nextErrors = validate(values);
    setErrors(nextErrors);
    const firstInvalid = FIELD_ORDER.find((f) => nextErrors[f]);
    if (firstInvalid) {
      // Enfoca el primer campo inválido para que teclado y lector de pantalla
      // aterricen directo en el problema.
      document.getElementById(ids[firstInvalid])?.focus();
      return;
    }

    // DEMO: no existe backend de registro. Simulamos la latencia de una
    // petición y mostramos un mensaje de éxito sin enviar nada a ningún lado.
    setStatus("pending");
    timerRef.current = setTimeout(() => {
      setStatus("success");
    }, FAKE_LATENCY_MS);
  }

  const pending = status === "pending";
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

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor={ids.name}>Nombre</Label>
        <Input
          id={ids.name}
          name="name"
          type="text"
          autoComplete="name"
          value={values.name}
          onChange={(e) => setField("name", e.target.value)}
          aria-invalid={errors.name ? true : undefined}
          aria-describedby={describedBy("name")}
          className={cn(errors.name && invalidClass)}
          disabled={pending}
        />
        {fieldError("name")}
      </div>

      <div className="space-y-2">
        <Label htmlFor={ids.company}>Empresa</Label>
        <Input
          id={ids.company}
          name="company"
          type="text"
          autoComplete="organization"
          value={values.company}
          onChange={(e) => setField("company", e.target.value)}
          aria-invalid={errors.company ? true : undefined}
          aria-describedby={describedBy("company")}
          className={cn(errors.company && invalidClass)}
          disabled={pending}
        />
        {fieldError("company")}
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
          disabled={pending}
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
          disabled={pending}
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
            disabled={pending}
            required
          />
          <label htmlFor={ids.privacy} className="cursor-pointer leading-snug select-none">
            Acepto el{" "}
            <Link
              href="/privacidad"
              className="font-medium text-amber-400 underline-offset-4 hover:underline focus-visible:underline focus-visible:outline-none"
            >
              aviso de privacidad
            </Link>
          </label>
        </div>
        {fieldError("privacy")}
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
            Creando cuenta…
          </>
        ) : (
          "Crear cuenta"
        )}
      </Button>

      {status === "success" && (
        <p
          role="status"
          className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400"
        >
          Cuenta creada (demo).
        </p>
      )}

      <p className="text-center text-sm text-muted-foreground">
        ¿Ya tienes cuenta?{" "}
        <Link
          href="/login"
          className="font-medium text-amber-400 underline-offset-4 hover:underline focus-visible:underline focus-visible:outline-none"
        >
          Entrar
        </Link>
      </p>
    </form>
  );
}
