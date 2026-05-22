import { z } from "zod";

import { siteBufferMetricsSchema } from "@/lib/geo/site-buffer-metrics";
import { beirutUrbanLabContextSchema } from "@/lib/types/beirut-urban-lab";

/** Qualitative tiers used across site analysis dimensions. */
export const qualitativeTierSchema = z.enum(["low", "medium", "high", "unknown"]);
export type QualitativeTier = z.infer<typeof qualitativeTierSchema>;

/** Built density and residential sensitivity (low / medium / high). */
export const densityTierSchema = z.enum(["low", "medium", "high"]);
export type DensityTier = z.infer<typeof densityTierSchema>;

/** Mobility, parking, and green-space access (weak / moderate / strong). */
export const accessStrengthSchema = z.enum(["weak", "moderate", "strong"]);
export type AccessStrength = z.infer<typeof accessStrengthSchema>;

/** Derived qualitative ratings from buffer metrics (deterministic). */
export const siteQualitativeRatingsSchema = z.object({
  builtDensity: densityTierSchema,
  mobilityAccess: accessStrengthSchema,
  residentialSensitivity: densityTierSchema,
  parkingAvailability: accessStrengthSchema,
  greenSpaceAccess: accessStrengthSchema,
});
export type SiteQualitativeRatings = z.infer<typeof siteQualitativeRatingsSchema>;

export const dataConfidenceOverallSchema = z.enum(["low", "medium", "high"]);
export type DataConfidenceOverall = z.infer<typeof dataConfidenceOverallSchema>;

export const zoningConfidenceSchema = z.enum(["unknown", "low", "medium", "high"]);
export type ZoningConfidence = z.infer<typeof zoningConfidenceSchema>;

export const feasibilityVerdictSchema = z.enum([
  "likely_suitable",
  "conditionally_suitable",
  "risky",
  "likely_unsuitable",
]);
export type FeasibilityVerdict = z.infer<typeof feasibilityVerdictSchema>;

/** Professional proceed / caution guidance (rule-based; narrative may echo in chat). */
export const finalRecommendationSchema = z.enum([
  "proceed",
  "proceed_with_caution",
  "redesign_reduce_scope",
  "choose_another_site",
  "conduct_studies_first",
  "insufficient_data",
]);
export type FinalRecommendation = z.infer<typeof finalRecommendationSchema>;

/** Supported project typologies for site-specific feasibility. */
export const projectTypeIdSchema = z.enum([
  "football_stadium",
  "public_park",
  "residential_building",
  "mixed_use_development",
  "school",
  "hospital",
  "mall",
  "community_center",
  "public_square",
  "sports_complex",
  "custom",
]);
export type ProjectTypeId = z.infer<typeof projectTypeIdSchema>;

export const PROJECT_TYPE_LABELS: Record<ProjectTypeId, string> = {
  football_stadium: "Football stadium",
  public_park: "Public park",
  residential_building: "Residential building",
  mixed_use_development: "Mixed-use development",
  school: "School",
  hospital: "Hospital",
  mall: "Mall / retail center",
  community_center: "Community center",
  public_square: "Public square",
  sports_complex: "Sports complex",
  custom: "Custom project",
};

export const siteAnalysisLocationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  city: z.string().max(200).optional(),
  neighborhood: z.string().max(200).optional(),
  studyRadiusMeters: z.number().min(50).max(2000),
});
export type SiteAnalysisLocation = z.infer<typeof siteAnalysisLocationSchema>;

export const siteDataConfidenceSchema = z.object({
  overall: dataConfidenceOverallSchema,
  knownData: z.array(z.string().max(300)).max(40),
  missingData: z.array(z.string().max(300)).max(40),
  warnings: z.array(z.string().max(500)).max(20),
});
export type SiteDataConfidence = z.infer<typeof siteDataConfidenceSchema>;

export const builtEnvironmentSchema = z.object({
  buildingCount: z.number().nonnegative().optional(),
  builtDensity: qualitativeTierSchema.optional(),
  approximateBuiltCoverage: z.number().min(0).max(100).optional(),
  vacantLandEstimate: qualitativeTierSchema.optional(),
  parcelFragmentation: qualitativeTierSchema.optional(),
  heritageSensitivity: qualitativeTierSchema.optional(),
});
export type BuiltEnvironment = z.infer<typeof builtEnvironmentSchema>;

export const landUseAndZoningSchema = z.object({
  dominantLandUses: z.array(z.string().max(120)).max(20).optional(),
  zoningCode: z.string().max(120).optional(),
  permittedUses: z.array(z.string().max(120)).max(20).optional(),
  conditionalUses: z.array(z.string().max(120)).max(20).optional(),
  prohibitedUses: z.array(z.string().max(120)).max(20).optional(),
  maxHeight: z.number().nonnegative().optional(),
  far: z.number().nonnegative().optional(),
  setbacks: z.string().max(500).optional(),
  zoningConfidence: zoningConfidenceSchema,
});
export type LandUseAndZoning = z.infer<typeof landUseAndZoningSchema>;

