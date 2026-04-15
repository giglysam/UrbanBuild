import { jsonError } from "@/lib/api/http";
import { computeIndicators } from "@/lib/geo/indicators";
import { fetchOverpassContext } from "@/lib/services/overpass";
import { studyRequestSchema } from "@/lib/types/planning";
import { NextResponse } from "next/server";

export const maxDuration = 60;

function upstreamMessage(e: unknown): string {
  if (e instanceof Error) {
    if (e.name === "TimeoutError" || e.name === "AbortError") {
      return "Overpass request timed out. Try a smaller radius or retry.";
    }
    return e.message;
  }
  return "Site data failed";
}

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
  const { lat, lng, radiusM } = parsed.data;
  try {
    const overpass = await fetchOverpassContext(lat, lng, radiusM);
    const { indicators, featureCollection, stats } = computeIndicators(lat, lng, radiusM, overpass);
    return NextResponse.json({
      indicators,
      featureCollection,
      stats,
      overpassRemark: overpass.remark ?? null,
    });
  } catch (e) {
    return jsonError(upstreamMessage(e), 502);
  }
}
