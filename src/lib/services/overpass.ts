import { OVERPASS_FETCH_MS } from "@/lib/api/http";
import { getServerEnv } from "@/env/server";
import type { OverpassElement, OverpassResponse } from "@/lib/geo/overpass-types";

const DEFAULT_ENDPOINT = "https://overpass-api.de/api/interpreter";

/** Public mirrors used when the primary instance returns 502/503/504 for every attempt. */
const FALLBACK_OVERPASS_ENDPOINTS = [
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.openstreetmap.fr/api/interpreter",
] as const;

const RETRYABLE_STATUS = new Set([502, 503, 504]);
const MAX_OVERPASS_ATTEMPTS = 3;

function uniqueEndpointChain(primary: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const u of [primary, ...FALLBACK_OVERPASS_ENDPOINTS]) {
    if (seen.has(u)) continue;
    seen.add(u);
    out.push(u);
  }
  return out;
}

const Q_TIMEOUT = 25;

/**
 * Batched Overpass queries for the 10 site-feasibility OSM layers.
 * Split to reduce 504 timeouts on public instances while staying within one study radius.
 */
export function buildAroundQueryParts(lat: number, lng: number, radiusM: number): string[] {
  const r = Math.round(radiusM);
  const head = `[out:json][timeout:${Q_TIMEOUT}];`;
  const around = `around:${r},${lat},${lng}`;

  return [
    `${head}
(
  nwr(${around})["building"];
  nwr(${around})["highway"];
  nwr(${around})["public_transport"];
  nwr(${around})["railway"~"^(station|halt|tram_stop|subway_entrance|stop)$"];
);
out center;`,
    `${head}
(
  nwr(${around})["leisure"];
  nwr(${around})["landuse"];
  nwr(${around})["natural"];
);
out center;`,
    `${head}
(
  nwr(${around})["amenity"];
  nwr(${around})["shop"];
  nwr(${around})["office"];
);
out center;`,
  ].map((q) => q.trim());
}

function mergeOverpassResponses(responses: OverpassResponse[]): OverpassResponse {
  const seen = new Set<string>();
  const elements: OverpassElement[] = [];
  let remark: string | undefined;

  for (const res of responses) {
    if (res.remark) remark = res.remark;
    for (const el of res.elements) {
      const k = `${el.type}/${el.id}`;
      if (seen.has(k)) continue;
      seen.add(k);
      elements.push(el);
    }
  }

  return { elements, remark };
}

async function postOverpassQuery(ep: string, query: string): Promise<OverpassResponse> {
  const body = new URLSearchParams({ data: query }).toString();
  const res = await fetch(ep, {
    method: "POST",
    body,
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
    next: { revalidate: 0 },
    signal: AbortSignal.timeout(OVERPASS_FETCH_MS),
  });
  const text = await res.text();
  if (!res.ok) {
    return Promise.reject({ status: res.status, text });
  }
  return JSON.parse(text) as OverpassResponse;
}

export async function fetchOverpassContext(
  lat: number,
  lng: number,
  radiusM: number,
  endpoint = getServerEnv().OVERPASS_API_URL ?? DEFAULT_ENDPOINT,
): Promise<OverpassResponse> {
  const queries = buildAroundQueryParts(lat, lng, radiusM);
  const chain = uniqueEndpointChain(endpoint);

  let lastText = "";

  endpointLoop: for (let epIdx = 0; epIdx < chain.length; epIdx++) {
    const ep = chain[epIdx];
    const moreMirrors = epIdx < chain.length - 1;

    for (let attempt = 0; attempt < MAX_OVERPASS_ATTEMPTS; attempt++) {
      try {
        const parts: OverpassResponse[] = [];
        for (const q of queries) {
          parts.push(await postOverpassQuery(ep, q));
        }
        return mergeOverpassResponses(parts);
      } catch (err: unknown) {
        const status =
          err && typeof err === "object" && "status" in err && typeof err.status === "number"
            ? err.status
            : 0;
        lastText =
          err && typeof err === "object" && "text" in err && typeof err.text === "string"
            ? err.text
            : err instanceof Error
              ? err.message
              : "";

        const willRetry = RETRYABLE_STATUS.has(status) && attempt < MAX_OVERPASS_ATTEMPTS - 1;
        if (willRetry) continue;

        const canFailover = RETRYABLE_STATUS.has(status) && moreMirrors;
        if (canFailover) continue endpointLoop;

        if (status === 504) {
          throw new Error(
            "Overpass timed out on all tried mirrors (public servers busy or area too large). Try a smaller study radius or retry later.",
          );
        }
        if (status > 0) {
          throw new Error(`Overpass error ${status}: ${lastText.slice(0, 400)}`);
        }
        throw err instanceof Error ? err : new Error("Overpass request failed");
      }
    }
  }

  throw new Error(`Overpass error: ${lastText.slice(0, 400)}`);
}
