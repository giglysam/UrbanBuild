import "server-only";

import { isSupabaseConfigured } from "@/env/server";
import { getSessionUser } from "@/lib/auth/session";
import { SUPABASE_FEATURE_FALLBACK } from "@/lib/supabase/config";

import { jsonError } from "./http";

export async function requireUserJson() {
  if (!isSupabaseConfigured()) {
    return { ok: false as const, response: jsonError(SUPABASE_FEATURE_FALLBACK, 503) };
  }
  const user = await getSessionUser();
  if (!user) {
    return { ok: false as const, response: jsonError("Unauthorized", 401) };
  }
  return { ok: true as const, user };
}
