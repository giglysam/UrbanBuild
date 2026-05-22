import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  plannerUserProfileSchema,
  userPreferencesSchema,
  type PlannerUserProfile,
  type UserPreferences,
} from "@/lib/types/user-profile";

export { mergePlannerProfile, formatPlannerProfileForPrompt } from "@/lib/planning/planner-profile-merge";

export async function loadPlannerProfile(
  supabase: SupabaseClient,
  userId: string,
): Promise<PlannerUserProfile | null> {
  const { data } = await supabase.from("user_preferences").select("prefs").eq("user_id", userId).maybeSingle();
  if (!data?.prefs || typeof data.prefs !== "object") return null;
  const parsed = userPreferencesSchema.safeParse(data.prefs);
  if (!parsed.success || !parsed.data.plannerProfile) return null;
  const profile = plannerUserProfileSchema.safeParse(parsed.data.plannerProfile);
  return profile.success ? profile.data : null;
}

export async function savePlannerProfile(
  supabase: SupabaseClient,
  userId: string,
  profile: PlannerUserProfile,
): Promise<void> {
  const existing = await loadPlannerProfile(supabase, userId);
  const prefs: UserPreferences = {
    plannerProfile: {
      ...existing,
      ...profile,
      lastUpdatedAt: new Date().toISOString(),
    },
  };
  const { error } = await supabase.from("user_preferences").upsert(
    {
      user_id: userId,
      prefs: prefs as unknown as Record<string, unknown>,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) throw new Error(error.message);
}
