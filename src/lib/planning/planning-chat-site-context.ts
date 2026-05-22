import { z } from "zod";

import { siteBufferMetricsSchema } from "@/lib/geo/site-buffer-metrics";
import { composeChatSiteAnalysis } from "@/lib/planning/compose-chat-site-analysis";
import { formatProjectPlanningAssessmentForPrompt } from "@/lib/planning/interpret-site-for-project";
import { formatSiteDataUsedForPrompt } from "@/lib/planning/format-site-data-used";
import type { PlanningNarrative, SiteIndicators } from "@/lib/types/planning";
import { planningNarrativeSchema, siteIndicatorsSchema } from "@/lib/types/planning";
import { beirutUrbanLabContextSchema } from "@/lib/types/beirut-urban-lab";
import {
  structuredSiteAnalysisSchema,
  type StructuredSiteAnalysis,
} from "@/lib/types/site-feasibility";
import { projectTypeIdSchema } from "@/lib/types/site-feasibility";

/** Site context attached to stateless demo chat so the model evaluates the pinned study area. */
export const planningChatSiteContextSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  radiusM: z.number().min(50).max(2000).optional(),
  placeLabel: z.string().max(200).optional(),
  projectType: projectTypeIdSchema.optional(),
  customProjectDescription: z.string().max(500).optional(),
  indicators: siteIndicatorsSchema.optional(),
  bufferMetrics: siteBufferMetricsSchema.optional(),
  beirutUrbanLab: beirutUrbanLabContextSchema.optional(),
  siteAnalysis: structuredSiteAnalysisSchema.optional(),
  /** @deprecated Legacy AI narrative — use siteAnalysis when available. */
  analysis: planningNarrativeSchema.optional(),
  mapboxContextText: z.string().max(16000).optional(),
});

export type PlanningChatSiteContext = z.infer<typeof planningChatSiteContextSchema>;

function formatStructuredSiteAnalysis(
  site: StructuredSiteAnalysis,
  projectType?: PlanningChatSiteContext["projectType"],
  customProjectDescription?: string,
): string[] {
  const lines: string[] = [formatSiteDataUsedForPrompt(site, { compact: true })];
  if (projectType) {
    lines.unshift(formatProjectPlanningAssessmentForPrompt(site, projectType, customProjectDescription));
  }
  const f = site.projectFeasibility;
  if (f && !projectType) {
    lines.push(
      `Feasibility: ${f.projectTypeLabel} · ${f.feasibilityScore}/100 · ${f.verdict.replace(/_/g, " ")}`,
    );
  }
  return lines;
}

/** GIS + feasibility facts for the model (no user-facing rules). */
export function formatPlanningChatSiteContext(ctx: PlanningChatSiteContext): string {
  const composed = composeChatSiteAnalysis({
    lat: ctx.lat,
    lng: ctx.lng,
    radiusM: ctx.radiusM,
    placeLabel: ctx.placeLabel,
    projectType: ctx.projectType,
    customProjectDescription: ctx.customProjectDescription,
    indicators: ctx.indicators,
    bufferMetrics: ctx.bufferMetrics,
    beirutUrbanLab: ctx.beirutUrbanLab,
    siteAnalysis: ctx.siteAnalysis,
  });

  const projectType = ctx.projectType ?? composed?.projectFeasibility?.projectType;

  const lines: string[] = [
    "Active study site:",
    `Coordinates: ${ctx.lat.toFixed(5)}, ${ctx.lng.toFixed(5)}`,
    `Study radius: ${ctx.radiusM ?? composed?.location.studyRadiusMeters ?? 400} m`,
  ];

  if (ctx.placeLabel?.trim()) lines.push(`Place: ${ctx.placeLabel.trim()}`);
  if (ctx.customProjectDescription?.trim()) {
    lines.push(`Proposed project (user program): ${ctx.customProjectDescription.trim()}`);
  } else if (projectType) {
    lines.push(`Proposed project type: ${projectType}`);
  }

  if (composed) {
    lines.push(...formatStructuredSiteAnalysis(composed, projectType, ctx.customProjectDescription));
  } else if (ctx.analysis) {
    lines.push(`Legacy narrative excerpt: ${ctx.analysis.planningBrief?.slice(0, 800) ?? "none"}`);
  } else {
    lines.push("Site metrics not loaded.");
  }

  if (ctx.mapboxContextText?.trim()) {
    lines.push(`Mapbox context:\n${ctx.mapboxContextText.trim().slice(0, 2000)}`);
  }

  return lines.join("\n");
}
