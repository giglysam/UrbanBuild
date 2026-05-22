import { z } from "zod";

import { siteBufferMetricsSchema } from "@/lib/geo/site-buffer-metrics";
import {
  feasibilityStudyRequestSchema,
  PROJECT_TYPE_LABELS,
  projectTypeIdSchema,
  structuredSiteAnalysisSchema,
  type FeasibilityStudyRequest,
  type ProjectTypeId,
  type StructuredSiteAnalysis,
} from "@/lib/types/site-feasibility";

export {
  feasibilityStudyRequestSchema,
  projectTypeIdSchema,
  structuredSiteAnalysisSchema,
  PROJECT_TYPE_LABELS,
  type FeasibilityStudyRequest,
  type ProjectTypeId,
  type StructuredSiteAnalysis,
};
export type { ProjectFeasibility, SiteQualitativeRatings } from "@/lib/types/site-feasibility";
export { siteQualitativeRatingsSchema } from "@/lib/types/site-feasibility";

export const budgetLineItemSchema = z.object({
  id: z.string().max(64).optional(),
  category: z.string().min(1).max(200),
  amountUsd: z.number().nonnegative().optional().nullable(),
  priority: z.number().int().min(1).max(5).optional(),
});
export type BudgetLineItem = z.infer<typeof budgetLineItemSchema>;

export const planningRiskFlagsSchema = z.object({
  floodProne: z.boolean().optional(),
  coastal: z.boolean().optional(),
  overcrowding: z.boolean().optional(),
  infrastructureGap: z.boolean().optional(),
});
export type PlanningRiskFlags = z.infer<typeof planningRiskFlagsSchema>;

export const populationPointSchema = z.object({
  year: z.number().int().min(1800).max(2200),
  population: z.number().nonnegative(),
});
export type PopulationPoint = z.infer<typeof populationPointSchema>;

/** Optional fields supplied by planners; stored on `projects.planning_context`. */
export const planningContextSchema = z.object({
  population: z.number().positive().optional().nullable(),
  populationDensityPerHa: z.number().positive().optional().nullable(),
  annualGrowthRatePercent: z.number().optional().nullable(),
  landUseSummary: z.string().max(8000).optional().nullable(),
  zoningNotes: z.string().max(8000).optional().nullable(),
  infrastructureNotes: z.string().max(8000).optional().nullable(),
  budgetTotalUsd: z.number().nonnegative().optional().nullable(),
  budgetLineItems: z.array(budgetLineItemSchema).max(50).optional(),
  riskFlags: planningRiskFlagsSchema.optional(),
  cityChallenges: z.string().max(8000).optional().nullable(),
  populationByYear: z.array(populationPointSchema).max(40).optional(),
});
export type PlanningContext = z.infer<typeof planningContextSchema>;

export const planningModuleIdSchema = z.enum([
  "land_use",
  "traffic_transit",
  "green_space",
  "budget",
  "risk",
  "all",
]);
export type PlanningModuleId = z.infer<typeof planningModuleIdSchema>;

export const landUseModuleOutputSchema = z.object({
  summary: z.string(),
  recommendations: z.array(z.string()),
  zoningOptimizationIdeas: z.array(z.string()),
});
export const trafficTransitModuleOutputSchema = z.object({
  summary: z.string(),
  infrastructureRecommendations: z.array(z.string()),
  transitAndAccessGaps: z.array(z.string()),
});
export const greenSpaceModuleOutputSchema = z.object({
  summary: z.string(),
  parkAndOpenSpaceIdeas: z.array(z.string()),
  sustainabilityInitiatives: z.array(z.string()),
});
export const budgetModuleOutputSchema = z.object({
  summary: z.string(),
  prioritizedSpending: z.array(
    z.object({
      projectOrTheme: z.string(),
      rationale: z.string(),
    }),
  ),
  tradeoffs: z.array(z.string()),
});
export const riskItemOutputSchema = z.object({
  hazard: z.string(),
  severity: z.enum(["low", "medium", "high"]),
  evidence: z.string(),
  mitigation: z.string(),
});
export const riskModuleOutputSchema = z.object({
  summary: z.string(),
  risks: z.array(riskItemOutputSchema),
});

export const planningModulesOutputSchema = z.object({
  landUse: landUseModuleOutputSchema,
  trafficTransit: trafficTransitModuleOutputSchema,
  greenSpace: greenSpaceModuleOutputSchema,
  budget: budgetModuleOutputSchema,
  risk: riskModuleOutputSchema,
});
export type PlanningModulesOutput = z.infer<typeof planningModulesOutputSchema>;

export const confidenceSchema = z.enum(["observed", "inferred", "speculative"]);
export type Confidence = z.infer<typeof confidenceSchema>;

export const planningInsightSchema = z.object({
  title: z.string(),
  body: z.string(),
  confidence: confidenceSchema,
  topics: z.array(z.string()).optional(),
});
export type PlanningInsight = z.infer<typeof planningInsightSchema>;

