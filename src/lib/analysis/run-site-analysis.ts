import "server-only";

import type { FeatureCollection } from "geojson";

import { beirutContextNote, computeIndicators } from "@/lib/geo/indicators";
import { fetchOverpassContext } from "@/lib/services/overpass";
import { runStructuredSiteAnalysis } from "@/lib/services/openai-planning";
import type { SiteAnalysis, StudyRequest } from "@/lib/types/planning";

export type SiteAnalysisInput = StudyRequest & {
  /** Optional GeoJSON Polygon/MultiPolygon for context (not yet used in Overpass disk query). */
  boundaryGeojson?: unknown;
};

export type SiteAnalysisPipelineResult = {
  indicators: Record<string, number | string>;
  stats: Record<string, number | string>;
  featureCollection: FeatureCollection;
  analysis: SiteAnalysis;
  overpassRemark: string | null;
};

function upstreamMessage(e: unknown): string {
  if (e instanceof Error) {
    if (e.name === "TimeoutError" || e.name === "AbortError") {
      return "Overpass request timed out. Try a smaller radius or retry.";
    }
    return e.message;
  }
  return "Analysis failed";
}

export async function runSiteAnalysisPipeline(input: SiteAnalysisInput): Promise<SiteAnalysisPipelineResult> {
  const { lat, lng, radiusM } = input;
  try {
    const overpass = await fetchOverpassContext(lat, lng, radiusM);
    const { indicators, featureCollection, stats } = computeIndicators(lat, lng, radiusM, overpass);

    const contextNotes = [
      beirutContextNote(lat, lng),
      overpass.remark ? `Overpass: ${overpass.remark}` : "Overpass query completed.",
    ];
    if (input.boundaryGeojson) {
      contextNotes.push("Study boundary polygon provided (geometry not yet used in OSM disk query).");
    }

    const analysis = await runStructuredSiteAnalysis({
      indicators,
      contextNotes,
      pilotCity: "Beirut (pilot)",
    });

    return {
      indicators,
      stats,
      featureCollection,
      analysis,
      overpassRemark: overpass.remark ?? null,
    };
  } catch (e) {
    throw new Error(upstreamMessage(e));
  }
}
