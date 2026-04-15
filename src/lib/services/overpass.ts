import { OVERPASS_FETCH_MS } from "@/lib/api/http";
import { getServerEnv } from "@/env/server";
import type { OverpassResponse } from "@/lib/geo/indicators";

const DEFAULT_ENDPOINT = "https://overpass-api.de/api/interpreter";

export function buildAroundQuery(lat: number, lng: number, radiusM: number): string {
  const r = Math.round(radiusM);
  return `
[out:json][timeout:25];
(
  nwr(around:${r},${lat},${lng})["building"];
  nwr(around:${r},${lat},${lng})["highway"];
  nwr(around:${r},${lat},${lng})["leisure"];
  nwr(around:${r},${lat},${lng})["landuse"];
  nwr(around:${r},${lat},${lng})["natural"];
  nwr(around:${r},${lat},${lng})["amenity"];
  nwr(around:${r},${lat},${lng})["waterway"];
);
out center;
`.trim();
}

export async function fetchOverpassContext(
  lat: number,
  lng: number,
  radiusM: number,
  endpoint = getServerEnv().OVERPASS_API_URL ?? DEFAULT_ENDPOINT,
): Promise<OverpassResponse> {
  const body = buildAroundQuery(lat, lng, radiusM);
  const res = await fetch(endpoint, {
    method: "POST",
    body,
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
    next: { revalidate: 0 },
    signal: AbortSignal.timeout(OVERPASS_FETCH_MS),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Overpass error ${res.status}: ${text.slice(0, 400)}`);
  }
  return (await res.json()) as OverpassResponse;
}
