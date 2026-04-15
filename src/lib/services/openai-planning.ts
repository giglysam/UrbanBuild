import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";

import { getServerEnv } from "@/env/server";
import {
  siteAnalysisSchema,
  type SiteAnalysis,
  type SiteIndicators,
} from "@/lib/types/planning";

const URBAN_PLANNING_SYSTEM = `You are UrbanBuild's planning assistant — an expert in urban design, mobility, public space, and environmental performance, with familiarity for Mediterranean coastal cities (pilot: Beirut).

Rules you MUST follow:
- Never invent official zoning codes, municipal bylaws, or binding regulations. If the user asks for legal zoning, say data is not available from OSM and recommend local authority sources.
- Tag every insight with confidence: "observed" (directly from provided metrics or OSM tags), "inferred" (reasonable planning interpretation), or "speculative" (exploratory / scenario).
- Treat OSM land use and building tags as provisional / community-sourced unless stated otherwise.
- Prefer concise, actionable language for practicing planners and architects.
- Output MUST match the provided JSON schema exactly.`;

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
}): Promise<SiteAnalysis> {
  const client = getClient();
  const model = getPlanningModel();

  const response = await client.responses.parse({
    model,
    instructions: URBAN_PLANNING_SYSTEM,
    input: [
      {
        role: "user",
        content: JSON.stringify({
          task: "Produce structured urban planning analysis for the buffered study area.",
          pilot_city: input.pilotCity,
          indicators: input.indicators,
          notes: input.contextNotes,
          required_sections: [
            "indicators echo / interpretation",
            "insights (each with confidence)",
            "three contrasting scenarios (design strategies, not legal prescriptions)",
            "short executive planning brief",
            "disclaimers",
          ],
        }),
      },
    ],
    text: {
      format: zodTextFormat(siteAnalysisSchema, "site_analysis"),
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

You are answering in a chat. Be concise. If asked for legal/regulatory certainty, decline and point to local sources.`,
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
