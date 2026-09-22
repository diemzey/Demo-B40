import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

/**
 * Next 16 Proxy (formerly `middleware.ts`). Runs on the Node.js runtime before
 * every matched request: refreshes the Supabase session cookie and applies the
 * auth redirects defined in `src/lib/supabase/proxy.ts`. No-op in demo mode.
 */
export async function proxy(request: NextRequest) {
  // Si Supabase manda el código de confirmación a la raíz (Site URL sin la
  // ruta de callback), lo canjeamos igual en /auth/confirm.
  const { pathname, searchParams } = request.nextUrl;
  if (pathname === "/" && searchParams.has("code")) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/confirm";
    url.search = "";
    url.searchParams.set("code", searchParams.get("code") ?? "");
    url.searchParams.set("next", "/dashboard");
    return NextResponse.redirect(url);
  }
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Everything except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon / icons / manifest and common static asset extensions
     * Adjust the extension list if you add other asset types to /public.
     */
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png|opengraph-image.png|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|txt|xml|json|woff2?)$).*)",
  ],
};