export const scenarioSchema = z.object({
  name: z.string(),
  summary: z.string(),
  tradeoffs: z.array(z.string()),
  confidence: confidenceSchema,
});
export type Scenario = z.infer<typeof scenarioSchema>;

export const siteIndicatorsSchema = z.record(
  z.string(),
  z.union([z.number(), z.string()]),
);
export type SiteIndicators = z.infer<typeof siteIndicatorsSchema>;

/** Legacy AI narrative output (insights, scenarios, modules). Prefer `StructuredSiteAnalysis` for site grounding. */
export const planningNarrativeSchema = z.object({
  indicators: siteIndicatorsSchema,
  insights: z.array(planningInsightSchema),
  scenarios: z.array(scenarioSchema),
  planningBrief: z.string(),
  disclaimers: z.array(z.string()),
  modules: planningModulesOutputSchema.optional(),
});
export type PlanningNarrative = z.infer<typeof planningNarrativeSchema>;

/** @deprecated Use `PlanningNarrative` — kept for backward-compatible imports. */
export const siteAnalysisSchema = planningNarrativeSchema;
/** @deprecated Use `PlanningNarrative` — kept for backward-compatible imports. */
export type SiteAnalysis = PlanningNarrative;

export const siteAnalysisWithModulesSchema = planningNarrativeSchema.extend({
  modules: planningModulesOutputSchema,
});
export type SiteAnalysisWithModules = z.infer<typeof siteAnalysisWithModulesSchema>;

export const studyRequestSchema = feasibilityStudyRequestSchema;
export type StudyRequest = FeasibilityStudyRequest;

/** Full analysis run payload stored on projects and returned from /api/analyze. */
export const siteAnalysisRunResultSchema = z.object({
  indicators: siteIndicatorsSchema,
  bufferMetrics: siteBufferMetricsSchema.optional(),
  siteAnalysis: structuredSiteAnalysisSchema,
  planningNarrative: planningNarrativeSchema.optional(),
  /** @deprecated Alias of planningNarrative for older clients. */
  analysis: planningNarrativeSchema.optional(),
});
export type SiteAnalysisRunResult = z.infer<typeof siteAnalysisRunResultSchema>;

export const geocodeResultSchema = z.object({
  lat: z.number(),
  lng: z.number(),
  label: z.string(),
  source: z.enum(["mapbox", "nominatim"]),
});
export type GeocodeResult = z.infer<typeof geocodeResultSchema>;

export const mapboxProfileSchema = z.enum(["driving", "walking", "cycling"]);
export type MapboxProfile = z.infer<typeof mapboxProfileSchema>;

export const lngLatSchema = z.object({
  lng: z.number().min(-180).max(180),
  lat: z.number().min(-90).max(90),
});
export type LngLat = z.infer<typeof lngLatSchema>;

export const mapboxPlaceSchema = z.object({
  name: z.string(),
  fullAddress: z.string(),
  point: lngLatSchema,
});
export type MapboxPlace = z.infer<typeof mapboxPlaceSchema>;

export const mapboxRouteSchema = z.object({
  distanceM: z.number().nonnegative(),
  durationS: z.number().nonnegative(),
  profile: mapboxProfileSchema,
  geometry: z.unknown(),
});
export type MapboxRoute = z.infer<typeof mapboxRouteSchema>;

export const mapboxIsochroneSchema = z.object({
  profile: mapboxProfileSchema,
  contourMinutes: z.array(z.number().int().positive()),
  geometry: z.unknown(),
});
export type MapboxIsochrone = z.infer<typeof mapboxIsochroneSchema>;

export const mapboxPoiFeatureSchema = z.object({
  name: z.string().optional(),
  category: z.string().optional(),
  distanceM: z.number().nonnegative().optional(),
  point: lngLatSchema,
});
export type MapboxPoiFeature = z.infer<typeof mapboxPoiFeatureSchema>;

export const mapboxContextBundleSchema = z.object({
  center: lngLatSchema,
  reverseGeocode: mapboxPlaceSchema.optional(),
  searchResults: z.array(mapboxPlaceSchema),
  routeToDestination: mapboxRouteSchema.optional(),
  isochrone: mapboxIsochroneSchema.optional(),
  nearbyPois: z.array(mapboxPoiFeatureSchema),
  textualContext: z.string(),
  sources: z.array(z.string()),
});
export type MapboxContextBundle = z.infer<typeof mapboxContextBundleSchema>;

export const mapboxActionSchema = z.enum([
  "show_route",
  "show_isochrone",
  "show_pois",
  "clear_overlays",
  "set_center",
  "set_style",
]);
export type MapboxAction = z.infer<typeof mapboxActionSchema>;

export const mapboxStyleSchema = z.enum(["streets-v12", "light-v11", "dark-v11", "satellite-streets-v12"]);
export type MapboxStyle = z.infer<typeof mapboxStyleSchema>;

