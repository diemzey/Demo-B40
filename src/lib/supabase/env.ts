/**
 * Supabase public environment variables.
 *
 * `process.env.NEXT_PUBLIC_*` is referenced literally (not through a dynamic
 * key) so Next.js can inline the values into the browser bundle at build time.
 *
 * Both the new publishable key (`sb_publishable_...`) and the legacy anon key
 * are accepted; the publishable key wins when both are set.
 */
export type SupabaseEnv = { url: string; key: string };

/** The public Supabase config, or `null` when either variable is missing. */
export function getSupabaseEnv(): SupabaseEnv | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return url && key ? { url, key } : null;
}

/**
 * Whether Supabase is configured. When `false` the app runs in "demo mode":
 * the proxy passes every request through, and forms / data access should fall
 * back to local demo data instead of calling `createClient()`.
 */
export function hasSupabaseEnv(): boolean {
  return getSupabaseEnv() !== null;
}

/** Like `getSupabaseEnv()` but throws a descriptive error in demo mode. */
export function requireSupabaseEnv(): SupabaseEnv {
  const env = getSupabaseEnv();
  if (!env) {
    throw new Error(
      "Supabase is not configured: set NEXT_PUBLIC_SUPABASE_URL and " +
        "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local (see .env.example). " +
        "Check hasSupabaseEnv() before creating a client to support demo mode.",
    );
  }
  return env;
}
