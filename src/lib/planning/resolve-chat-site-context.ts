import "server-only";

import { runSiteAnalysisPipeline } from "@/lib/analysis/run-site-analysis";
import { composeChatSiteAnalysis } from "@/lib/planning/compose-chat-site-analysis";
import { DEFAULT_STUDY_RADIUS_M } from "@/lib/geo/site-buffer-metrics";
import {
  extractChatSiteIntent,
  userMessageImpliesProjectIntent,
} from "@/lib/planning/extract-chat-site-intent";
import { formatLocationIntelligence } from "@/lib/planning/location-intelligence";
import type { PlanningChatSiteContext } from "@/lib/planning/planning-chat-site-context";
import { reverseGeocode } from "@/lib/services/geocode";

const COORD_EPS = 0.002;

function coordsMatch(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): boolean {
  return Math.abs(a.lat - b.lat) < COORD_EPS && Math.abs(a.lng - b.lng) < COORD_EPS;
}

function hasLoadedMetrics(ctx: PlanningChatSiteContext): boolean {
  const composed = composeChatSiteAnalysis(ctx);
  const bm = composed?.bufferMetrics;
  if (!bm) return false;
  return bm.buildingCount + bm.roadCount > 0;
}

function mergeContext(
  client: PlanningChatSiteContext | undefined,
  extracted: ReturnType<typeof extractChatSiteIntent>,
): PlanningChatSiteContext | null {
  const lat = extracted.lat ?? client?.lat;
  const lng = extracted.lng ?? client?.lng;
  if (lat == null || lng == null) return null;

  const radiusM =
    extracted.radiusM ?? client?.radiusM ?? client?.siteAnalysis?.location.studyRadiusMeters ?? DEFAULT_STUDY_RADIUS_M;

  const projectType = extracted.projectType ?? client?.projectType;
  const customProjectDescription =
    extracted.customProjectDescription ?? client?.customProjectDescription;
  const placeLabel = extracted.placeLabel ?? client?.placeLabel;

  return {
    lat,
    lng,
    radiusM,
    placeLabel,
    projectType,
    customProjectDescription,
    indicators: client?.indicators,
    bufferMetrics: client?.bufferMetrics,
    beirutUrbanLab: client?.beirutUrbanLab,
    siteAnalysis: client?.siteAnalysis,
    analysis: client?.analysis,
    mapboxContextText: client?.mapboxContextText,
  };
}

async function enrichLocationContext(ctx: PlanningChatSiteContext): Promise<PlanningChatSiteContext> {
  let reverseLabel: string | undefined;
  if (!ctx.placeLabel?.trim()) {
    try {
      const rev = await reverseGeocode(ctx.lat, ctx.lng);
      reverseLabel = rev.label;
    } catch {
      /* optional */
    }
  }

  const locationBlock = formatLocationIntelligence({
    lat: ctx.lat,
    lng: ctx.lng,
    userPlaceHint: ctx.placeLabel,
    reverseGeocodeLabel: reverseLabel,
  });

  const mapboxContextText = [ctx.mapboxContextText, locationBlock].filter(Boolean).join("\n\n");

  return {
    ...ctx,
    placeLabel: ctx.placeLabel ?? reverseLabel?.split(",")[0]?.trim(),
    mapboxContextText: mapboxContextText || undefined,
  };
}

export type ResolveChatSiteContextResult = {
  context: PlanningChatSiteContext | null;
  analysisRan: boolean;
  /** True when the user message included both coordinates and a project / build intent. */
  immediateAssessment: boolean;
};

/**
 * Merge client pin + message extraction; run GIS/feasibility pipeline when coords + project
 * are known but buffer metrics are not loaded for that pin.
 */
export async function resolvePlanningChatSiteContext(
  client: PlanningChatSiteContext | undefined,
  userMessage: string,
): Promise<ResolveChatSiteContextResult> {
  const extracted = extractChatSiteIntent(userMessage);
  let ctx = mergeContext(client, extracted);
  if (!ctx && extracted.lat != null && extracted.lng != null) {
    ctx = {
      lat: extracted.lat,
      lng: extracted.lng,
      radiusM: extracted.radiusM ?? DEFAULT_STUDY_RADIUS_M,
      projectType: extracted.projectType,
      customProjectDescription: extracted.customProjectDescription,
      placeLabel: extracted.placeLabel,
    };
  }
  if (!ctx) return { context: client ?? null, analysisRan: false, immediateAssessment: false };

  const immediateAssessment =
    extracted.lat != null &&
    extracted.lng != null &&
    userMessageImpliesProjectIntent(userMessage);

  ctx = await enrichLocationContext(ctx);

  const pinFromMessage = extracted.lat != null && extracted.lng != null;
  const hasProject =
    ctx.projectType != null ||
    Boolean(ctx.customProjectDescription?.trim()) ||
    userMessageImpliesProjectIntent(userMessage);

  const needsAnalysis =
    hasProject &&
    (!hasLoadedMetrics(ctx) ||
      (pinFromMessage &&
        client?.lat != null &&
        !coordsMatch({ lat: ctx.lat, lng: ctx.lng }, { lat: client.lat, lng: client.lng })));

  if (!needsAnalysis) {
    return { context: ctx, analysisRan: false, immediateAssessment };
  }

  try {
    const out = await runSiteAnalysisPipeline({
      lat: ctx.lat,
      lng: ctx.lng,
      radiusM: ctx.radiusM ?? DEFAULT_STUDY_RADIUS_M,
      projectType: ctx.projectType,
      customProjectDescription: ctx.customProjectDescription,
      placeLabel: ctx.placeLabel,
      includePlanningNarrative: false,
      enrichFeasibilityWithAi: false,
    });

    ctx = {
      ...ctx,
      radiusM: ctx.radiusM ?? out.siteAnalysis.location.studyRadiusMeters,
      indicators: out.indicators,
      bufferMetrics: out.bufferMetrics,
      beirutUrbanLab: out.beirutUrbanLab ?? undefined,
      siteAnalysis: out.siteAnalysis,
      analysis: undefined,
    };
    return { context: ctx, analysisRan: true, immediateAssessment };
  } catch {
    return { context: ctx, analysisRan: false, immediateAssessment };
  }
}
