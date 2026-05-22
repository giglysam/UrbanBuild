import "server-only";

import type { FeatureCollection } from "geojson";

import { buildStructuredSiteAnalysis } from "@/lib/analysis/build-structured-site-analysis";
import { enrichProjectFeasibilityNarrative } from "@/lib/analysis/enrich-site-analysis-ai";
import { runProjectFeasibility } from "@/lib/analysis/run-project-feasibility";
import { formatSiteDataUsedForPrompt } from "@/lib/planning/format-site-data-used";
import { planningContextToNotes } from "@/lib/planning/planning-context-notes";
import { beirutContextNote, computeIndicators } from "@/lib/geo/indicators";
import { fetchBeirutUrbanLabContext } from "@/lib/services/beirut-urban-lab/fetch-beirut-urban-lab-context";
import { fetchOverpassContext } from "@/lib/services/overpass";
import { runStructuredSiteAnalysis } from "@/lib/services/openai-planning";
import type {
  PlanningContext,
  PlanningModuleId,
  PlanningNarrative,
  StudyRequest,
} from "@/lib/types/planning";
import type { SiteBufferMetrics } from "@/lib/geo/site-buffer-metrics";
import type { BeirutUrbanLabContext } from "@/lib/types/beirut-urban-lab";
import type { ProjectTypeId, StructuredSiteAnalysis } from "@/lib/types/site-feasibility";

export type SiteAnalysisInput = StudyRequest & {
  boundaryGeojson?: unknown;
  planningContext?: PlanningContext | null;
  moduleFocus?: PlanningModuleId;
  /** When false, skip OpenAI narrative modules (GIS + rule feasibility only). */
  includePlanningNarrative?: boolean;
  /** When false, skip AI refinement of feasibility prose. */
  enrichFeasibilityWithAi?: boolean;
  /** When false, skip Beirut Urban Lab / BBED ArcGIS fetch. */
  includeBeirutUrbanLab?: boolean;
};

export type SiteAnalysisPipelineResult = {
  indicators: Record<string, number | string>;
  bufferMetrics: SiteBufferMetrics;
  stats: Record<string, number | string>;
  featureCollection: FeatureCollection;
  siteAnalysis: StructuredSiteAnalysis;
  planningNarrative: PlanningNarrative | null;
  beirutUrbanLab: BeirutUrbanLabContext | null;
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
    const includeBul = input.includeBeirutUrbanLab !== false;
    const [overpass, beirutUrbanLab] = await Promise.all([
      fetchOverpassContext(lat, lng, radiusM),
      includeBul ? fetchBeirutUrbanLabContext(lat, lng, radiusM) : Promise.resolve(null),
    ]);

    const { indicators, bufferMetrics, featureCollection, stats } = computeIndicators(
      lat,
      lng,
      radiusM,
      overpass,
    );

    let siteAnalysis = buildStructuredSiteAnalysis({
      lat,
      lng,
      radiusM,
      overpass,
      indicators,
      placeLabel: input.placeLabel,
      city: input.city,
      neighborhood: input.neighborhood,
      planningContext: input.planningContext,
      beirutUrbanLab,
    });

    if (beirutUrbanLab && beirutUrbanLab.bbed.buildings > 0) {
      siteAnalysis = {
        ...siteAnalysis,
        builtEnvironment: {
          ...siteAnalysis.builtEnvironment,
          buildingCount: beirutUrbanLab.bbed.buildings,
        },
      };
    }

    const projectType: ProjectTypeId | undefined = input.projectType;
    if (projectType) {
      let feasibility = runProjectFeasibility(siteAnalysis, projectType, input.customProjectDescription);
      if (input.enrichFeasibilityWithAi !== false) {
        try {
          feasibility = await enrichProjectFeasibilityNarrative({
            siteAnalysis,
            feasibility,
            planningContext: input.planningContext,
          });
        } catch {
          /* keep rule-based narrative */
        }
      }
      siteAnalysis = { ...siteAnalysis, projectFeasibility: feasibility };
    }

    const contextNotes = [
      beirutContextNote(lat, lng),
      overpass.remark ? `Overpass: ${overpass.remark}` : "Overpass query completed.",
      ...planningContextToNotes(input.planningContext),
      formatSiteDataUsedForPrompt(siteAnalysis),
      ...(beirutUrbanLab ? beirutUrbanLab.notes : []),
    ];
    if (input.boundaryGeojson) {
      contextNotes.push("Study boundary polygon provided (geometry not yet used in OSM disk query).");
    }

    let planningNarrative: PlanningNarrative | null = null;
    if (input.includePlanningNarrative !== false) {
      planningNarrative = await runStructuredSiteAnalysis({
        indicators,
        contextNotes,
        pilotCity: "Beirut (pilot)",
        planningContext: input.planningContext ?? null,
        moduleFocus: input.moduleFocus ?? "all",
        siteAnalysis,
        projectType: projectType ?? null,
      });
    }

    return {
      indicators,
      bufferMetrics,
      stats,
      featureCollection,
      siteAnalysis,
      planningNarrative,
      beirutUrbanLab,
      overpassRemark: overpass.remark ?? null,
    };
  } catch (e) {
    throw new Error(upstreamMessage(e));
  }
}