export const mapboxCommandPlanSchema = z.object({
  summary: z.string(),
  actions: z.array(
    z.object({
      type: mapboxActionSchema,
      reason: z.string(),
      profile: mapboxProfileSchema.optional(),
      destination: lngLatSchema.optional(),
      contourMinutes: z.array(z.number().int().positive()).optional(),
      style: mapboxStyleSchema.optional(),
      query: z.string().optional(),
    }),
  ),
  followUpQuestions: z.array(z.string()).max(2).optional(),
});
export type MapboxCommandPlan = z.infer<typeof mapboxCommandPlanSchema>;

export const mapboxSearchSuggestItemSchema = z.object({
  mapboxId: z.string(),
  name: z.string(),
  fullAddress: z.string(),
});
export type MapboxSearchSuggestItem = z.infer<typeof mapboxSearchSuggestItemSchema>;

export const mapboxSearchRetrieveSchema = z.object({
  mapboxId: z.string(),
  name: z.string(),
  fullAddress: z.string(),
  point: lngLatSchema,
});
export type MapboxSearchRetrieve = z.infer<typeof mapboxSearchRetrieveSchema>;

export const mapboxMatrixCellSchema = z.object({
  from: z.number().int().nonnegative(),
  to: z.number().int().nonnegative(),
  distanceM: z.number().nonnegative().nullable(),
  durationS: z.number().nonnegative().nullable(),
});
export type MapboxMatrixCell = z.infer<typeof mapboxMatrixCellSchema>;

/** Urban / architectural intervention category for a design concept. */
export const interventionTypeSchema = z.enum([
  "building",
  "green_space",
  "public_plaza",
  "mixed_use",
  "streetscape",
  "other",
]);
export type InterventionType = z.infer<typeof interventionTypeSchema>;

/** One design direction produced after site diagnosis (2–4 per bundle). */
export const designConceptSchema = z.object({
  id: z.string().min(1).max(64),
  title: z.string().min(1).max(200),
  interventionType: interventionTypeSchema,
  designConcept: z.string().min(1).max(4000),
  program: z.array(z.string().min(1).max(300)).min(1).max(12),
  massingLogic: z.string().min(1).max(2000),
  contextRelationship: z.string().min(1).max(2000),
  materials: z.array(z.string().min(1).max(120)).min(1).max(16),
  facadeOrLandscapeStrategy: z.string().min(1).max(2000),
  sustainabilityFeatures: z.array(z.string().min(1).max(300)).min(1).max(12),
  publicRealmStrategy: z.string().min(1).max(2000),
  siteFitRationale: z.string().min(1).max(2000),
  /** Buildability / subsurface adaptations for this concept. */
  feasibilityAdaptations: z.string().min(1).max(2000),
  /** Detailed prompt for architectural visualization (no text overlays in image). */
  imagePrompt: z.string().min(80).max(4000),
});
export type DesignConcept = z.infer<typeof designConceptSchema>;

/** Structured concept set after site + context + feasibility analysis. */
export const designConceptsBundleSchema = z.object({
  siteDiagnosis: z.string().min(1).max(6000),
  designPriorities: z.array(z.string().min(1).max(500)).min(2).max(8),
  subsurfaceCautions: z.string().min(1).max(3000),
  concepts: z.array(designConceptSchema).min(2).max(4),
});
export type DesignConceptsBundle = z.infer<typeof designConceptsBundleSchema>;

export const designConceptsRequestSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  radiusM: z.number().min(50).max(2000),
  placeLabel: z.string().max(500).optional(),
  indicators: siteIndicatorsSchema,
  siteAnalysis: structuredSiteAnalysisSchema.optional(),
  analysis: planningNarrativeSchema.optional(),
  mapboxContextText: z.string().max(12000).optional(),
});
export type DesignConceptsRequest = z.infer<typeof designConceptsRequestSchema>;

export const conceptImageRequestSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  radiusM: z.number().min(50).max(2000),
  placeLabel: z.string().max(500).optional(),
  concept: designConceptSchema,
  siteDiagnosis: z.string().max(6000).optional(),
  mapboxContextText: z.string().max(12000).optional(),
});
export type ConceptImageRequest = z.infer<typeof conceptImageRequestSchema>;

/** POST /api/generate-image — full site + concept context for OpenAI Images. */
export const generateImageRequestSchema = conceptImageRequestSchema.extend({
  siteAnalysisSummary: z.string().max(8000).optional(),
  indicators: siteIndicatorsSchema.optional(),
});
export type GenerateImageRequest = z.infer<typeof generateImageRequestSchema>;

/** Client/project state for a generated visual (future: persist to Supabase Storage). */
export const generatedConceptImageSchema = z.object({
  conceptId: z.string(),
  imageDataUrl: z.string(),
  generatedAt: z.string().datetime(),
  promptPreview: z.string().max(500).optional(),
  storagePath: z.string().nullable().optional(),
});
export type GeneratedConceptImage = z.infer<typeof generatedConceptImageSchema>;
