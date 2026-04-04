import { NextResponse } from "next/server";
import { z } from "zod";
import {
  computeSiteIndicators,
  featureSummaryFromElements,
} from "@/lib/geo/indicators";
import { overpassToGeoJSON } from "@/lib/geo/osm-to-geojson";
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
    const geojson = overpassToGeoJSON(elements);
    return NextResponse.json({ context, geojson });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Context fetch failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
