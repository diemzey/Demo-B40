import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

import { rutaSegura } from "@/lib/supabase/auth";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

/**
 * Destino de los enlaces de confirmación de correo (y de recuperación).
 *
 * Acepta las dos formas en que Supabase puede llamar de vuelta:
 * - `?token_hash=…&type=…` — plantilla de correo personalizada con
 *   `{{ .TokenHash }}` (recomendado por Supabase para SSR); se verifica con
 *   `auth.verifyOtp`.
 * - `?code=…` — flujo PKCE por defecto de `@supabase/ssr` cuando la plantilla
 *   usa `{{ .ConfirmationURL }}`; se canjea con `exchangeCodeForSession`.
 *
 * En ambos casos el cliente de servidor escribe la cookie de sesión y
 * redirigimos a `next` (validado) o a `/login?error=confirmacion`.
 */
const TIPOS_VALIDOS: ReadonlySet<string> = new Set([
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
]);

const DESTINO_DEFAULT = "/dashboard";

/**
 * Destino final tras confirmar: `next` viene de la URL (lo controla quien
 * arma el enlace), así que sólo se acepta una ruta interna relativa: empieza
 * con "/" y no con "//", ni contiene "://" ni "\\". Se resuelve contra el
 * origen de la petición y se exige que siga en ese mismo origen; cualquier
 * otra cosa cae a `/dashboard`.
 */
function destinoInterno(request: NextRequest): URL {
  // Se resuelve contra `request.url` (igual que antes) y se compara el origen.
  const origen = new URL(request.url).origin;
  const porDefecto = new URL(DESTINO_DEFAULT, request.url);
  const next = rutaSegura(request.nextUrl.searchParams.get("next"), DESTINO_DEFAULT);
  if (!next.startsWith("/") || next.startsWith("//") || next.includes("://") || next.includes("\\")) {
    return porDefecto;
  }
  try {
    const url = new URL(next, request.url);
    return url.origin === origen ? url : porDefecto;
  } catch {
    return porDefecto;
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const next = destinoInterno(request);

  const irA = (pathname: string, params?: Record<string, string>) => {
    const url = request.nextUrl.clone();
    url.pathname = pathname;
    url.search = "";
    url.hash = "";
    Object.entries(params ?? {}).forEach(([k, v]) => url.searchParams.set(k, v));
    return NextResponse.redirect(url);
  };

  if (!hasSupabaseEnv()) {
    // Modo demo: no hay nada que confirmar.
    return irA("/login");
  }

  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const code = searchParams.get("code");

  try {
    const supabase = await createClient();

    if (tokenHash && type && TIPOS_VALIDOS.has(type)) {
      const { error } = await supabase.auth.verifyOtp({
        type: type as EmailOtpType,
        token_hash: tokenHash,
      });
      if (!error) return NextResponse.redirect(next);
    } else if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) return NextResponse.redirect(next);
    }
  } catch {
    // Cae al redirect de error de abajo.
  }

  return irA("/login", { error: "confirmacion" });
}
