import { composeChatSiteAnalysis } from "@/lib/planning/compose-chat-site-analysis";
import type { ParsedAnalysisRun } from "@/lib/analysis/parse-analysis-run";
import type { BeirutUrbanLabContext } from "@/lib/types/beirut-urban-lab";
import type { SiteBufferMetrics } from "@/lib/geo/site-buffer-metrics";
import type { StructuredSiteAnalysis } from "@/lib/types/site-feasibility";

type RunExtras = {
  beirutUrbanLab?: BeirutUrbanLabContext | null;
  bufferMetrics?: SiteBufferMetrics | null;
};

/** Merge stored analysis run fields so chat always gets OSM + BBED when saved on the run. */
export function mergeAnalysisRunForChat(
  parsed: ParsedAnalysisRun | null,
  extras: RunExtras,
  pin: { lat: number; lng: number; radiusM?: number; placeLabel?: string },
): StructuredSiteAnalysis | null {
  if (!parsed && !extras.bufferMetrics && !extras.beirutUrbanLab) return null;

  return composeChatSiteAnalysis({
    lat: pin.lat,
    lng: pin.lng,
    radiusM: pin.radiusM,
    placeLabel: pin.placeLabel,
    indicators: parsed?.indicators,
    bufferMetrics: parsed?.siteAnalysis?.bufferMetrics ?? extras.bufferMetrics ?? null,
    beirutUrbanLab:
      parsed?.siteAnalysis?.beirutUrbanLab ?? extras.beirutUrbanLab ?? null,
    siteAnalysis: parsed?.siteAnalysis ?? null,
  });
}
