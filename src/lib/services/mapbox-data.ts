import "server-only";

import { getServerEnv } from "@/env/server";
import {
  mapboxContextBundleSchema,
  mapboxIsochroneSchema,
  mapboxMatrixCellSchema,
  mapboxPlaceSchema,
  mapboxPoiFeatureSchema,
  mapboxProfileSchema,
  mapboxRouteSchema,
  mapboxSearchRetrieveSchema,
  mapboxSearchSuggestItemSchema,
  type LngLat,
  type MapboxContextBundle,
  type MapboxProfile,
} from "@/lib/types/planning";

function getToken() {
  const token = getServerEnv().NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token) throw new Error("NEXT_PUBLIC_MAPBOX_TOKEN is not configured");
  return token;
}

async function mapboxFetchJson(url: URL) {
  const res = await fetch(url.toString(), { next: { revalidate: 0 } });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Mapbox request failed (${res.status}): ${detail.slice(0, 200)}`);
  }
  return res.json() as Promise<unknown>;
}

export async function mapboxForwardSearch(query: string, limit = 5) {
  const token = getToken();
  const url = new URL(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json`);
  url.searchParams.set("access_token", token);
  url.searchParams.set("limit", String(limit));
  const json = (await mapboxFetchJson(url)) as {
    features?: { center: [number, number]; text?: string; place_name?: string }[];
  };
  return (json.features ?? []).map((f) =>
    mapboxPlaceSchema.parse({
      name: f.text ?? "Unnamed place",
      fullAddress: f.place_name ?? f.text ?? "Unknown",
      point: { lng: f.center[0], lat: f.center[1] },
    }),
  );
}

export async function mapboxSearchSuggest(args: {
  query: string;
  proximity?: LngLat;
  limit?: number;
  sessionToken?: string;
}) {
  const token = getToken();
  const url = new URL("https://api.mapbox.com/search/searchbox/v1/suggest");
  url.searchParams.set("q", args.query);
  url.searchParams.set("access_token", token);
  url.searchParams.set("limit", String(Math.max(1, Math.min(10, args.limit ?? 6))));
  if (args.proximity) url.searchParams.set("proximity", `${args.proximity.lng},${args.proximity.lat}`);
  if (args.sessionToken?.trim()) url.searchParams.set("session_token", args.sessionToken.trim());
  const json = (await mapboxFetchJson(url)) as {
    suggestions?: { mapbox_id?: string; name?: string; full_address?: string }[];
  };
  return (json.suggestions ?? [])
    .filter((s) => s.mapbox_id)
    .map((s) =>
      mapboxSearchSuggestItemSchema.parse({
        mapboxId: s.mapbox_id,
        name: s.name ?? "Unnamed",
        fullAddress: s.full_address ?? s.name ?? "Unknown",
      }),
    );
}

export async function mapboxSearchRetrieve(args: { mapboxId: string; sessionToken?: string }) {
  const token = getToken();
  const url = new URL("https://api.mapbox.com/search/searchbox/v1/retrieve");
  url.searchParams.set("access_token", token);
  url.searchParams.set("mapbox_id", args.mapboxId);
  if (args.sessionToken?.trim()) url.searchParams.set("session_token", args.sessionToken.trim());
  const json = (await mapboxFetchJson(url)) as {
    features?: {
      properties?: { mapbox_id?: string; name?: string; full_address?: string };
      geometry?: { coordinates?: [number, number] };
    }[];
  };
  const f = json.features?.[0];
  if (!f?.geometry?.coordinates) return null;
  return mapboxSearchRetrieveSchema.parse({
    mapboxId: f.properties?.mapbox_id ?? args.mapboxId,
    name: f.properties?.name ?? "Unnamed",
    fullAddress: f.properties?.full_address ?? f.properties?.name ?? "Unknown",
    point: { lng: f.geometry.coordinates[0], lat: f.geometry.coordinates[1] },
  });
}

