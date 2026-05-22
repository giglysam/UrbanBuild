import "server-only";

import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";

import { ASSISTANT_RESPONSE_STYLE } from "@/lib/planning/assistant-response-style";
import { PROJECT_READINESS_ASSESSMENT_FORMAT } from "@/lib/planning/pre-project-readiness";
import { formatSiteDataUsedForPrompt } from "@/lib/planning/format-site-data-used";
import { getServerEnv } from "@/env/server";
import { getPlanningModel } from "@/lib/services/openai-planning";
import type { PlanningContext } from "@/lib/types/planning";
import type { ProjectFeasibility, StructuredSiteAnalysis } from "@/lib/types/site-feasibility";
import { projectFeasibilitySchema } from "@/lib/types/site-feasibility";

const enrichSchema = z.object({
  siteOpportunities: projectFeasibilitySchema.shape.siteOpportunities,
  siteConstraints: projectFeasibilitySchema.shape.siteConstraints,
  projectRisks: projectFeasibilitySchema.shape.projectRisks,
  alternativeRecommendations: projectFeasibilitySchema.shape.alternativeRecommendations,
  planningBrief: projectFeasibilitySchema.shape.planningBrief,
});

function getClient() {
  const apiKey = getServerEnv().OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");
  return new OpenAI({ apiKey });
}

/** Refine narrative fields only — scores and verdict stay rule-based. */
export async function enrichProjectFeasibilityNarrative(input: {
  siteAnalysis: StructuredSiteAnalysis;
  feasibility: ProjectFeasibility;
  planningContext?: PlanningContext | null;
}): Promise<ProjectFeasibility> {
  const client = getClient();
  const model = getPlanningModel();

  const response = await client.responses.parse({
    model,
    instructions: `You refine pre-feasibility narrative for UrbanBuild (engineers, architects, planners, developers). You MUST NOT change feasibilityScore, verdict, or finalRecommendation.
Ground every statement in the provided structured siteAnalysis JSON. Never invent official zoning or parcel ownership.
The planningBrief MUST follow the seven-section project readiness assessment (keep score/verdict/recommendation unchanged).
${PROJECT_READINESS_ASSESSMENT_FORMAT}
${ASSISTANT_RESPONSE_STYLE}`,
    input: [
      {
        role: "user",
        content: JSON.stringify({
          task: "Refine opportunities, constraints, risks, alternatives, and planningBrief for this pinned site and project type.",
          authoritative_site_data: formatSiteDataUsedForPrompt(input.siteAnalysis),
          siteAnalysis: input.siteAnalysis,
          deterministic_feasibility: {
            verdict: input.feasibility.verdict,
            feasibilityScore: input.feasibility.feasibilityScore,
            scoreRationale: input.feasibility.scoreRationale,
            missingData: input.feasibility.missingData,
            requiredStudies: input.feasibility.requiredStudies,
          },
          planner_context: input.planningContext ?? null,
        }),
      },
    ],
    text: {
      format: zodTextFormat(enrichSchema, "feasibility_enrich"),
    },
  });

  const parsed = response.output_parsed;
  if (!parsed) return input.feasibility;

  return {
    ...input.feasibility,
    siteOpportunities: parsed.siteOpportunities,
    siteConstraints: parsed.siteConstraints,
    projectRisks: parsed.projectRisks,
    alternativeRecommendations: parsed.alternativeRecommendations,
    planningBrief: parsed.planningBrief,
  };
}
