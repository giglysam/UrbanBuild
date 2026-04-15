import * as turf from "@turf/turf";
import type { Feature, FeatureCollection, Polygon } from "geojson";

export type OverpassElement = {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

export type OverpassResponse = {
  elements: OverpassElement[];
  remark?: string;
};

/** Build a circular study polygon (approximate geodesic circle as Turf ellipse on local tangent plane). */
export function studyPolygon(lat: number, lng: number, radiusM: number): Feature<Polygon> {
  const steps = 64;
  const coords: [number, number][] = [];
  const latRad = (lat * Math.PI) / 180;
  const metersPerDegLat = 111_320;
  const metersPerDegLng = Math.max(1, 111_320 * Math.cos(latRad));
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2;
    const dx = (radiusM * Math.cos(t)) / metersPerDegLng;
    const dy = (radiusM * Math.sin(t)) / metersPerDegLat;
    coords.push([lng + dx, lat + dy]);
  }
  return turf.polygon([coords]);
}

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
  featureCollection: FeatureCollection;
  stats: {
    buildingWays: number;
    highwayWays: number;
    parkLike: number;
    amenityNodes: number;
  };
} {
  const study = studyPolygon(lat, lng, radiusM);
  const studyAreaKm2 = turf.area(study) / 1_000_000;

  const features: Feature[] = [];
  let buildingWays = 0;
  let highwayWays = 0;
  let parkLike = 0;
  let amenityNodes = 0;

  for (const el of overpass.elements) {
    const c = coordsFromElement(el);
    if (!c) continue;
    const pt = turf.point(c);
    if (!turf.booleanPointInPolygon(pt, study)) continue;

    const t = el.tags ?? {};
    const kind =
      t.building || t["building:part"]
        ? "building"
        : t.highway
          ? "highway"
          : t.leisure === "park" ||
              t.landuse === "recreation_ground" ||
              t.natural === "wood"
            ? "park_like"
            : t.amenity
              ? "amenity"
              : "other";

    if (kind === "building") buildingWays += 1;
    if (kind === "highway") highwayWays += 1;
    if (kind === "park_like") parkLike += 1;
    if (kind === "amenity") amenityNodes += 1;

    features.push({
      type: "Feature",
      geometry: { type: "Point", coordinates: c },
      properties: {
        osmType: el.type,
        osmId: el.id,
        kind,
        name: tag(el, "name"),
        ...t,
      },
    });
  }

  const density = studyAreaKm2 > 0 ? buildingWays / studyAreaKm2 : 0;

  const indicators: Record<string, number | string> = {
    study_radius_m: radiusM,
    study_area_km2: Number(studyAreaKm2.toFixed(3)),
    osm_building_features_in_buffer: buildingWays,
    osm_highway_features_in_buffer: highwayWays,
    osm_park_like_features_in_buffer: parkLike,
    osm_amenity_nodes_in_buffer: amenityNodes,
    building_density_proxy_per_km2: Number(density.toFixed(1)),
    data_basis: "OpenStreetMap (community tags; not official zoning)",
  };

  return {
    indicators,
    featureCollection: { type: "FeatureCollection", features },
    stats: { buildingWays, highwayWays, parkLike, amenityNodes },
  };
}

/** Heuristic ring area for Beirut pilot (coastal band). Not authoritative. */
export function beirutContextNote(lat: number, lng: number): string {
  const coast = lng > 35.48 && lng < 35.55 && lat > 33.85 && lat < 33.95;
  return coast
    ? "Pilot area overlaps the Beirut coastal corridor; OSM completeness varies by district."
    : "Study centroid is outside the dense Beirut core; OSM coverage may be sparse.";
}
