import {
  planningNarrativeSchema,
  siteAnalysisRunResultSchema,
  type PlanningNarrative,
} from "@/lib/types/planning";
import { bufferMetricsFromIndicators } from "@/lib/geo/buffer-metrics-from-indicators";
import { qualitativeRatingsFromBufferMetrics } from "@/lib/geo/qualitative-ratings-from-metrics";
import { beirutUrbanLabContextSchema, type BeirutUrbanLabContext } from "@/lib/types/beirut-urban-lab";
import { siteBufferMetricsSchema, type SiteBufferMetrics } from "@/lib/geo/site-buffer-metrics";
import { structuredSiteAnalysisSchema, type StructuredSiteAnalysis } from "@/lib/types/site-feasibility";

export type ParsedAnalysisRun = {
  indicators: Record<string, number | string>;
  bufferMetrics: SiteBufferMetrics | null;
  beirutUrbanLab: BeirutUrbanLabContext | null;
  siteAnalysis: StructuredSiteAnalysis | null;
  planningNarrative: PlanningNarrative | null;
};

/** Normalize stored analysis_runs.result from legacy or current shape. */
export function parseAnalysisRunResult(raw: unknown): ParsedAnalysisRun | null {
  if (!raw || typeof raw !== "object") return null;

  const runParsed = siteAnalysisRunResultSchema.safeParse(raw);
  if (runParsed.success) {
    const extra = raw as { beirutUrbanLab?: unknown; bufferMetrics?: unknown };
    const bulParsed = beirutUrbanLabContextSchema.safeParse(extra.beirutUrbanLab);
    const bmParsed = siteBufferMetricsSchema.safeParse(
      extra.bufferMetrics ?? runParsed.data.bufferMetrics,
    );
    let siteAnalysis = runParsed.data.siteAnalysis;
    const beirutUrbanLab = bulParsed.success
      ? bulParsed.data
      : siteAnalysis.beirutUrbanLab ?? null;
    const bufferMetrics = bmParsed.success
      ? bmParsed.data
      : siteAnalysis.bufferMetrics ?? null;
    if (beirutUrbanLab && !siteAnalysis.beirutUrbanLab) {
      siteAnalysis = { ...siteAnalysis, beirutUrbanLab };
    }
    if (bufferMetrics && !siteAnalysis.bufferMetrics) {
      siteAnalysis = { ...siteAnalysis, bufferMetrics };
    }
    return {
      indicators: runParsed.data.indicators,
      bufferMetrics,
      beirutUrbanLab,
      siteAnalysis,
      planningNarrative: runParsed.data.planningNarrative ?? runParsed.data.analysis ?? null,
    };
  }

  const legacy = raw as {
    indicators?: Record<string, number | string>;
    analysis?: unknown;
    siteAnalysis?: unknown;
  };

  const indicators =
    legacy.indicators && typeof legacy.indicators === "object" ? legacy.indicators : {};

  const siteParsed = legacy.siteAnalysis
    ? structuredSiteAnalysisSchema.safeParse(legacy.siteAnalysis)
    : null;
  const narrativeParsed = legacy.analysis ? planningNarrativeSchema.safeParse(legacy.analysis) : null;

  if (!siteParsed?.success && !narrativeParsed?.success) return null;

  let siteAnalysis: StructuredSiteAnalysis | null = siteParsed?.success ? siteParsed.data : null;
  if (siteAnalysis && !siteAnalysis.bufferMetrics) {
    const bm = bufferMetricsFromIndicators(indicators);
    if (bm) siteAnalysis = { ...siteAnalysis, bufferMetrics: bm };
  }

  if (siteAnalysis?.bufferMetrics && !siteAnalysis.qualitativeRatings) {
    const area =
      typeof indicators.study_area_km2 === "number" ? indicators.study_area_km2 : 0.5;
    siteAnalysis = {
      ...siteAnalysis,
      qualitativeRatings: qualitativeRatingsFromBufferMetrics(
        siteAnalysis.bufferMetrics,
        area,
      ),
    };
  }

  const extra = raw as { beirutUrbanLab?: unknown; bufferMetrics?: unknown };
  const bulParsed = beirutUrbanLabContextSchema.safeParse(extra.beirutUrbanLab);
  const bmParsed = siteBufferMetricsSchema.safeParse(extra.bufferMetrics);
  const beirutUrbanLab = bulParsed.success
    ? bulParsed.data
    : siteAnalysis?.beirutUrbanLab ?? null;
  const bufferMetrics = bmParsed.success
    ? bmParsed.data
    : siteAnalysis?.bufferMetrics ?? bufferMetricsFromIndicators(indicators);

  if (siteAnalysis && beirutUrbanLab && !siteAnalysis.beirutUrbanLab) {
    siteAnalysis = { ...siteAnalysis, beirutUrbanLab };
  }
  if (siteAnalysis && bufferMetrics && !siteAnalysis.bufferMetrics) {
    siteAnalysis = { ...siteAnalysis, bufferMetrics };
  }

  return {
    indicators,
    bufferMetrics,
    beirutUrbanLab,
    siteAnalysis,
    planningNarrative: narrativeParsed?.success ? narrativeParsed.data : null,
  };
}
