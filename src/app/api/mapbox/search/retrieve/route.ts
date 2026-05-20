import { jsonError } from "@/lib/api/http";
import { mapboxSearchRetrieve } from "@/lib/services/mapbox-data";
import { NextResponse } from "next/server";
import { z } from "zod";

const querySchema = z.object({
  mapboxId: z.string().min(1).max(300),
  sessionToken: z.string().max(200).optional(),
});

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const parsed = querySchema.safeParse({
    mapboxId: searchParams.get("mapboxId") ?? "",
    sessionToken: searchParams.get("sessionToken") ?? undefined,
  });
  if (!parsed.success) return jsonError("Invalid query params", 400, parsed.error.flatten());

  try {
    const place = await mapboxSearchRetrieve({
      mapboxId: parsed.data.mapboxId,
      sessionToken: parsed.data.sessionToken,
    });
    if (!place) return jsonError("Place not found", 404);
    return NextResponse.json(place);
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "Search retrieve failed", 502);
  }
}
