import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";

import { ASSISTANT_RESPONSE_STYLE } from "@/lib/planning/assistant-response-style";
import { getServerEnv } from "@/env/server";
import {
  siteAnalysisWithModulesSchema,
  type PlanningContext,
  type PlanningModuleId,
  type SiteAnalysisWithModules,
  type SiteIndicators,
} from "@/lib/types/planning";

const URBAN_PLANNING_SYSTEM = `You are UrbanBuild's planning assistant — an expert in urban design, mobility, public space, and environmental performance, with familiarity for Mediterranean coastal cities (pilot: Beirut).

Rules you MUST follow:
- Never invent official zoning codes, municipal bylaws, or binding regulations. If the user asks for legal zoning, say data is not available from OSM and recommend local authority sources.
- Tag every insight with confidence: "observed" (directly from provided metrics or OSM tags), "inferred" (reasonable planning interpretation), or "speculative" (exploratory / scenario).
- Treat OSM land use and building tags as provisional / community-sourced unless stated otherwise.
- Prefer concise, actionable language for practicing planners and architects.
- Output MUST match the provided JSON schema exactly.
- The "modules" object MUST include all five keys: landUse, trafficTransit, greenSpace, budget, risk. Each module must be substantive and actionable.

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
}): Promise<SiteAnalysisWithModules> {
  const client = getClient();
  const model = getPlanningModel();

  const focus = input.moduleFocus ?? "all";
  const focusLine =
    focus !== "all" ? MODULE_FOCUS_ADDENDUM[focus] : "Balance depth across all five modules.";

  const instructions = `${URBAN_PLANNING_SYSTEM}

Module output emphasis: ${focusLine}`;

  const response = await client.responses.parse({
    model,
    instructions,
    input: [
      {
        role: "user",
        content: JSON.stringify({
          task: "Produce structured urban planning analysis for the buffered study area.",
          pilot_city: input.pilotCity,
          indicators: input.indicators,
          notes: input.contextNotes,
          planner_context: input.planningContext ?? null,
          module_focus: focus,
          required_sections: [
            "indicators echo / interpretation",
            "insights (each with confidence)",
            "three contrasting scenarios (design strategies, not legal prescriptions)",
            "short executive planning brief",
            "disclaimers",
            "modules: landUse, trafficTransit, greenSpace, budget, risk (all required)",
          ],
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

export async function runPlanningChat(messages: { role: "user" | "assistant"; content: string }[]) {
  return runPlanningChatWithSystem(
    `${URBAN_PLANNING_SYSTEM}

You are answering in a chat. If asked for legal/regulatory certainty, decline and point to local sources.`,
    messages,
  );
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
