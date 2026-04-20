import "server-only";

import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";

import { ASSISTANT_RESPONSE_STYLE } from "@/lib/planning/assistant-response-style";
import { getServerEnv } from "@/env/server";
import type { PlanningContext, SiteAnalysis, SiteIndicators } from "@/lib/types/planning";

const briefDocSchema = z.object({
  title: z.string(),
  sections: z.array(
    z.object({
      heading: z.string(),
      body: z.string(),
    }),
  ),
  executiveSummary: z.string(),
});

export type PlanningBriefDocument = z.infer<typeof briefDocSchema>;

function getOpenAI() {
  const key = getServerEnv().OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY is not configured");
  return new OpenAI({ apiKey: key });
}

export async function generatePlanningBriefDocument(input: {
  indicators: SiteIndicators;
  priorAnalysis?: SiteAnalysis | null;
  planningContext?: PlanningContext | null;
  editorNotes?: string;
}): Promise<PlanningBriefDocument> {
  const client = getOpenAI();
  const model = getServerEnv().OPENAI_MODEL ?? "gpt-4o-mini";

  const response = await client.responses.parse({
    model,
    instructions: `You produce a formal planning brief for practitioners. Do not invent official zoning. Tag uncertainty where needed.

${ASSISTANT_RESPONSE_STYLE}`,
    input: [
      {
        role: "user",
        content: JSON.stringify({
          task: "Create a structured planning brief document with titled sections.",
          indicators: input.indicators,
          planner_context: input.planningContext ?? null,
          prior_analysis_excerpt: input.priorAnalysis
            ? {
                insights: input.priorAnalysis.insights.slice(0, 6),
                scenarios: input.priorAnalysis.scenarios,
                modules: input.priorAnalysis.modules ?? null,
              }
            : null,
          editor_notes: input.editorNotes ?? null,
        }),
      },
    ],
    text: {
      format: zodTextFormat(briefDocSchema, "planning_brief_doc"),
    },
  });

  const parsed = response.output_parsed;
  if (!parsed) {
    throw new Error("Model returned no planning brief");
  }
  return parsed;
}

export function planningBriefToMarkdown(doc: PlanningBriefDocument): string {
  const lines: string[] = [`# ${doc.title}`, "", doc.executiveSummary, ""];
  for (const s of doc.sections) {
    lines.push(`## ${s.heading}`, "", s.body, "");
  }
  return lines.join("\n").trim();
}
