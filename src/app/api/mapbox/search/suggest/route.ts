import { jsonError } from "@/lib/api/http";
import { mapboxSearchSuggest } from "@/lib/services/mapbox-data";
import { lngLatSchema } from "@/lib/types/planning";
import { NextResponse } from "next/server";
import { z } from "zod";

const querySchema = z.object({
  q: z.string().min(1).max(200),
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
  limit: z.coerce.number().int().min(1).max(10).optional(),
  sessionToken: z.string().max(200).optional(),
});

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const parsed = querySchema.safeParse({
    q: searchParams.get("q") ?? "",
    lat: searchParams.get("lat") ?? undefined,
    lng: searchParams.get("lng") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
    sessionToken: searchParams.get("sessionToken") ?? undefined,
  });
  if (!parsed.success) return jsonError("Invalid query params", 400, parsed.error.flatten());

  try {
    const proximity =
      parsed.data.lat != null && parsed.data.lng != null
        ? lngLatSchema.parse({ lat: parsed.data.lat, lng: parsed.data.lng })
        : undefined;
    const suggestions = await mapboxSearchSuggest({
      query: parsed.data.q,
      proximity,
      limit: parsed.data.limit,
      sessionToken: parsed.data.sessionToken,
    });
    return NextResponse.json({ suggestions });
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "Search suggest failed", 502);
  }
}
