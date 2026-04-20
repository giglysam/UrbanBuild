import "server-only";

import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";

import { ASSISTANT_RESPONSE_STYLE } from "@/lib/planning/assistant-response-style";
import { getServerEnv } from "@/env/server";
import type { Scenario } from "@/lib/types/planning";

const comparisonSchema = z.object({
  summary: z.string(),
  indicators: z.object({
    density: z.string(),
    landUseMix: z.string(),
    accessibility: z.string(),
    opportunities: z.string(),
    risks: z.string(),
    planningLogic: z.string(),
  }),
  winnerNotes: z.string().optional(),
});

export type ScenarioComparisonResult = z.infer<typeof comparisonSchema>;

function getOpenAI() {
  const key = getServerEnv().OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY is not configured");
  return new OpenAI({ apiKey: key });
}

export async function compareScenariosWithLLM(a: Scenario, b: Scenario): Promise<ScenarioComparisonResult> {
  const client = getOpenAI();
  const model = getServerEnv().OPENAI_MODEL ?? "gpt-4o-mini";

  const response = await client.responses.parse({
    model,
    instructions: `You compare two urban planning scenarios. Be concise and professional. Do not invent zoning law.

${ASSISTANT_RESPONSE_STYLE}`,
    input: [
      {
        role: "user",
        content: JSON.stringify({
          scenario_a: a,
          scenario_b: b,
          task: "Compare across density, land use mix, accessibility, opportunities, risks, and planning logic.",
        }),
      },
    ],
    text: {
      format: zodTextFormat(comparisonSchema, "scenario_comparison"),
    },
  });

  const parsed = response.output_parsed;
  if (!parsed) {
    throw new Error("Empty comparison response");
  }
  return parsed;
}
