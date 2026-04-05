import * as turf from "@turf/turf";
import { bboxFromCenterRadiusM, overpassBboxString } from "@/lib/geo/bbox";

export type OverpassElement = {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  tags?: Record<string, string>;
  geometry?: { lat: number; lon: number }[];
};

export type OverpassResponse = {
  elements: OverpassElement[];
};

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

function buildQuery(bboxStr: string) {
  return `
[out:json][timeout:25];
(
  way["highway"](${bboxStr});
  way["building"](${bboxStr});
  node["amenity"](${bboxStr});
  node["shop"](${bboxStr});
  node["highway"~"^(traffic_signals|stop|motorway_junction|crossing)$"](${bboxStr});
  node["public_transport"="stop_position"](${bboxStr});
  node["railway"="tram_stop"](${bboxStr});
  node["highway"="bus_stop"](${bboxStr});
  node["railway"="station"](${bboxStr});
  way["natural"="coastline"](${bboxStr});
  way["leisure"~"^(park|garden)$"](${bboxStr});
  node["leisure"~"^(park|garden)$"](${bboxStr});
  node["amenity"="school"](${bboxStr});
  way["amenity"="school"](${bboxStr});
  node["amenity"="hospital"](${bboxStr});
  node["amenity"="clinic"](${bboxStr});
  node["amenity"="doctors"](${bboxStr});
);
out body geom;
`;
}

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

export async function fetchOverpassForSite(
  lng: number,
  lat: number,
  radiusM: number,
): Promise<OverpassResponse> {
  const bbox = bboxFromCenterRadiusM(lng, lat, radiusM);
  const q = buildQuery(overpassBboxString(bbox));
  let lastErr: Error | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(OVERPASS_URL, {
        method: "POST",
        body: `data=${encodeURIComponent(q)}`,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "UrbanBuild/1.0 (Next.js; OSM planning demo)",
        },
        cache: "no-store",
      });
      if (res.status === 429 || res.status >= 500) {
        await sleep(2000 * (attempt + 1));
        continue;
      }
      if (!res.ok) {
        throw new Error(`Overpass HTTP ${res.status}`);
      }
      const json = (await res.json()) as OverpassResponse;
      return json;
    } catch (e) {
      lastErr = e instanceof Error ? e : new Error(String(e));
      await sleep(1500 * (attempt + 1));
    }
  }
  throw lastErr ?? new Error("Overpass request failed");
}

export function wayLengthM(way: OverpassElement): number {
  if (!way.geometry?.length) return 0;
  const coords = way.geometry.map((g) => [g.lon, g.lat] as [number, number]);
  if (coords.length < 2) return 0;
  let len = 0;
  for (let i = 1; i < coords.length; i++) {
    const a = turf.point(coords[i - 1]);
    const b = turf.point(coords[i]);
    len += turf.distance(a, b, { units: "kilometers" }) * 1000;
  }
  return len;
}

export function minDistanceToCoastlineM(
  lng: number,
  lat: number,
  coastlineWays: OverpassElement[],
): number | null {
  if (!coastlineWays.length) return null;
  const pt = turf.point([lng, lat]);
  let min = Infinity;
  for (const w of coastlineWays) {
    if (!w.geometry?.length) continue;
    const coords = w.geometry.map((g) => [g.lon, g.lat] as [number, number]);
    for (const c of coords) {
      const d = turf.distance(pt, turf.point(c), { units: "kilometers" }) * 1000;
      if (d < min) min = d;
    }
  }
  return Number.isFinite(min) ? min : null;
}
