/**
 * PLACEHOLDER — replace with generated types.
 *
 * Once the schema under `supabase/migrations/` is applied, regenerate this file
 * (it must stay at this path so the clients keep importing `Database`):
 *
 *   npx supabase gen types typescript --project-id <ref> --schema public > src/lib/supabase/database.types.ts
 *
 * The shape below is the minimal structure supabase-js accepts for its
 * `Database` generic (see `GenericSchema` in @supabase/postgrest-js): an empty
 * `public` schema, so `supabase.from("...")` compiles but is untyped until the
 * real types land.
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: Record<string, never>;
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
