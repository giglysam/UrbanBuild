import { getServerEnv } from "@/env/server";
import { geocodeResultSchema, type GeocodeResult } from "@/lib/types/planning";

async function nominatimSearch(q: string): Promise<GeocodeResult | null> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");
  url.searchParams.set("q", q);
  const res = await fetch(url.toString(), {
    headers: {
      "User-Agent": "UrbanBuild/0.1 (urban planning pilot; contact: local dev)",
      Accept: "application/json",
    },
    next: { revalidate: 0 },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { lat: string; lon: string; display_name: string }[];
  const hit = data[0];
  if (!hit) return null;
  return geocodeResultSchema.parse({
    lat: Number(hit.lat),
    lng: Number(hit.lon),
    label: hit.display_name,
    source: "nominatim",
  });
}

async function mapboxForward(q: string, token: string): Promise<GeocodeResult | null> {
  const url = new URL(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json`,
  );
  url.searchParams.set("access_token", token);
  url.searchParams.set("limit", "1");
  const res = await fetch(url.toString(), { next: { revalidate: 0 } });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    features?: { center: [number, number]; place_name: string }[];
  };
  const f = data.features?.[0];
  if (!f) return null;
  return geocodeResultSchema.parse({
    lat: f.center[1],
    lng: f.center[0],
    label: f.place_name,
    source: "mapbox",
  });
}

async function nominatimReverse(lat: number, lng: number): Promise<GeocodeResult | null> {
  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lng));
  const res = await fetch(url.toString(), {
    headers: {
      "User-Agent": "UrbanBuild/0.1 (urban planning pilot; contact: local dev)",
      Accept: "application/json",
    },
    next: { revalidate: 0 },
  });
  if (!res.ok) return null;
  const hit = (await res.json()) as { lat?: string; lon?: string; display_name?: string };
  if (!hit.display_name || hit.lat == null || hit.lon == null) return null;
  return geocodeResultSchema.parse({
    lat: Number(hit.lat),
    lng: Number(hit.lon),
    label: hit.display_name,
    source: "nominatim",
  });
}

async function mapboxReverse(lat: number, lng: number, token: string): Promise<GeocodeResult | null> {
  const url = new URL(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(`${lng},${lat}`)}.json`,
  );
  url.searchParams.set("access_token", token);
  url.searchParams.set("limit", "1");
  const res = await fetch(url.toString(), { next: { revalidate: 0 } });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    features?: { center: [number, number]; place_name: string }[];
  };
  const f = data.features?.[0];
  if (!f) return null;
  return geocodeResultSchema.parse({
    lat: f.center[1],
    lng: f.center[0],
    label: f.place_name,
    source: "mapbox",
  });
}

/** Reverse geocode coordinates to a place label for chat and analysis context. */
export async function reverseGeocode(lat: number, lng: number): Promise<GeocodeResult> {
  const mapboxToken = getServerEnv().NEXT_PUBLIC_MAPBOX_TOKEN;
  if (mapboxToken) {
    const mb = await mapboxReverse(lat, lng, mapboxToken);
    if (mb) return mb;
  }
  const nom = await nominatimReverse(lat, lng);
  if (nom) return nom;
  throw new Error("No reverse geocoding results");
}

export async function forwardGeocode(q: string): Promise<GeocodeResult> {
  const trimmed = q.trim();
  if (!trimmed) {
    throw new Error("Query is empty");
  }

  const mapboxToken = getServerEnv().NEXT_PUBLIC_MAPBOX_TOKEN;
  if (mapboxToken) {
    const mb = await mapboxForward(trimmed, mapboxToken);
    if (mb) return mb;
  }

  const nom = await nominatimSearch(trimmed);
  if (nom) return nom;

  throw new Error("No geocoding results");
}
