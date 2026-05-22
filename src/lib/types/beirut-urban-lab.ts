import { z } from "zod";

/** Beirut Built Environment Database — ArcGIS Online (hub web map). */
export const BBED_FEATURE_SERVER_URL =
  "https://services3.arcgis.com/tuNLpt6Wfhd22qmO/arcgis/rest/services/BBBED_2024_DataSharing/FeatureServer";

export const BEIRUT_URBAN_LAB_HUB_URL =
  "https://beirut-urban-lab-open-data-platform-aub.hub.arcgis.com/";

export const BEIRUT_URBAN_LAB_EXPLORE_APP_URL =
  "https://beirut-urban-lab-open-data-platform-aub.hub.arcgis.com/apps/6f927948e96a4aaa92e065267886b7ac/explore";

export const bbedLayerCountsSchema = z.object({
  buildings: z.number().nonnegative(),
  gardens: z.number().nonnegative(),
  parkingAndEmptyLots: z.number().nonnegative(),
  rivers: z.number().nonnegative(),
  commercialGroundFloor: z.number().nonnegative(),
  solarPanelRooftop: z.number().nonnegative(),
  landmarks: z.number().nonnegative(),
});
export type BbedLayerCounts = z.infer<typeof bbedLayerCountsSchema>;

export const beirutAdminAtPinSchema = z.object({
  mohafaza: z.string().max(200).optional(),
  kadaa: z.string().max(200).optional(),
  cadastralId: z.number().int().optional(),
  cadastralEnglishName: z.string().max(300).optional(),
});
export type BeirutAdminAtPin = z.infer<typeof beirutAdminAtPinSchema>;

export const icilLayerCountsSchema = z.object({
  buildingsPoly: z.number().nonnegative().optional(),
  districtName: z.string().max(200).optional(),
  municipalityName: z.string().max(200).optional(),
});
export type IcilLayerCounts = z.infer<typeof icilLayerCountsSchema>;

/** Authoritative Beirut Urban Lab / BBED context for a study pin. */
export const beirutUrbanLabContextSchema = z.object({
  source: z.literal("Beirut Urban Lab Open Data Platform"),
  hubUrl: z.string().url(),
  exploreAppUrl: z.string().url(),
  featureServerUrl: z.string().url(),
  studyRadiusMeters: z.number().positive(),
  bbed: bbedLayerCountsSchema,
  adminAtPin: beirutAdminAtPinSchema,
  icil: icilLayerCountsSchema.optional(),
  /** Short notes for AI / reports (e.g. OSM vs BBED comparison). */
  notes: z.array(z.string().max(500)).max(12),
  fetchedAt: z.string().datetime(),
});
export type BeirutUrbanLabContext = z.infer<typeof beirutUrbanLabContextSchema>;
