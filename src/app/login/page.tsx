import type { Metadata } from "next";

import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Entrar · Jornada40",
};

export default function LoginPage() {
  return (
    <AuthShell
      headline="Tu semana, con el tope encima."
      subline="Entra para ver el diagnóstico de tu sucursal."
    >
      <div className="rounded-2xl border bg-card p-6 shadow-lg">
        <h1 className="text-2xl font-semibold tracking-tight">Entrar</h1>
        <p className="mt-1 mb-6 text-sm text-muted-foreground">
          Usa el correo con el que registraste tu sucursal.
        </p>
        <LoginForm />
      </div>
    </AuthShell>
  );
}
