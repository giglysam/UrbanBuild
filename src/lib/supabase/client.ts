import { createBrowserClient } from "@supabase/ssr";

import { getClientEnv, isSupabaseConfigured } from "@/env/client";
import { SupabaseConfigError } from "@/lib/supabase/config";

export { isSupabaseConfigured };

export function createClient() {
  if (!isSupabaseConfigured()) {
    throw new SupabaseConfigError();
  }
  const env = getClientEnv();
  return createBrowserClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
}
