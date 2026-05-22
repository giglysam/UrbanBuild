import {
  plannerUserProfileSchema,
  type PlannerUserProfile,
  type ProfileDelta,
} from "@/lib/types/user-profile";

function mergeUnique(existing: string[] | undefined, add: string[] | undefined, max: number): string[] | undefined {
  if (!add?.length) return existing;
  const set = new Set([...(existing ?? []), ...add.map((s) => s.trim()).filter(Boolean)]);
  const out = [...set].slice(0, max);
  return out.length ? out : existing;
}

export function mergePlannerProfile(
  current: PlannerUserProfile | null | undefined,
  delta: ProfileDelta,
): PlannerUserProfile {
  const base = current ?? {};
  const summary =
    delta.summaryDelta?.trim() ?
      [base.summary, delta.summaryDelta.trim()].filter(Boolean).join(" ").slice(0, 2000)
    : base.summary;

  return plannerUserProfileSchema.parse({
    summary: summary || undefined,
    designTastes: mergeUnique(base.designTastes, delta.addDesignTastes, 24),
    materialPreferences: mergeUnique(base.materialPreferences, delta.addMaterialPreferences, 24),
    interventionPreferences: mergeUnique(base.interventionPreferences, delta.addInterventionPreferences, 16),
    avoidances: mergeUnique(base.avoidances, delta.addAvoidances, 16),
    notesFromUser: mergeUnique(base.notesFromUser, delta.addNotesFromUser, 24),
    communicationStyle: delta.communicationStyle?.trim() || base.communicationStyle,
    lastUpdatedAt: new Date().toISOString(),
  });
}

export function formatPlannerProfileForPrompt(profile: PlannerUserProfile | null | undefined): string | null {
  if (!profile) return null;
  const lines: string[] = [];
  if (profile.summary) lines.push(`Summary: ${profile.summary}`);
  if (profile.designTastes?.length) lines.push(`Design tastes: ${profile.designTastes.join("; ")}`);
  if (profile.materialPreferences?.length) lines.push(`Preferred materials: ${profile.materialPreferences.join("; ")}`);
  if (profile.interventionPreferences?.length) {
    lines.push(`Preferred intervention types: ${profile.interventionPreferences.join("; ")}`);
  }
  if (profile.communicationStyle) lines.push(`Communication style: ${profile.communicationStyle}`);
  if (profile.avoidances?.length) lines.push(`Avoid / dislikes: ${profile.avoidances.join("; ")}`);
  if (profile.notesFromUser?.length) lines.push(`User notes: ${profile.notesFromUser.join("; ")}`);
  if (!lines.length) return null;
  return lines.join("\n");
}
