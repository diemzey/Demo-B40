# Supabase client layer

Thin wrappers around `@supabase/ssr` for the Next 16 App Router. Everything is typed with `Database` from `database.types.ts` (a placeholder until types are generated from `supabase/migrations/`).

| Where your code runs | Import | Notes |
| --- | --- | --- |
| Server Components, Server Actions, Route Handlers | `import { createClient } from "@/lib/supabase/server"` | `await createClient()` — async because Next 16's `cookies()` is async. Create one per request, never cache it. |
| Client Components / browser | `import { createClient } from "@/lib/supabase/client"` | Sync, returns a per-tab singleton. |
| Demo-mode check | `import { hasSupabaseEnv } from "@/lib/supabase/env"` | `true` when `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (or the legacy `..._ANON_KEY`) are set. |

Both `createClient()` variants throw a descriptive error when Supabase is not configured, so check `hasSupabaseEnv()` first and fall back to local demo data when it is `false`.

## Route protection (`src/proxy.ts` -> `updateSession()` in `proxy.ts`)

The Next 16 proxy (the renamed `middleware.ts`) refreshes the session cookie on every matched request via `supabase.auth.getUser()`, then:

- not signed in and visiting `/dashboard` or `/dashboard/*` -> redirect to `/login?next=<original path>` (auth forms should honour `next` after a successful sign-in);
- signed in and visiting `/login` or `/registro` -> redirect to `/dashboard`;
- no env vars (demo mode) -> pass through, no redirects.

The proxy is only a first line of defence: server code that reads user data must still call `supabase.auth.getUser()` and handle a `null` user. To change the protected / auth-page lists edit `PROTECTED_PREFIXES` and `AUTH_PAGES` in `proxy.ts`; to change which paths the proxy runs on edit the `matcher` in `src/proxy.ts`.

Env vars live in `.env.local` (git-ignored); see `.env.example` at the repo root.
