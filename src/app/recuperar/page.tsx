import type { Metadata } from "next";

import { AuthShell } from "@/components/auth/auth-shell";
import { RecuperarForm } from "@/components/auth/recuperar-form";

export const metadata: Metadata = {
  title: "Recuperar contraseña · Jornada40",
};

export default function RecuperarPage() {
  return (
    <AuthShell
      headline="Recupera tu contraseña."
      subline="Te enviamos un enlace para elegir una contraseña nueva."
    >
      <div className="rounded-2xl border bg-card p-6 shadow-lg">
        <h1 className="text-2xl font-semibold tracking-tight">Recuperar contraseña</h1>
        <p className="mt-1 mb-6 text-sm text-muted-foreground">
          Escribe tu correo de trabajo.
        </p>
        <RecuperarForm />
      </div>
    </AuthShell>
  );
}
