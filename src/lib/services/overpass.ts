import { OVERPASS_FETCH_MS } from "@/lib/api/http";
import { getServerEnv } from "@/env/server";
import type { OverpassElement, OverpassResponse } from "@/lib/geo/indicators";

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

const Q_TIMEOUT = 20;

/** Two lighter queries reduce per-request load on public Overpass instances (fewer 504s than one large union). */
function buildAroundQueryParts(lat: number, lng: number, radiusM: number): [string, string] {
  const r = Math.round(radiusM);
  const head = `[out:json][timeout:${Q_TIMEOUT}];`;
  const q1 = `${head}
(
  nwr(around:${r},${lat},${lng})["building"];
  nwr(around:${r},${lat},${lng})["highway"];
);
out center;`;
  const q2 = `${head}
(
  nwr(around:${r},${lat},${lng})["leisure"];
  nwr(around:${r},${lat},${lng})["landuse"];
  nwr(around:${r},${lat},${lng})["natural"];
  nwr(around:${r},${lat},${lng})["amenity"];
);
out center;`;
  return [q1.trim(), q2.trim()];
}

function mergeOverpassResponses(a: OverpassResponse, b: OverpassResponse): OverpassResponse {
  const seen = new Set<string>();
  const elements: OverpassElement[] = [];
  for (const el of a.elements) {
    const k = `${el.type}/${el.id}`;
    if (seen.has(k)) continue;
    seen.add(k);
    elements.push(el);
  }
  for (const el of b.elements) {
    const k = `${el.type}/${el.id}`;
    if (seen.has(k)) continue;
    seen.add(k);
    elements.push(el);
  }
  return { elements, remark: a.remark ?? b.remark };
}

export async function fetchOverpassContext(
  lat: number,
  lng: number,
  radiusM: number,
  endpoint = getServerEnv().OVERPASS_API_URL ?? DEFAULT_ENDPOINT,
): Promise<OverpassResponse> {
  const [query1, query2] = buildAroundQueryParts(lat, lng, radiusM);
  const chain = uniqueEndpointChain(endpoint);

  let lastText = "";

  endpointLoop: for (let epIdx = 0; epIdx < chain.length; epIdx++) {
    const ep = chain[epIdx];
    const moreMirrors = epIdx < chain.length - 1;

    for (let attempt = 0; attempt < MAX_OVERPASS_ATTEMPTS; attempt++) {
      const postQuery = async (q: string) => {
        const body = new URLSearchParams({ data: q }).toString();
        return fetch(ep, {
          method: "POST",
          body,
          headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
          next: { revalidate: 0 },
          signal: AbortSignal.timeout(OVERPASS_FETCH_MS),
        });
      };

      const res1 = await postQuery(query1);
      let res: Response;

      if (!res1.ok) {
        res = res1;
        lastText = await res1.text();
      } else {
        const res2 = await postQuery(query2);
        if (!res2.ok) {
          res = res2;
          lastText = await res2.text();
          void res1.body?.cancel?.();
        } else {
          const j1 = (await res1.json()) as OverpassResponse;
          const j2 = (await res2.json()) as OverpassResponse;
          return mergeOverpassResponses(j1, j2);
        }
      }

      const willRetry =
        RETRYABLE_STATUS.has(res.status) && attempt < MAX_OVERPASS_ATTEMPTS - 1;
      if (willRetry) {
        continue;
      }

      const canFailover = RETRYABLE_STATUS.has(res.status) && moreMirrors;
      if (canFailover) {
        continue endpointLoop;
      }

      if (res.status === 504) {
        throw new Error(
          "Overpass timed out on all tried mirrors (public servers busy or area too large). Try a smaller study radius or retry later.",
        );
      }
      throw new Error(`Overpass error ${res.status}: ${lastText.slice(0, 400)}`);
    }
  }

  throw new Error(`Overpass error: ${lastText.slice(0, 400)}`);
}
