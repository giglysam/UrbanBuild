import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";

import {
  ASSISTANT_RESPONSE_STYLE,
  DATA_GROUNDING_RULES,
  DATA_USED_RESPONSE_FORMAT,
  SITE_ANALYSIS_RESPONSE_FORMAT,
} from "@/lib/planning/assistant-response-style";
import {
  ASSISTANT_ANTI_LEAK_RULE,
  CHAT_RESPONSE_SECTIONS,
  INTERNAL_CHAT_RULES,
} from "@/lib/planning/chat-site-answer-rules";
import { formatSiteDataUsedForPrompt } from "@/lib/planning/format-site-data-used";
import { PRODUCT_IDENTITY, PROJECT_READINESS_ASSESSMENT_FORMAT } from "@/lib/planning/pre-project-readiness";
import { getServerEnv } from "@/env/server";
import {
  siteAnalysisWithModulesSchema,
  type PlanningContext,
  type PlanningModuleId,
  type SiteAnalysisWithModules,
  type SiteIndicators,
} from "@/lib/types/planning";
import type { ProjectTypeId, StructuredSiteAnalysis } from "@/lib/types/site-feasibility";

const URBAN_PLANNING_SYSTEM = `${PRODUCT_IDENTITY}

Rules you MUST follow:
- Never invent official zoning codes, municipal bylaws, or binding regulations. If the user asks for legal zoning, say data is not available from OSM and recommend local authority sources.
- Never claim parcel polygons, cadastral zone shapes, or municipal approval are known unless explicitly provided as verified GIS — BBED/ICIL admin fields are point metadata only.
- Tag every insight with confidence: "observed" (directly from provided metrics or OSM tags), "inferred" (reasonable planning interpretation), or "speculative" (exploratory / scenario).
- Treat OSM land use and building tags as provisional / community-sourced unless stated otherwise.
- Prefer concise, actionable language for engineers, architects, planners, and developers.
- Output MUST match the provided JSON schema exactly.
- The "modules" object MUST include all five keys: landUse, trafficTransit, greenSpace, budget, risk. Each module must be substantive and actionable.
- For project-specific briefs, use the seven-section project readiness assessment (summary + Data Used + sections 1–7).

${PROJECT_READINESS_ASSESSMENT_FORMAT}

${DATA_GROUNDING_RULES}

${DATA_USED_RESPONSE_FORMAT}

${ASSISTANT_RESPONSE_STYLE}`;

const MODULE_FOCUS_ADDENDUM: Record<Exclude<PlanningModuleId, "all">, string> = {
  land_use:
    "Focus extra depth on the landUse module (zoning mix, land-use efficiency). Keep other modules shorter but still complete.",
  traffic_transit:
    "Focus extra depth on the trafficTransit module (streets, access, transit gaps). Keep other modules shorter but still complete.",
  green_space:
    "Focus extra depth on the greenSpace module (parks, heat, sustainability). Keep other modules shorter but still complete.",
  budget:
    "Focus extra depth on the budget module (prioritization, phasing, tradeoffs). Keep other modules shorter but still complete.",
  risk:
    "Focus extra depth on the risk module (hazards, exposure, mitigation). Keep other modules shorter but still complete.",
};

function getClient() {
  const apiKey = getServerEnv().OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }
  return new OpenAI({ apiKey });
}

export function getPlanningModel() {
  return getServerEnv().OPENAI_MODEL ?? "gpt-4o-mini";
}

export async function runStructuredSiteAnalysis(input: {
  indicators: SiteIndicators;
  contextNotes: string[];
  pilotCity: string;
  planningContext?: PlanningContext | null;
  moduleFocus?: PlanningModuleId;
  siteAnalysis?: StructuredSiteAnalysis | null;
  projectType?: ProjectTypeId | null;
}): Promise<SiteAnalysisWithModules> {
  const client = getClient();
  const model = getPlanningModel();

  const focus = input.moduleFocus ?? "all";
  const focusLine =
    focus !== "all" ? MODULE_FOCUS_ADDENDUM[focus] : "Balance depth across all five modules.";

  const dataUsedPrompt =
    input.siteAnalysis != null ? formatSiteDataUsedForPrompt(input.siteAnalysis) : null;

  const instructions = `${URBAN_PLANNING_SYSTEM}

Module output emphasis: ${focusLine}`;

  const response = await client.responses.parse({
    model,
    instructions,
    input: [
      {
        role: "user",
        content: JSON.stringify({
          task: "Produce structured pre-feasibility site intelligence for the buffered study area. All insights must reference the pinned coordinates and structured siteAnalysis — never generic city-wide recommendations.",
          pilot_city: input.pilotCity,
          indicators: input.indicators,
          structured_site_analysis: input.siteAnalysis ?? null,
          authoritative_site_data: dataUsedPrompt,
          proposed_project_type: input.projectType ?? input.siteAnalysis?.projectFeasibility?.projectType ?? null,
          notes: input.contextNotes,
          planner_context: input.planningContext ?? null,
          module_focus: focus,
          required_sections: [
            "planningBrief: if a proposed project type is set, use seven-section project readiness assessment; otherwise site analysis headings 1–7",
            "indicators echo / interpretation",
            "insights (each with confidence; short title + body)",
            "three contrasting scenarios (design strategies, not legal prescriptions)",
            "disclaimers (brief bullets — no legal approval implied)",
            "modules: landUse, trafficTransit, greenSpace, budget, risk (all required; summaries ≤ 3 sentences each)",
          ],
          planning_brief_format: SITE_ANALYSIS_RESPONSE_FORMAT,
          data_used_format: DATA_USED_RESPONSE_FORMAT,
        }),
      },
    ],
    text: {
      format: zodTextFormat(siteAnalysisWithModulesSchema, "site_analysis"),
    },
  });

  const parsed = response.output_parsed;
  if (!parsed) {
    throw new Error("Model returned no parsed output");
  }
  return parsed;
}

export async function runPlanningChat(
  messages: { role: "user" | "assistant"; content: string }[],
  systemOverride?: string,
) {
  const system =
    systemOverride ??
    `${URBAN_PLANNING_SYSTEM}

${ASSISTANT_ANTI_LEAK_RULE}
${INTERNAL_CHAT_RULES}
${CHAT_RESPONSE_SECTIONS}

You are answering in chat. Use markdown only—never a single dense block.
- Specific project at the pinned site: use the seven-section project readiness assessment — ## Project Readiness Summary first, then ## Data Used, then sections 1–7 — not generic city lists.
- Open-ended ideas only: use the Suggestions template (## Suggestions for {place}, ### per theme, bullets, ## Recommended next step).
- Site analysis: use the site analysis heading template.
- Design concepts: use the concept field template.
If asked for legal/regulatory certainty, decline and point to local sources.`;
  return runPlanningChatWithSystem(system, messages);
}

export async function runPlanningChatWithSystem(
  systemInstructions: string,
  messages: { role: "user" | "assistant"; content: string }[],
) {
  const client = getClient();
  const model = getPlanningModel();

  const response = await client.responses.create({
    model,
    instructions: systemInstructions,
    input: messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
  });

  const text = response.output_text;
  if (!text) {
    throw new Error("Empty model response");
  }
  return text;
}
