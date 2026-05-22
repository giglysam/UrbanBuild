import * as turf from "@turf/turf";
import { z } from "zod";

import { classifyOsmFeature } from "@/lib/geo/osm-categories";
import type { OverpassElement, OverpassResponse } from "@/lib/geo/overpass-types";
import { studyPolygon } from "@/lib/geo/overpass-types";

/** Default study radius for pinned-site OSM metrics. */
export const DEFAULT_STUDY_RADIUS_M = 400;

const MAJOR_ROAD_HIGHWAYS = new Set([
  "motorway",
  "motorway_link",
  "trunk",
  "trunk_link",
  "primary",
  "primary_link",
]);

const ROAD_HIGHWAYS_EXCLUDE_TRANSIT = new Set(["bus_stop", "bus_guideway", "platform"]);

const JUNCTION_VALUES = new Set(["yes", "roundabout", "circular", "intersection", "jughandle"]);

/** Canonical counts computed for every pinned site inside the study buffer. */
export const siteBufferMetricsSchema = z.object({
  studyRadiusMeters: z.number().positive(),
  buildingCount: z.number().nonnegative(),
  roadCount: z.number().nonnegative(),
  majorRoadCount: z.number().nonnegative(),
  intersectionCount: z.number().nonnegative(),
  schoolCount: z.number().nonnegative(),
  hospitalCount: z.number().nonnegative(),
  religiousBuildingCount: z.number().nonnegative(),
  parkCount: z.number().nonnegative(),
  parkingCount: z.number().nonnegative(),
  publicTransportStopCount: z.number().nonnegative(),
  sportsFacilityCount: z.number().nonnegative(),
  commercialPoiCount: z.number().nonnegative(),
  greenSpaceCount: z.number().nonnegative(),
});
export type SiteBufferMetrics = z.infer<typeof siteBufferMetricsSchema>;

export function emptySiteBufferMetrics(radiusM = DEFAULT_STUDY_RADIUS_M): SiteBufferMetrics {
  return {
    studyRadiusMeters: radiusM,
    buildingCount: 0,
    roadCount: 0,
    majorRoadCount: 0,
    intersectionCount: 0,
    schoolCount: 0,
    hospitalCount: 0,
    religiousBuildingCount: 0,
    parkCount: 0,
    parkingCount: 0,
    publicTransportStopCount: 0,
    sportsFacilityCount: 0,
    commercialPoiCount: 0,
    greenSpaceCount: 0,
  };
}

function coordsFromElement(el: OverpassElement): [number, number] | null {
  if (typeof el.lat === "number" && typeof el.lon === "number") return [el.lon, el.lat];
  if (el.center) return [el.center.lon, el.center.lat];
  return null;
}

/** Named parks / recreation grounds (subset of green space). */
export function isStrictPark(tags: Record<string, string>): boolean {
  return (
    tags.leisure === "park" ||
    tags.landuse === "recreation_ground" ||
    tags.leisure === "nature_reserve"
  );
}

/** All mapped green / open-space features (broader than parkCount). */
export function isGreenSpaceFeature(tags: Record<string, string>): boolean {
  return classifyOsmFeature(tags) === "parks_green";
}

function isRoadHighway(highway: string): boolean {
  return !ROAD_HIGHWAYS_EXCLUDE_TRANSIT.has(highway);
}

function coordBucket(lng: number, lat: number): string {
  return `${lng.toFixed(5)},${lat.toFixed(5)}`;
}

/**
 * Compute the 13 buffer metrics from Overpass elements inside the study polygon.
 */
