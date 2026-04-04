import OpenAI from "openai";
import { z } from "zod";
import {
  fullAnalysisSchema,
  planningBriefSchema,
  type FullAnalysis,
  type PlanningBrief,
  type SiteContext,
} from "@/lib/types/analysis";

function getClient() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  return new OpenAI({ apiKey: key });
}

const contextBlock = (ctx: SiteContext) =>
  JSON.stringify(
    {
      coordinates: { lat: ctx.lat, lng: ctx.lng },
      label: ctx.label,
      site_notes: ctx.siteNotes,
      study_radius_m: ctx.radiusM,
      indicators: ctx.indicators,
      feature_summary: ctx.featureSummary,
    },
    null,
    2,
  );

const systemBase = `You are an expert urban planner assistant focused on Beirut, Lebanon. 
Rules:
- Never claim official municipal zoning, codes, or regulations unless explicitly provided in context (they are NOT provided here).
- Label every bullet's evidence as observed (from OSM-derived metrics), inferred (from urban pattern), or speculative (needs verification).
- Be cautious, intelligent, and useful. Acknowledge dense/irregular fabric, mixed formal-informal conditions, traffic, fragmented public space, coastal context where relevant, heritage sensitivity in older districts, and resilience themes where appropriate.
- Provisional land use must be framed as interpretation from context and observable patterns, not official confirmation.`;

export async function generateFullAnalysis(
  ctx: SiteContext,
): Promise<FullAnalysis> {
  const client = getClient();
  if (!client) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const user = `Site context (JSON):\n${contextBlock(ctx)}\n\nReturn a JSON object with exactly these keys:
site_summary (string),
urban_grain, accessibility_connectivity, nearby_amenities, walkability_proxy, land_use_guess, environmental_exposure, opportunities, risks, recommendations, next_studies — each an array of { "text": string, "evidence": "observed"|"inferred"|"speculative" },
scenarios: array of 2 to 4 objects { "title", "rationale", "interventions" (string array), "tradeoffs" (string array), "confidence": "high"|"medium"|"low" }.

Ground statements in the provided indicators. Where you extrapolate beyond data, use evidence "speculative" or "inferred".`;

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.35,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemBase },
      { role: "user", content: user },
    ],
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) throw new Error("Empty AI response");
  const parsed = JSON.parse(raw);
  return fullAnalysisSchema.parse(parsed);
}

export async function generatePlanningBrief(
  ctx: SiteContext,
  analysis: FullAnalysis,
): Promise<PlanningBrief> {
  const client = getClient();
  if (!client) throw new Error("OPENAI_API_KEY is not configured");

  const user = `Site context:\n${contextBlock(ctx)}\n\nPrior analysis JSON:\n${JSON.stringify(analysis)}\n\nReturn JSON with keys:
site_identification, context_summary, key_indicators (string array), main_constraints, main_opportunities, strategic_directions, recommended_next_studies — labeled arrays use { text, evidence } with evidence observed|inferred|speculative, and disclaimer (string) stating no official zoning confirmation.`;

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.3,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemBase },
      { role: "user", content: user },
    ],
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) throw new Error("Empty AI response");
  return planningBriefSchema.parse(JSON.parse(raw));
}

const chatReplySchema = z.object({
  answer: z.string(),
  evidence_notes: z.array(z.string()),
});

export type ChatReply = z.infer<typeof chatReplySchema>;

export async function answerPlanningQuestion(
  ctx: SiteContext,
  question: string,
  priorAnalysisSummary?: string,
): Promise<ChatReply> {
  const client = getClient();
  if (!client) throw new Error("OPENAI_API_KEY is not configured");

  const user = `Site context:\n${contextBlock(ctx)}\n\n${
    priorAnalysisSummary
      ? `Prior summary:\n${priorAnalysisSummary}\n\n`
      : ""
  }User question: ${question}\n\nReply as JSON: { "answer": string (markdown-friendly plain paragraphs), "evidence_notes": string[] (each note: observed / inferred / speculative and why) }.`;

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.4,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemBase },
      { role: "user", content: user },
    ],
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) throw new Error("Empty AI response");
  return chatReplySchema.parse(JSON.parse(raw));
}
