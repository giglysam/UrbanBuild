import { jsonError } from "@/lib/api/http";
import { buildMapboxContextBundle } from "@/lib/services/mapbox-data";
import { lngLatSchema, mapboxProfileSchema } from "@/lib/types/planning";
import { NextResponse } from "next/server";
import { z } from "zod";

export const maxDuration = 60;

const bodySchema = z.object({
  center: lngLatSchema,
  radiusM: z.number().min(50).max(5000).default(800),
  searchQuery: z.string().max(200).optional(),
  destination: lngLatSchema.optional(),
  profile: mapboxProfileSchema.optional(),
  contourMinutes: z.array(z.number().int().positive()).max(4).optional(),
});

export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return jsonError("Invalid request body", 400, parsed.error.flatten());
  }

  try {
    const bundle = await buildMapboxContextBundle(parsed.data);
    return NextResponse.json(bundle);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to build Mapbox context";
    return jsonError(message, 502);
  }
}
