import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "./database.types";
import { getSupabaseEnv } from "./env";

/** Routes that require a signed-in user. `/dashboard` and everything under it. */
const PROTECTED_PREFIXES = ["/dashboard"];
/** Routes a signed-in user should not see; they are sent to `/dashboard`. */
const AUTH_PAGES = ["/login", "/registro"];

function matchesPrefix(pathname: string, prefixes: string[]) {
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/**
 * Refreshes the Supabase session on every request and enforces the route
 * rules above. Called from `src/proxy.ts`.
 *
 * - Demo mode (no env vars): passes the request through untouched.
 * - Refreshed auth cookies are written to both the forwarded request (so
 *   Server Components see the new token) and the outgoing response (so the
 *   browser stores it), following the official @supabase/ssr pattern.
 * - Unauthenticated + protected route -> `/login?next=<path>`.
 * - Authenticated + auth page       -> `/dashboard`.
 *
 * Proxy is a first line of defence only: Server Components, Server Actions and
 * Route Handlers must still check `supabase.auth.getUser()` themselves.
 */
export async function updateSession(request: NextRequest) {
  const env = getSupabaseEnv();
  if (!env) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(env.url, env.key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
        // Cache-Control/Expires/Pragma: a response that sets auth cookies must
        // never be cached by a CDN, or one user's token could reach another.
        Object.entries(headers ?? {}).forEach(([key, value]) =>
          supabaseResponse.headers.set(key, value),
        );
      },
    },
  });

  // IMPORTANT: do not run other code between createServerClient and
  // auth.getUser(); it can make sessions drop unexpectedly. getUser() (unlike
  // getSession()) validates the token against Supabase Auth.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, search } = request.nextUrl;

  // Peticiones del router de Next (carga de un segmento RSC al navegar o al
  // hacer prefetch): nunca se redirigen. Una redirección aquí hace que el
  // cliente abandone la navegación (se pierde el #hash de la pestaña) y, si
  // el usuario sí tiene sesión pero el token se estaba renovando, lo manda a
  // /login y de vuelta. La página protegida decide por sí misma qué mostrar
  // sin usuario; la redirección se aplica sólo a navegaciones completas.
  const esPeticionRouter =
    request.headers.get("rsc") === "1" || request.headers.get("next-router-prefetch") === "1";
  if (esPeticionRouter) {
    return supabaseResponse;
  }

  if (!user && matchesPrefix(pathname, PROTECTED_PREFIXES)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", `${pathname}${search}`);
    return redirectKeepingCookies(url, supabaseResponse);
  }

  if (user && matchesPrefix(pathname, AUTH_PAGES)) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return redirectKeepingCookies(url, supabaseResponse);
  }

  return supabaseResponse;
}

/**
 * Builds a redirect that carries over any auth cookies the refresh just set, so
 * a token rotated during this request is not lost on the way to the new page.
 */
function redirectKeepingCookies(url: URL, from: NextResponse) {
  const redirect = NextResponse.redirect(url);
  from.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  from.headers.forEach((value, key) => {
    if (/^(cache-control|expires|pragma)$/i.test(key)) {
      redirect.headers.set(key, value);
    }
  });
  return redirect;
}
