import { NextResponse } from "next/server";
import { z } from "zod";
import { featureSummaryFromElements } from "@/lib/geo/indicators";
import { computeSiteIndicators } from "@/lib/geo/indicators";
import { overpassToGeoJSON } from "@/lib/geo/osm-to-geojson";
import { generateFullAnalysis } from "@/lib/services/ai";
import { siteContextSchema } from "@/lib/types/analysis";

const bodySchema = z.object({
  lat: z.number(),
  lng: z.number(),
  radiusM: z.number().min(100).max(5000),
  label: z.string().optional(),
  siteNotes: z.string().max(4000).optional(),
});

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const parsed = bodySchema.parse(json);
    const { indicators, elements } = await computeSiteIndicators(
      parsed.lng,
      parsed.lat,
      parsed.radiusM,
    );
    const featureSummary = featureSummaryFromElements(
      elements,
      parsed.lng,
      parsed.lat,
      parsed.radiusM,
    );
    const context = siteContextSchema.parse({
      lat: parsed.lat,
      lng: parsed.lng,
      label: parsed.label,
      siteNotes: parsed.siteNotes,
      radiusM: parsed.radiusM,
      indicators,
      featureSummary,
    });
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        {
          error:
            "OPENAI_API_KEY is not configured. Add it to run AI analysis.",
          context,
          geojson: overpassToGeoJSON(elements),
        },
        { status: 503 },
      );
    }
    const analysis = await generateFullAnalysis(context);
    return NextResponse.json({
      context,
      analysis,
      geojson: overpassToGeoJSON(elements),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Analysis failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
