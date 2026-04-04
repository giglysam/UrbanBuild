import { z } from "zod";

export const confidenceLevelSchema = z.enum(["high", "medium", "low"]);
export type ConfidenceLevel = z.infer<typeof confidenceLevelSchema>;

export const evidenceKindSchema = z.enum([
  "observed",
  "inferred",
  "speculative",
]);
export type EvidenceKind = z.infer<typeof evidenceKindSchema>;

export const labeledTextSchema = z.object({
  text: z.string(),
  evidence: evidenceKindSchema,
});
export type LabeledText = z.infer<typeof labeledTextSchema>;

export const urbanIndicatorsSchema = z.object({
  studyRadiusM: z.number(),
  roadLengthM: z.number(),
  buildingCount: z.number(),
  intersectionProxy: z.number(),
  amenityCount: z.number(),
  shopCount: z.number(),
  schoolCount: z.number(),
  hospitalCount: z.number(),
  parkLeisureCount: z.number(),
  transitStopCount: z.number(),
  coastlineDistanceM: z.number().nullable(),
  amenityRichness: z.number(),
  connectivityProxy: z.number(),
  urbanIntensityProxy: z.number(),
  mixedUseProxy: z.number(),
  publicSpaceAccessProxy: z.number(),
  environmentalStressProxy: z.number(),
  dataNotes: z.array(z.string()),
});
export type UrbanIndicators = z.infer<typeof urbanIndicatorsSchema>;

export const siteContextSchema = z.object({
  lat: z.number(),
  lng: z.number(),
  label: z.string().optional(),
  siteNotes: z.string().max(4000).optional(),
  radiusM: z.number(),
  indicators: urbanIndicatorsSchema,
  featureSummary: z.object({
    majorRoadsNear: z.number(),
    greenLeisureFeatures: z.number(),
    coastlineInStudy: z.boolean(),
  }),
  rawCounts: z.record(z.string(), z.number()).optional(),
});
export type SiteContext = z.infer<typeof siteContextSchema>;

export const planningScenarioSchema = z.object({
  title: z.string(),
  rationale: z.string(),
  interventions: z.array(z.string()),
  tradeoffs: z.array(z.string()),
  confidence: confidenceLevelSchema,
});
export type PlanningScenario = z.infer<typeof planningScenarioSchema>;

export const fullAnalysisSchema = z.object({
  site_summary: z.string(),
  urban_grain: z.array(labeledTextSchema),
  accessibility_connectivity: z.array(labeledTextSchema),
  nearby_amenities: z.array(labeledTextSchema),
  walkability_proxy: z.array(labeledTextSchema),
  land_use_guess: z.array(labeledTextSchema),
  environmental_exposure: z.array(labeledTextSchema),
  opportunities: z.array(labeledTextSchema),
  risks: z.array(labeledTextSchema),
  recommendations: z.array(labeledTextSchema),
  scenarios: z.array(planningScenarioSchema).min(2).max(4),
  next_studies: z.array(labeledTextSchema),
});
export type FullAnalysis = z.infer<typeof fullAnalysisSchema>;

export const planningBriefSchema = z.object({
  site_identification: z.string(),
  context_summary: z.string(),
  key_indicators: z.array(z.string()),
  main_constraints: z.array(labeledTextSchema),
  main_opportunities: z.array(labeledTextSchema),
  strategic_directions: z.array(labeledTextSchema),
  recommended_next_studies: z.array(labeledTextSchema),
  disclaimer: z.string(),
});
export type PlanningBrief = z.infer<typeof planningBriefSchema>;
