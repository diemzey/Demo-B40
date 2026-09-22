import type { Metadata } from "next";

import { AuthShell } from "@/components/auth/auth-shell";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata: Metadata = {
  title: "Crear cuenta · Jornada40",
};

export default function RegistroPage() {
  return (
    <AuthShell
      headline="Empieza por tu empresa."
      subline="Crea tu cuenta y sube la primera semana en CSV."
    >
      <div className="rounded-2xl border bg-card p-6 shadow-lg">
        <h1 className="text-2xl font-semibold tracking-tight">Crear cuenta</h1>
        <p className="mt-1 mb-6 text-sm text-muted-foreground">
          Sin tarjeta. Solo lo necesario para subir tu primera semana.
        </p>
        <RegisterForm />
      </div>
    </AuthShell>
  );
}
