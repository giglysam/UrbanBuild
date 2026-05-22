import { createClient as createSupabaseJs } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { getServerEnv, isSupabaseConfigured } from "@/env/server";
import { hasSupabasePublicEnv, SupabaseConfigError } from "@/lib/supabase/config";

export { isSupabaseConfigured };

export async function createClient() {
  const env = getServerEnv();
  if (!hasSupabasePublicEnv(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY)) {
    throw new SupabaseConfigError();
  }
  const cookieStore = await cookies();

  return createServerClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
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
          /* Server Component — ignore if read-only */
        }
      },
    },
  });
}

/** Service role client for admin operations (bypass RLS). Use only in trusted server routes. */
export function createServiceRoleClient() {
  const env = getServerEnv();
  if (!hasSupabasePublicEnv(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)) {
    throw new Error("Service role Supabase client requires SUPABASE_SERVICE_ROLE_KEY");
  }
  return createSupabaseJs(env.NEXT_PUBLIC_SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
