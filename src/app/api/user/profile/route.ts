import { requireUserJson } from "@/lib/api/auth-json";
import { jsonError } from "@/lib/api/http";
import { formatPlannerProfileForPrompt, loadPlannerProfile, savePlannerProfile } from "@/lib/services/user-planner-profile";
import { createClient } from "@/lib/supabase/server";
import { patchUserProfileSchema, plannerUserProfileSchema } from "@/lib/types/user-profile";
import { NextResponse } from "next/server";

export async function GET() {
  const auth = await requireUserJson();
  if (!auth.ok) return auth.response;

  const supabase = await createClient();
  const profile = await loadPlannerProfile(supabase, auth.user.id);
  return NextResponse.json({
    profile,
    promptSummary: formatPlannerProfileForPrompt(profile),
  });
}

export async function PATCH(req: Request) {
  const auth = await requireUserJson();
  if (!auth.ok) return auth.response;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const parsed = patchUserProfileSchema.safeParse(json);
  if (!parsed.success) {
    return jsonError("Invalid request body", 400, parsed.error.flatten());
  }

  const supabase = await createClient();
  const existing = await loadPlannerProfile(supabase, auth.user.id);
  const merged = plannerUserProfileSchema.parse({
    ...existing,
    ...parsed.data.plannerProfile,
    lastUpdatedAt: new Date().toISOString(),
  });

  try {
    await savePlannerProfile(supabase, auth.user.id, merged);
    return NextResponse.json({ profile: merged });
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "Failed to save profile", 500);
  }
}
