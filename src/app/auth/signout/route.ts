import { NextResponse, type NextRequest } from "next/server";

import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

/**
 * Cierre de sesión desde el servidor: `<form method="post" action="/auth/signout">`.
 *
 * El menú de perfil cierra sesión desde el cliente (`useSession().signOut`);
 * este handler es la alternativa sin JavaScript y limpia la cookie aunque el
 * cliente del navegador no esté disponible. Solo POST: un GET podría
 * dispararse desde un enlace de terceros (CSRF).
 */
export async function POST(request: NextRequest) {
  if (hasSupabaseEnv()) {
    try {
      const supabase = await createClient();
      await supabase.auth.signOut();
    } catch {
      // Sin sesión válida no hay nada que limpiar.
    }
  }
  const url = request.nextUrl.clone();
  url.pathname = "/";
  url.search = "";
  url.hash = "";
  // 303 para que el navegador siga con GET tras el POST.
  return NextResponse.redirect(url, { status: 303 });
}