export const mobilitySchema = z.object({
  nearestMajorRoadDistanceMeters: z.number().nonnegative().optional(),
  roadAccessScore: z.number().min(0).max(100).optional(),
  publicTransportScore: z.number().min(0).max(100).optional(),
  pedestrianConnectivityScore: z.number().min(0).max(100).optional(),
  parkingScore: z.number().min(0).max(100).optional(),
  emergencyAccessScore: z.number().min(0).max(100).optional(),
  roadHierarchy: z.array(z.string().max(80)).max(12).optional(),
  accessRisks: z.array(z.string().max(300)).max(12).optional(),
});
export type Mobility = z.infer<typeof mobilitySchema>;

export const environmentSchema = z.object({
  greenSpaceWithinRadius: z.number().nonnegative().optional(),
  treeCoverEstimate: qualitativeTierSchema.optional(),
  slopeRisk: qualitativeTierSchema.optional(),
  floodRisk: qualitativeTierSchema.optional(),
  noiseSensitivity: qualitativeTierSchema.optional(),
  heatIslandRisk: qualitativeTierSchema.optional(),
});
export type Environment = z.infer<typeof environmentSchema>;

export const sensitiveReceptorsSchema = z.object({
  schoolsCount: z.number().nonnegative().optional(),
  hospitalsCount: z.number().nonnegative().optional(),
  religiousBuildingsCount: z.number().nonnegative().optional(),
  residentialSensitivity: qualitativeTierSchema.optional(),
  publicInstitutionsCount: z.number().nonnegative().optional(),
  parksCount: z.number().nonnegative().optional(),
  securitySensitiveUses: z.array(z.string().max(120)).max(12).optional(),
});
export type SensitiveReceptors = z.infer<typeof sensitiveReceptorsSchema>;

export const projectFeasibilitySchema = z.object({
  projectType: projectTypeIdSchema,
  projectTypeLabel: z.string().max(200),
  customProjectDescription: z.string().max(500).optional(),
  verdict: feasibilityVerdictSchema,
  feasibilityScore: z.number().min(0).max(100),
  scoreRationale: z.string().max(2000),
  siteOpportunities: z.array(z.string().max(500)).max(12),
  siteConstraints: z.array(z.string().max(500)).max(12),
  projectRisks: z.array(z.string().max(500)).max(12),
  missingData: z.array(z.string().max(300)).max(12),
  requiredStudies: z.array(z.string().max(300)).max(12),
  alternativeRecommendations: z.array(z.string().max(500)).max(8),
  finalRecommendation: finalRecommendationSchema.optional(),
  planningBrief: z.string().max(12000),
});
export type ProjectFeasibility = z.infer<typeof projectFeasibilitySchema>;

/** GIS-backed structured site analysis — canonical ground truth for AI and reports. */
export const structuredSiteAnalysisSchema = z.object({
  location: siteAnalysisLocationSchema,
  /** OSM counts inside studyRadiusMeters (default 400 m). */
  bufferMetrics: siteBufferMetricsSchema.optional(),
  /** Derived tiers from OSM metrics (builtDensity, mobilityAccess, etc.). */
  qualitativeRatings: siteQualitativeRatingsSchema.optional(),
  dataConfidence: siteDataConfidenceSchema,
  builtEnvironment: builtEnvironmentSchema,
  landUseAndZoning: landUseAndZoningSchema,
  mobility: mobilitySchema,
  environment: environmentSchema,
  sensitiveReceptors: sensitiveReceptorsSchema,
  projectFeasibility: projectFeasibilitySchema.optional(),
  /** Beirut Urban Lab / BBED 2024 (ArcGIS hub — surveyed built environment). */
  beirutUrbanLab: beirutUrbanLabContextSchema.optional(),
  /** ISO timestamp when this object was assembled. */
  generatedAt: z.string().datetime().optional(),
});
export type StructuredSiteAnalysis = z.infer<typeof structuredSiteAnalysisSchema>;

export { siteBufferMetricsSchema, type SiteBufferMetrics } from "@/lib/geo/site-buffer-metrics";

/** Canonical GIS-backed site analysis (alias for product docs). */
export type SiteAnalysis = StructuredSiteAnalysis;

export const feasibilityStudyRequestSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  radiusM: z.number().min(50).max(2000).default(400),
  projectType: projectTypeIdSchema.optional(),
  customProjectDescription: z.string().max(500).optional(),
  placeLabel: z.string().max(500).optional(),
  city: z.string().max(200).optional(),
  neighborhood: z.string().max(200).optional(),
});
export type FeasibilityStudyRequest = z.infer<typeof feasibilityStudyRequestSchema>;
