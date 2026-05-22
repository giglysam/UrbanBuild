import { z } from "zod";

/** Learned + user-edited planner preferences (stored in `user_preferences.prefs`). */
export const plannerUserProfileSchema = z.object({
  summary: z.string().max(2000).optional(),
  designTastes: z.array(z.string().max(120)).max(24).optional(),
  materialPreferences: z.array(z.string().max(120)).max(24).optional(),
  interventionPreferences: z.array(z.string().max(120)).max(16).optional(),
  communicationStyle: z.string().max(200).optional(),
  avoidances: z.array(z.string().max(200)).max(16).optional(),
  notesFromUser: z.array(z.string().max(500)).max(24).optional(),
  lastUpdatedAt: z.string().datetime().optional(),
});
export type PlannerUserProfile = z.infer<typeof plannerUserProfileSchema>;

export const userPreferencesSchema = z.object({
  plannerProfile: plannerUserProfileSchema.optional(),
});
export type UserPreferences = z.infer<typeof userPreferencesSchema>;

export const profileDeltaSchema = z.object({
  summaryDelta: z.string().max(800).optional(),
  addDesignTastes: z.array(z.string().max(120)).max(6).optional(),
  addMaterialPreferences: z.array(z.string().max(120)).max(6).optional(),
  addInterventionPreferences: z.array(z.string().max(120)).max(4).optional(),
  addAvoidances: z.array(z.string().max(200)).max(4).optional(),
  addNotesFromUser: z.array(z.string().max(500)).max(4).optional(),
  communicationStyle: z.string().max(200).optional(),
});
export type ProfileDelta = z.infer<typeof profileDeltaSchema>;

export const patchUserProfileSchema = z.object({
  plannerProfile: plannerUserProfileSchema.partial(),
});
export type PatchUserProfile = z.infer<typeof patchUserProfileSchema>;
