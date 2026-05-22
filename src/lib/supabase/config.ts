/** Shared copy for missing Supabase env — safe to import from client or server. */

export const SUPABASE_NOT_CONFIGURED_ERROR = `Supabase is not configured.
Create a .env.local file in the project root and add:

NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

Then restart the dev server.`;

export const SUPABASE_FEATURE_FALLBACK =
  "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local to enable saving projects.";

export class SupabaseConfigError extends Error {
  constructor() {
    super(SUPABASE_NOT_CONFIGURED_ERROR);
    this.name = "SupabaseConfigError";
  }
}

export function hasSupabasePublicEnv(
  url: string | undefined,
  anonKey: string | undefined,
): boolean {
  return Boolean(url?.trim() && anonKey?.trim());
}
