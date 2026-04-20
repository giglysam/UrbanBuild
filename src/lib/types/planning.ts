import { z } from "zod";

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

export const siteAnalysisSchema = z.object({
  indicators: siteIndicatorsSchema,
  insights: z.array(planningInsightSchema),
  scenarios: z.array(scenarioSchema),
  planningBrief: z.string(),
  disclaimers: z.array(z.string()),
  /** Five planning modules — present on analyses produced after this schema extension. */
  modules: planningModulesOutputSchema.optional(),
});
export type SiteAnalysis = z.infer<typeof siteAnalysisSchema>;

/** Structured analysis including all five module sections (used for OpenAI parse). */
export const siteAnalysisWithModulesSchema = siteAnalysisSchema.extend({
  modules: planningModulesOutputSchema,
});
export type SiteAnalysisWithModules = z.infer<typeof siteAnalysisWithModulesSchema>;

export const studyRequestSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  radiusM: z.number().min(50).max(2000).default(400),
});
export type StudyRequest = z.infer<typeof studyRequestSchema>;

export const geocodeResultSchema = z.object({
  lat: z.number(),
  lng: z.number(),
  label: z.string(),
  source: z.enum(["mapbox", "nominatim"]),
});
export type GeocodeResult = z.infer<typeof geocodeResultSchema>;
