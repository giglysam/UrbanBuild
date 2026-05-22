import { fetchBeirutUrbanLabContext } from "@/lib/services/beirut-urban-lab/fetch-beirut-urban-lab-context";
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
    const context = await fetchBeirutUrbanLabContext(
      parsed.data.lat,
      parsed.data.lng,
      parsed.data.radiusM,
    );
    if (!context) {
      return jsonError("Beirut Urban Lab data unavailable for this location", 502);
    }
    return NextResponse.json({ context });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Beirut Urban Lab fetch failed";
    return jsonError(message, 502);
  }
}
