import {
  DEFAULT_STUDY_RADIUS_M,
  siteBufferMetricsSchema,
  type SiteBufferMetrics,
} from "@/lib/geo/site-buffer-metrics";

function num(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

/** Rebuild buffer metrics from stored indicator keys (legacy runs). */
export function bufferMetricsFromIndicators(
  indicators: Record<string, number | string>,
  radiusM = DEFAULT_STUDY_RADIUS_M,
): SiteBufferMetrics | null {
  const hasCamel =
    indicators.buildingCount != null || indicators.roadCount != null;
  const hasLegacy = indicators.osm_buildings_in_buffer != null;

  if (!hasCamel && !hasLegacy) return null;

  const metrics = {
    studyRadiusMeters: num(indicators.study_radius_m) || radiusM,
    buildingCount: num(indicators.buildingCount ?? indicators.osm_buildings_in_buffer),
    roadCount: num(indicators.roadCount ?? indicators.osm_roads_in_buffer),
    majorRoadCount: num(indicators.majorRoadCount ?? indicators.osm_major_roads_in_buffer),
    intersectionCount: num(indicators.intersectionCount ?? indicators.osm_intersections_in_buffer),
    schoolCount: num(indicators.schoolCount ?? indicators.osm_schools_in_buffer),
    hospitalCount: num(indicators.hospitalCount ?? indicators.osm_hospitals_in_buffer),
    religiousBuildingCount: num(
      indicators.religiousBuildingCount ?? indicators.osm_religious_in_buffer,
    ),
    parkCount: num(indicators.parkCount ?? indicators.osm_parks_in_buffer),
    parkingCount: num(indicators.parkingCount ?? indicators.osm_parking_in_buffer),
    publicTransportStopCount: num(
      indicators.publicTransportStopCount ?? indicators.osm_public_transport_in_buffer,
    ),
    sportsFacilityCount: num(
      indicators.sportsFacilityCount ?? indicators.osm_sports_facilities_in_buffer,
    ),
    commercialPoiCount: num(
      indicators.commercialPoiCount ?? indicators.osm_commercial_pois_in_buffer,
    ),
    greenSpaceCount: num(indicators.greenSpaceCount ?? indicators.osm_green_space_in_buffer),
  };

  const parsed = siteBufferMetricsSchema.safeParse(metrics);
  return parsed.success ? parsed.data : null;
}
