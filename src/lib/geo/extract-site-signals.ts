import * as turf from "@turf/turf";

import type { OsmSiteCategory } from "@/lib/geo/osm-categories";
import {
  computeSiteBufferMetrics,
  type SiteBufferMetrics,
} from "@/lib/geo/site-buffer-metrics";
import type { QualitativeTier } from "@/lib/types/site-feasibility";
import type { OverpassElement, OverpassResponse } from "@/lib/geo/overpass-types";
import { studyPolygon } from "@/lib/geo/overpass-types";

const MAJOR_HIGHWAYS = new Set([
  "motorway",
  "motorway_link",
  "trunk",
  "trunk_link",
  "primary",
  "primary_link",
]);

const SECONDARY_HIGHWAYS = new Set(["secondary", "secondary_link", "tertiary", "tertiary_link"]);

function coordsFromElement(el: OverpassElement): [number, number] | null {
  if (typeof el.lat === "number" && typeof el.lon === "number") return [el.lon, el.lat];
  if (el.center) return [el.center.lon, el.center.lat];
  return null;
}

function tierFromCount(count: number, lowMax: number, highMin: number): QualitativeTier {
  if (count <= lowMax) return "low";
  if (count >= highMin) return "high";
  return "medium";
}

export type SiteOsmSignals = {
  studyAreaKm2: number;
  bufferMetrics: SiteBufferMetrics;
  categoryCounts: Record<OsmSiteCategory, number>;
  buildingCount: number;
  highwayCount: number;
  parkLikeCount: number;
  amenityCount: number;
  landuseTags: Map<string, number>;
  amenityTags: Map<string, number>;
  highwayClasses: Map<string, number>;
  nearestMajorRoadM: number | null;
  dominantLandUses: string[];
  schoolsCount: number;
  hospitalsCount: number;
  religiousCount: number;
  publicInstitutionCount: number;
  parksCount: number;
  parkingCount: number;
  publicTransportStopCount: number;
  commercialPoiCount: number;
  sportsFacilityCount: number;
  securitySensitiveUses: string[];
  greenSpaceFeatureCount: number;
};

function metricsToCategoryCounts(m: SiteBufferMetrics): Record<OsmSiteCategory, number> {
  return {
    buildings: m.buildingCount,
    roads: m.roadCount,
    parks_green: m.greenSpaceCount,
    schools: m.schoolCount,
    hospitals: m.hospitalCount,
    religious: m.religiousBuildingCount,
    parking: m.parkingCount,
    public_transport: m.publicTransportStopCount,
    commercial: m.commercialPoiCount,
    sports: m.sportsFacilityCount,
  };
}

export function extractSiteOsmSignals(
  lat: number,
  lng: number,
  radiusM: number,
  overpass: OverpassResponse,
): SiteOsmSignals {
  const study = studyPolygon(lat, lng, radiusM);
  const center = turf.point([lng, lat]);
  const studyAreaKm2 = turf.area(study) / 1_000_000;
  const bufferMetrics = computeSiteBufferMetrics(lat, lng, radiusM, overpass);
  const categoryCounts = metricsToCategoryCounts(bufferMetrics);

  const landuseTags = new Map<string, number>();
  const amenityTags = new Map<string, number>();
  const highwayClasses = new Map<string, number>();

  let amenityCount = 0;
  let nearestMajorRoadM: number | null = null;
  let publicInstitutionCount = 0;
  const securitySensitiveUses: string[] = [];

  for (const el of overpass.elements) {
    const c = coordsFromElement(el);
    if (!c) continue;
    const pt = turf.point(c);
    if (!turf.booleanPointInPolygon(pt, study)) continue;

    const t = el.tags ?? {};
    const distM = turf.distance(center, pt, { units: "meters" });

    const highway = t.highway;
    if (highway && t.highway !== "bus_stop") {
      highwayClasses.set(highway, (highwayClasses.get(highway) ?? 0) + 1);
      if (MAJOR_HIGHWAYS.has(highway) || SECONDARY_HIGHWAYS.has(highway)) {
        if (nearestMajorRoadM == null || distM < nearestMajorRoadM) {
          nearestMajorRoadM = Math.round(distM);
        }
      }
    }

    const landuse = t.landuse;
    if (landuse) landuseTags.set(landuse, (landuseTags.get(landuse) ?? 0) + 1);

    const amenity = t.amenity;
    if (amenity) {
      amenityCount += 1;
      amenityTags.set(amenity, (amenityTags.get(amenity) ?? 0) + 1);
      if (
        amenity === "townhall" ||
        amenity === "courthouse" ||
        amenity === "police" ||
        amenity === "fire_station" ||
        amenity === "embassy"
      ) {
        publicInstitutionCount += 1;
      }
      if (
        amenity === "police" ||
        amenity === "embassy" ||
        amenity === "courthouse" ||
        amenity === "place_of_worship"
      ) {
        const label = amenity.replace(/_/g, " ");
        if (!securitySensitiveUses.includes(label)) securitySensitiveUses.push(label);
      }
    }
  }

  const dominantLandUses = [...landuseTags.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([k, n]) => `${k.replace(/_/g, " ")} (${n})`);

  if (dominantLandUses.length === 0 && bufferMetrics.buildingCount > 0) {
    dominantLandUses.push(`built-up area (${bufferMetrics.buildingCount} building features)`);
  }

  const m = bufferMetrics;

  return {
    studyAreaKm2,
    bufferMetrics: m,
    categoryCounts,
    buildingCount: m.buildingCount,
    highwayCount: m.roadCount,
    parkLikeCount: m.greenSpaceCount,
    amenityCount,
    landuseTags,
    amenityTags,
    highwayClasses,
    nearestMajorRoadM,
    dominantLandUses,
    schoolsCount: m.schoolCount,
    hospitalsCount: m.hospitalCount,
    religiousCount: m.religiousBuildingCount,
    publicInstitutionCount,
    parksCount: m.parkCount,
    parkingCount: m.parkingCount,
    publicTransportStopCount: m.publicTransportStopCount,
    commercialPoiCount: m.commercialPoiCount,
    sportsFacilityCount: m.sportsFacilityCount,
    securitySensitiveUses,
    greenSpaceFeatureCount: m.greenSpaceCount,
  };
}

export function builtDensityFromProxy(densityPerKm2: number): QualitativeTier {
  if (densityPerKm2 < 15) return "low";
  if (densityPerKm2 < 80) return "medium";
  return "high";
}

export function vacantLandEstimate(buildingCount: number, studyAreaKm2: number): QualitativeTier {
  const density = studyAreaKm2 > 0 ? buildingCount / studyAreaKm2 : 0;
  if (density < 8) return "high";
  if (density < 40) return "medium";
  if (density < 100) return "low";
  return "unknown";
}

export function residentialSensitivity(
  buildingCount: number,
  schoolsCount: number,
  hospitalsCount: number,
): QualitativeTier {
  const receptorScore = schoolsCount * 2 + hospitalsCount * 3 + (buildingCount > 60 ? 2 : buildingCount > 20 ? 1 : 0);
  return tierFromCount(receptorScore, 2, 8);
}

