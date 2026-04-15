import { runSiteAnalysisPipeline } from "@/lib/analysis/run-site-analysis";
import { jsonError } from "@/lib/api/http";
import { studyRequestSchema } from "@/lib/types/planning";
import { NextResponse } from "next/server";

export const maxDuration = 60;

export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }
  const parsed = studyRequestSchema.safeParse(json);
  if (!parsed.success) {
    return jsonError("Invalid request body", 400, parsed.error.flatten());
  }

  try {
    const out = await runSiteAnalysisPipeline(parsed.data);
    return NextResponse.json({
      indicators: out.indicators,
      stats: out.stats,
      featureCollection: out.featureCollection,
      analysis: out.analysis,
      overpassRemark: out.overpassRemark,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Analysis failed";
    const status = message.includes("OPENAI_API_KEY") ? 503 : 502;
    return jsonError(message, status);
  }
}
