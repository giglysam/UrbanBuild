import { jsonError } from "@/lib/api/http";
import { mapboxMatrix } from "@/lib/services/mapbox-data";
import { lngLatSchema, mapboxProfileSchema } from "@/lib/types/planning";
import { NextResponse } from "next/server";
import { z } from "zod";

export const maxDuration = 60;

const bodySchema = z.object({
  profile: mapboxProfileSchema.default("walking"),
  points: z.array(lngLatSchema).min(2).max(25),
});

export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return jsonError("Invalid request body", 400, parsed.error.flatten());

  try {
    const matrix = await mapboxMatrix(parsed.data);
    return NextResponse.json(matrix);
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "Matrix request failed", 502);
  }
}
