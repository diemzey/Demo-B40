import type { Metadata } from "next";

import { AuthShell } from "@/components/auth/auth-shell";
import { RestablecerForm } from "@/components/auth/restablecer-form";

export const metadata: Metadata = {
  title: "Nueva contraseña · Jornada40",
};

export default function RestablecerPage() {
  return (
    <AuthShell
      headline="Elige una contraseña nueva."
      subline="Después entrarás directo a tu panel."
    >
      <div className="rounded-2xl border bg-card p-6 shadow-lg">
        <h1 className="text-2xl font-semibold tracking-tight">Nueva contraseña</h1>
        <p className="mt-1 mb-6 text-sm text-muted-foreground">
          Úsala la próxima vez que entres a Jornada40.
        </p>
        <RestablecerForm />
      </div>
    </AuthShell>
  );
}
