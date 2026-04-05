import type { SiteContext } from "@/lib/types/analysis";

export type ChatReplyPayload = {
  answer: string;
  evidence_notes: string[];
};

const DEFAULT_CHAT_URL = "https://chat-z.created.app/api/chat";

function contextBlock(ctx: SiteContext) {
  return JSON.stringify(
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
}

const instructions = `You are an expert urban planning assistant for Beirut, Lebanon.
Rules:
- Never claim official municipal zoning, codes, or regulations unless explicitly given (they are not official here).
- Be clear when something is observed from OSM-derived metrics vs inferred vs speculative / needs verification.
- Acknowledge dense irregular fabric, mixed conditions, traffic, public space, coast where relevant, heritage sensitivity, resilience where appropriate.
- Land use is provisional interpretation from context, not official zoning confirmation.

Answer in clear prose (short paragraphs). End with a brief "Evidence note:" line listing whether key points are observed, inferred, or speculative.`;

function buildPrompt(
  ctx: SiteContext,
  question: string,
  priorSummary?: string,
) {
  const parts = [
    instructions,
    "",
    "Site context (JSON):",
    contextBlock(ctx),
    "",
  ];
  if (priorSummary?.trim()) {
    parts.push("Prior site summary from earlier analysis:", priorSummary.trim(), "");
  }
  parts.push("User question:", question.trim());
  return parts.join("\n");
}

type CreatedChatResponse = {
  success: boolean;
  content?: string;
  error?: string;
  status?: number;
};

export async function answerPlanningQuestionCreated(
  ctx: SiteContext,
  question: string,
  priorSummary?: string,
): Promise<ChatReplyPayload> {
  const url =
    process.env.CREATED_CHAT_API_URL?.trim() || DEFAULT_CHAT_URL;
  const prompt = buildPrompt(ctx, question, priorSummary);

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
    signal: AbortSignal.timeout(120_000),
  });

  let data: CreatedChatResponse;
  try {
    data = (await res.json()) as CreatedChatResponse;
  } catch {
    throw new Error("Chat service returned invalid JSON");
  }

  if (!data.success || typeof data.content !== "string") {
    const err = data.error ?? `Chat service error (HTTP ${res.status})`;
    throw new Error(err);
  }

  const answer = data.content.trim();
  if (!answer) throw new Error("Chat service returned empty content");

  return {
    answer,
    evidence_notes: [
      "Response from UrbanBuild external chat service (Created). Cross-check critical claims with local surveys and official sources when available.",
    ],
  };
}
