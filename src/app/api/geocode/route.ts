import { jsonError } from "@/lib/api/http";
import { forwardGeocode } from "@/lib/services/geocode";
import { NextResponse } from "next/server";

export const maxDuration = 30;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";
  if (!q.trim()) {
    return jsonError("Query is required", 400, { field: "q" });
  }
  try {
    const result = await forwardGeocode(q);
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Geocoding failed";
    return jsonError(message, 400);
  }
}