export async function mapboxReverseGeocode(center: LngLat) {
  const token = getToken();
  const url = new URL(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(`${center.lng},${center.lat}`)}.json`,
  );
  url.searchParams.set("access_token", token);
  url.searchParams.set("limit", "1");
  const json = (await mapboxFetchJson(url)) as {
    features?: { center: [number, number]; text?: string; place_name?: string }[];
  };
  const f = json.features?.[0];
  if (!f) return null;
  return mapboxPlaceSchema.parse({
    name: f.text ?? "Unnamed place",
    fullAddress: f.place_name ?? f.text ?? "Unknown",
    point: { lng: f.center[0], lat: f.center[1] },
  });
}

export async function mapboxDirections(args: {
  from: LngLat;
  to: LngLat;
  profile: MapboxProfile;
}) {
  const token = getToken();
  mapboxProfileSchema.parse(args.profile);
  const url = new URL(
    `https://api.mapbox.com/directions/v5/mapbox/${args.profile}/${args.from.lng},${args.from.lat};${args.to.lng},${args.to.lat}`,
  );
  url.searchParams.set("access_token", token);
  url.searchParams.set("geometries", "geojson");
  url.searchParams.set("overview", "full");
  const json = (await mapboxFetchJson(url)) as {
    routes?: { distance: number; duration: number; geometry: unknown }[];
  };
  const r = json.routes?.[0];
  if (!r) return null;
  return mapboxRouteSchema.parse({
    distanceM: r.distance,
    durationS: r.duration,
    geometry: r.geometry,
    profile: args.profile,
  });
}

export async function mapboxIsochrone(args: {
  center: LngLat;
  profile: MapboxProfile;
  contourMinutes: number[];
}) {
  const token = getToken();
  mapboxProfileSchema.parse(args.profile);
  const minutes = args.contourMinutes.map((v) => Math.max(1, Math.min(60, Math.round(v))));
  const url = new URL(
    `https://api.mapbox.com/isochrone/v1/mapbox/${args.profile}/${args.center.lng},${args.center.lat}`,
  );
  url.searchParams.set("access_token", token);
  url.searchParams.set("contours_minutes", minutes.join(","));
  url.searchParams.set("polygons", "true");
  const json = (await mapboxFetchJson(url)) as { type?: string; features?: unknown[] };
  return mapboxIsochroneSchema.parse({
    profile: args.profile,
    contourMinutes: minutes,
    geometry: {
      type: json.type ?? "FeatureCollection",
      features: json.features ?? [],
    },
  });
}

export async function mapboxTilequeryPois(args: {
  center: LngLat;
  radiusM: number;
  limit: number;
}) {
  const token = getToken();
  const url = new URL(
    `https://api.mapbox.com/v4/mapbox.mapbox-streets-v8/tilequery/${args.center.lng},${args.center.lat}.json`,
  );
  url.searchParams.set("access_token", token);
  url.searchParams.set("radius", String(Math.max(50, Math.min(5000, Math.round(args.radiusM)))));
  url.searchParams.set("limit", String(Math.max(1, Math.min(50, Math.round(args.limit)))));
  const json = (await mapboxFetchJson(url)) as {
    features?: {
      geometry?: { coordinates?: [number, number] };
      properties?: { name?: string; class?: string; category?: string; tilequery?: { distance?: number } };
    }[];
  };
  return (json.features ?? [])
    .filter((f) => Array.isArray(f.geometry?.coordinates))
    .map((f) =>
      mapboxPoiFeatureSchema.parse({
        name: f.properties?.name,
        category: f.properties?.category ?? f.properties?.class,
        distanceM: f.properties?.tilequery?.distance,
        point: { lng: f.geometry?.coordinates?.[0] ?? 0, lat: f.geometry?.coordinates?.[1] ?? 0 },
      }),
    );
}

