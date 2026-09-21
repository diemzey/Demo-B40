import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./database.types";
import { requireSupabaseEnv } from "./env";

/**
 * Supabase client for Server Components, Server Actions and Route Handlers.
 *
 * Create a new client per request (never cache it in a module variable): it
 * is bound to the request's cookie store, which `cookies()` returns
 * asynchronously in Next 16.
 *
 * Throws in demo mode — guard with `hasSupabaseEnv()` from `./env` first.
 */
export async function createClient() {
  const { url, key } = requireSupabaseEnv();
  const cookieStore = await cookies();

  return createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // `cookies().set()` throws inside Server Components (cookies can only
          // be written from Server Actions / Route Handlers). That is fine:
          // the proxy (`src/proxy.ts`) already refreshed the session cookies
          // for this request, so there is nothing to persist here.
        }
      },
    },
  });
}
