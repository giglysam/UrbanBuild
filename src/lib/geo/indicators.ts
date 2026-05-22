import * as turf from "@turf/turf";
import type { Feature, FeatureCollection } from "geojson";

import { classifyOsmFeature, type OsmSiteCategory } from "@/lib/geo/osm-categories";
import {
  computeSiteBufferMetrics,
  siteBufferMetricsToIndicators,
  type SiteBufferMetrics,
} from "@/lib/geo/site-buffer-metrics";
import type { OverpassElement, OverpassResponse } from "@/lib/geo/overpass-types";
import { studyPolygon } from "@/lib/geo/overpass-types";

export type { OverpassElement, OverpassResponse } from "@/lib/geo/overpass-types";
export { studyPolygon } from "@/lib/geo/overpass-types";
export type { SiteBufferMetrics } from "@/lib/geo/site-buffer-metrics";
export { computeSiteBufferMetrics, DEFAULT_STUDY_RADIUS_M } from "@/lib/geo/site-buffer-metrics";

export type OsmLayerStats = Record<OsmSiteCategory, number>;

function coordsFromElement(el: OverpassElement): [number, number] | null {
  if (typeof el.lat === "number" && typeof el.lon === "number") {
    return [el.lon, el.lat];
  }
  if (el.center) {
    return [el.center.lon, el.center.lat];
  }
  return null;
}

function tag(el: OverpassElement, k: string): string | undefined {
  return el.tags?.[k];
}

export function computeIndicators(
  lat: number,
  lng: number,
  radiusM: number,
  overpass: OverpassResponse,
): {
  indicators: Record<string, number | string>;
  bufferMetrics: SiteBufferMetrics;
  featureCollection: FeatureCollection;
  stats: SiteBufferMetrics & {
    buildingWays: number;
    highwayWays: number;
    parkLike: number;
    amenityNodes: number;
  };
} {
  const study = studyPolygon(lat, lng, radiusM);
  const studyAreaKm2 = turf.area(study) / 1_000_000;
  const bufferMetrics = computeSiteBufferMetrics(lat, lng, radiusM, overpass);

  const features: Feature[] = [];
  let amenityNodes = 0;

  for (const el of overpass.elements) {
    const c = coordsFromElement(el);
    if (!c) continue;
    const pt = turf.point(c);
    if (!turf.booleanPointInPolygon(pt, study)) continue;

    const t = el.tags ?? {};
    const kind = classifyOsmFeature(t);
    if (t.amenity) amenityNodes += 1;

    features.push({
      type: "Feature",
      geometry: { type: "Point", coordinates: c },
      properties: {
        osmType: el.type,
        osmId: el.id,
        kind: kind ?? "other",
        name: tag(el, "name"),
        ...t,
      },
    });
  }

  const indicators = siteBufferMetricsToIndicators(bufferMetrics, studyAreaKm2);

  return {
    indicators,
    bufferMetrics,
    featureCollection: { type: "FeatureCollection", features },
    stats: {
      ...bufferMetrics,
      buildingWays: bufferMetrics.buildingCount,
      highwayWays: bufferMetrics.roadCount,
      parkLike: bufferMetrics.greenSpaceCount,
      amenityNodes,
    },
  };
}

/** Heuristic ring area for Beirut pilot (coastal band). Not authoritative. */
export function beirutContextNote(lat: number, lng: number): string {
  const coast = lng > 35.48 && lng < 35.55 && lat > 33.85 && lat < 33.95;
  return coast
    ? "Pilot area overlaps the Beirut coastal corridor; OSM completeness varies by district."
    : "Study centroid is outside the dense Beirut core; OSM coverage may be sparse.";
}
