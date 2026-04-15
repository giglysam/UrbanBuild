import { z } from "zod";

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
});
export type SiteAnalysis = z.infer<typeof siteAnalysisSchema>;

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
