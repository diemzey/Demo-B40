"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";
import { requireSupabaseEnv } from "./env";

/**
 * Supabase client for Client Components (`"use client"`) and browser code.
 *
 * `createBrowserClient` returns a per-tab singleton, so calling this on every
 * render is cheap. Sessions are stored in cookies, which is what lets
 * `server.ts` and the proxy read the same session on the server.
 *
 * Throws in demo mode — guard with `hasSupabaseEnv()` from `./env` first.
 */
export function createClient() {
  const { url, key } = requireSupabaseEnv();
  return createBrowserClient<Database>(url, key);
}