export function computeSiteBufferMetrics(
  lat: number,
  lng: number,
  radiusM: number,
  overpass: OverpassResponse,
): SiteBufferMetrics {
  const study = studyPolygon(lat, lng, radiusM);
  const metrics = emptySiteBufferMetrics(radiusM);

  let taggedJunctions = 0;
  const roadClassesAtPoint = new Map<string, Set<string>>();

  for (const el of overpass.elements) {
    const c = coordsFromElement(el);
    if (!c) continue;
    if (!turf.booleanPointInPolygon(turf.point(c), study)) continue;

    const t = el.tags ?? {};
    const category = classifyOsmFeature(t);

    if (category === "buildings") metrics.buildingCount += 1;
    if (category === "schools") metrics.schoolCount += 1;
    if (category === "hospitals") metrics.hospitalCount += 1;
    if (category === "religious") metrics.religiousBuildingCount += 1;
    if (category === "parking") metrics.parkingCount += 1;
    if (category === "public_transport") metrics.publicTransportStopCount += 1;
    if (category === "sports") metrics.sportsFacilityCount += 1;
    if (category === "commercial") metrics.commercialPoiCount += 1;

    if (isGreenSpaceFeature(t)) metrics.greenSpaceCount += 1;
    if (isStrictPark(t)) metrics.parkCount += 1;

    const highway = t.highway;
    if (highway && isRoadHighway(highway)) {
      metrics.roadCount += 1;
      if (MAJOR_ROAD_HIGHWAYS.has(highway)) metrics.majorRoadCount += 1;

      const bucket = coordBucket(c[0], c[1]);
      if (!roadClassesAtPoint.has(bucket)) roadClassesAtPoint.set(bucket, new Set());
      roadClassesAtPoint.get(bucket)!.add(highway);

      if (t.junction && JUNCTION_VALUES.has(t.junction)) taggedJunctions += 1;
    }
  }

  let clusterIntersections = 0;
  for (const classes of roadClassesAtPoint.values()) {
    if (classes.size >= 2) clusterIntersections += 1;
  }

  metrics.intersectionCount = taggedJunctions + clusterIntersections;

  return metrics;
}

/** Merge metrics into flat indicator map (API / UI). */
export function siteBufferMetricsToIndicators(
  metrics: SiteBufferMetrics,
  studyAreaKm2: number,
): Record<string, number | string> {
  return {
    study_radius_m: metrics.studyRadiusMeters,
    study_area_km2: Number(studyAreaKm2.toFixed(3)),
    buildingCount: metrics.buildingCount,
    roadCount: metrics.roadCount,
    majorRoadCount: metrics.majorRoadCount,
    intersectionCount: metrics.intersectionCount,
    schoolCount: metrics.schoolCount,
    hospitalCount: metrics.hospitalCount,
    religiousBuildingCount: metrics.religiousBuildingCount,
    parkCount: metrics.parkCount,
    parkingCount: metrics.parkingCount,
    publicTransportStopCount: metrics.publicTransportStopCount,
    sportsFacilityCount: metrics.sportsFacilityCount,
    commercialPoiCount: metrics.commercialPoiCount,
    greenSpaceCount: metrics.greenSpaceCount,
    building_density_proxy_per_km2:
      studyAreaKm2 > 0 ? Number((metrics.buildingCount / studyAreaKm2).toFixed(1)) : 0,
    osm_buildings_in_buffer: metrics.buildingCount,
    osm_roads_in_buffer: metrics.roadCount,
    osm_major_roads_in_buffer: metrics.majorRoadCount,
    osm_intersections_in_buffer: metrics.intersectionCount,
    osm_schools_in_buffer: metrics.schoolCount,
    osm_hospitals_in_buffer: metrics.hospitalCount,
    osm_religious_in_buffer: metrics.religiousBuildingCount,
    osm_parks_in_buffer: metrics.parkCount,
    osm_parking_in_buffer: metrics.parkingCount,
    osm_public_transport_in_buffer: metrics.publicTransportStopCount,
    osm_sports_facilities_in_buffer: metrics.sportsFacilityCount,
    osm_commercial_pois_in_buffer: metrics.commercialPoiCount,
    osm_green_space_in_buffer: metrics.greenSpaceCount,
    data_basis: "OpenStreetMap via Overpass (400 m study buffer metrics)",
  };
}
