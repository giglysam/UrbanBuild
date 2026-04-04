import { NextResponse } from "next/server";
import { z } from "zod";
import { generatePlanningBrief } from "@/lib/services/ai";
import {
  fullAnalysisSchema,
  siteContextSchema,
} from "@/lib/types/analysis";

const bodySchema = z.object({
  context: siteContextSchema,
  analysis: fullAnalysisSchema,
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
    const { context, analysis } = bodySchema.parse(json);
    const brief = await generatePlanningBrief(context, analysis);
    return NextResponse.json({ brief });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Brief generation failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