export async function mapboxMatrix(args: {
  profile: MapboxProfile;
  points: LngLat[];
  annotations?: ("distance" | "duration")[];
}) {
  const token = getToken();
  const profile = mapboxProfileSchema.parse(args.profile);
  if (args.points.length < 2) throw new Error("Matrix requires at least 2 points");
  if (args.points.length > 25) throw new Error("Matrix supports up to 25 points");

  const url = new URL(
    `https://api.mapbox.com/directions-matrix/v1/mapbox/${profile}/${args.points.map((p) => `${p.lng},${p.lat}`).join(";")}`,
  );
  url.searchParams.set("access_token", token);
  url.searchParams.set("annotations", (args.annotations?.length ? args.annotations : ["distance", "duration"]).join(","));
  const json = (await mapboxFetchJson(url)) as {
    distances?: (number | null)[][];
    durations?: (number | null)[][];
  };

  const n = args.points.length;
  const cells = [];
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      cells.push(
        mapboxMatrixCellSchema.parse({
          from: i,
          to: j,
          distanceM: json.distances?.[i]?.[j] ?? null,
          durationS: json.durations?.[i]?.[j] ?? null,
        }),
      );
    }
  }
  return {
    profile,
    points: args.points,
    cells,
  };
}

export async function fetchMapboxStaticImage(args: {
  center: LngLat;
  zoom?: number;
  width?: number;
  height?: number;
  style?: "streets-v12" | "light-v11" | "dark-v11" | "satellite-streets-v12";
  marker?: LngLat;
}) {
  const token = getToken();
  const style = args.style ?? "light-v11";
  const width = Math.max(200, Math.min(1280, Math.round(args.width ?? 1200)));
  const height = Math.max(200, Math.min(1280, Math.round(args.height ?? 800)));
  const zoom = Math.max(1, Math.min(20, args.zoom ?? 13));
  const marker = args.marker ?? args.center;
  const overlay = `pin-s+1d4ed8(${marker.lng},${marker.lat})`;
  const url = new URL(
    `https://api.mapbox.com/styles/v1/mapbox/${style}/static/${overlay}/${args.center.lng},${args.center.lat},${zoom}/${width}x${height}`,
  );
  url.searchParams.set("access_token", token);
  const res = await fetch(url.toString(), { next: { revalidate: 0 } });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Mapbox static image failed (${res.status}): ${detail.slice(0, 200)}`);
  }
  return res.arrayBuffer();
}

export async function buildMapboxContextBundle(input: {
  center: LngLat;
  radiusM: number;
  searchQuery?: string;
  destination?: LngLat;
  profile?: MapboxProfile;
  contourMinutes?: number[];
}) {
  const profile = input.profile ?? "walking";
  const contourMinutes = input.contourMinutes?.length ? input.contourMinutes : [10, 20];
  const reverse = await mapboxReverseGeocode(input.center);
  const searches = input.searchQuery?.trim() ? await mapboxForwardSearch(input.searchQuery.trim(), 5) : [];
  const route = input.destination
    ? await mapboxDirections({ from: input.center, to: input.destination, profile }).catch(() => null)
    : null;
  const isochrone = await mapboxIsochrone({
    center: input.center,
    profile,
    contourMinutes,
  }).catch(() => null);
  const pois = await mapboxTilequeryPois({
    center: input.center,
    radiusM: input.radiusM,
    limit: 25,
  }).catch(() => []);

  const textualContext = toTextContext({
    center: input.center,
    reverse,
    searches,
    route,
    isochrone,
    pois,
    radiusM: input.radiusM,
    profile,
  });

  return mapboxContextBundleSchema.parse({
    center: input.center,
    reverseGeocode: reverse ?? undefined,
    searchResults: searches,
    routeToDestination: route ?? undefined,
    isochrone: isochrone ?? undefined,
    nearbyPois: pois,
    textualContext,
    sources: [
      "Mapbox Geocoding API",
      "Mapbox Directions API",
      "Mapbox Isochrone API",
      "Mapbox Tilequery API (mapbox-streets-v8)",
    ],
  });
}

function toTextContext(input: {
  center: LngLat;
  reverse: Awaited<ReturnType<typeof mapboxReverseGeocode>>;
  searches: Awaited<ReturnType<typeof mapboxForwardSearch>>;
  route: Awaited<ReturnType<typeof mapboxDirections>> | null;
  isochrone: Awaited<ReturnType<typeof mapboxIsochrone>> | null;
  pois: Awaited<ReturnType<typeof mapboxTilequeryPois>>;
  radiusM: number;
  profile: MapboxProfile;
}) {
  const lines: string[] = [];
  lines.push(`Map center: ${input.center.lat.toFixed(5)}, ${input.center.lng.toFixed(5)}. Radius: ${input.radiusM}m.`);
  if (input.reverse) lines.push(`Primary place: ${input.reverse.fullAddress}.`);
  if (input.searches.length) {
    lines.push(`Search hits: ${input.searches.slice(0, 5).map((s) => s.fullAddress).join(" | ")}.`);
  }
  if (input.route) {
    lines.push(
      `Route (${input.route.profile}): ${(input.route.distanceM / 1000).toFixed(2)} km, ${(input.route.durationS / 60).toFixed(0)} min.`,
    );
  }
  if (input.isochrone) {
    lines.push(`Isochrone profile ${input.profile}; contours (min): ${input.isochrone.contourMinutes.join(", ")}.`);
  }
  if (input.pois.length) {
    const topCategories = summarizeCategories(input.pois.map((p) => p.category ?? "unknown"));
    lines.push(`Nearby POIs (${input.pois.length}): ${topCategories}.`);
  }
  lines.push(
    "Use this context to support planning decisions; if legal/regulatory certainty is required, request official municipal sources.",
  );
  return lines.join("\n");
}

function summarizeCategories(categories: string[]) {
  const counts = new Map<string, number>();
  for (const c of categories) counts.set(c, (counts.get(c) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([k, v]) => `${k} (${v})`)
    .join(", ");
}

export async function executeMapboxActionPlan(args: {
  center: LngLat;
  radiusM: number;
  destination?: LngLat;
  profile?: MapboxProfile;
  actions: {
    type: "show_route" | "show_isochrone" | "show_pois" | "clear_overlays" | "set_center" | "set_style";
    destination?: LngLat;
    profile?: MapboxProfile;
    contourMinutes?: number[];
    query?: string;
    style?: "streets-v12" | "light-v11" | "dark-v11" | "satellite-streets-v12";
  }[];
}) {
  let nextCenter = args.center;
  let style: "streets-v12" | "light-v11" | "dark-v11" | "satellite-streets-v12" | null = null;
  let route: Awaited<ReturnType<typeof mapboxDirections>> | null = null;
  let isochrone: Awaited<ReturnType<typeof mapboxIsochrone>> | null = null;
  let pois: Awaited<ReturnType<typeof mapboxTilequeryPois>> = [];

  for (const action of args.actions) {
    if (action.type === "clear_overlays") {
      route = null;
      isochrone = null;
      pois = [];
      continue;
    }
    if (action.type === "set_style" && action.style) {
      style = action.style;
      continue;
    }
    if (action.type === "set_center" && action.destination) {
      nextCenter = action.destination;
      continue;
    }
    if (action.type === "show_route") {
      const to = action.destination ?? args.destination;
      if (to) {
        route = await mapboxDirections({
          from: nextCenter,
          to,
          profile: action.profile ?? args.profile ?? "walking",
        });
      }
      continue;
    }
    if (action.type === "show_isochrone") {
      isochrone = await mapboxIsochrone({
        center: nextCenter,
        profile: action.profile ?? args.profile ?? "walking",
        contourMinutes: action.contourMinutes?.length ? action.contourMinutes : [10, 20],
      });
      continue;
    }
    if (action.type === "show_pois") {
      pois = await mapboxTilequeryPois({ center: nextCenter, radiusM: args.radiusM, limit: 30 });
    }
  }

  const context = await buildMapboxContextBundle({
    center: nextCenter,
    radiusM: args.radiusM,
    destination: args.destination,
    profile: args.profile,
  });
  return {
    center: nextCenter,
    style,
    route,
    isochrone,
    pois,
    context,
  };
}
