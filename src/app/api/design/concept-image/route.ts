import { generateArchitecturalImage } from "@/lib/services/image-generation";
import { jsonError } from "@/lib/api/http";
import { generateImageRequestSchema } from "@/lib/types/planning";
import { NextResponse } from "next/server";

export const maxDuration = 120;

/** @deprecated Prefer POST /api/generate-image */
export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const parsed = generateImageRequestSchema.safeParse(json);
  if (!parsed.success) {
    return jsonError("Invalid request body", 400, parsed.error.flatten());
  }

  const body = parsed.data;

  try {
    const out = await generateArchitecturalImage({
      lat: body.lat,
      lng: body.lng,
      radiusM: body.radiusM,
      placeLabel: body.placeLabel,
      concept: body.concept,
      siteDiagnosis: body.siteDiagnosis,
      mapboxContextText: body.mapboxContextText,
      siteAnalysisSummary: body.siteAnalysisSummary,
      indicators: body.indicators,
    });

    return NextResponse.json({
      imageDataUrl: out.imageDataUrl,
      promptUsed: out.promptUsed,
      revisedPrompt: out.revisedPrompt ?? null,
      storagePath: out.storagePath,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Image generation failed";
    let status = 502;
    if (message.includes("OPENAI_API_KEY")) status = 503;
    return jsonError(message, status);
  }
}
