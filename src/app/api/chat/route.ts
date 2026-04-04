import { NextResponse } from "next/server";
import { z } from "zod";
import { answerPlanningQuestion } from "@/lib/services/ai";
import { siteContextSchema } from "@/lib/types/analysis";

const bodySchema = z.object({
  context: siteContextSchema,
  question: z.string().min(1).max(4000),
  priorSummary: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY is not configured." },
        { status: 503 },
      );
    }
    const json = await req.json();
    const { context, question, priorSummary } = bodySchema.parse(json);
    const reply = await answerPlanningQuestion(
      context,
      question,
      priorSummary,
    );
    return NextResponse.json(reply);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Chat failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
