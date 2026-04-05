import { NextResponse } from "next/server";
import { z } from "zod";

export const maxDuration = 30;
import { mapboxForwardGeocode, nominatimSearch } from "@/lib/services/geocode";

const querySchema = z.object({
  q: z.string().min(1).max(200),
});

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";
  const parsed = querySchema.safeParse({ q });
  if (!parsed.success) {
    return NextResponse.json({ results: [] });
  }
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  try {
    if (token) {
      const results = await mapboxForwardGeocode(parsed.data.q, token);
      return NextResponse.json({ results });
    }
    const results = await nominatimSearch(parsed.data.q);
    return NextResponse.json({ results });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Geocode failed";
    return NextResponse.json({ error: msg, results: [] }, { status: 200 });
  }
}
