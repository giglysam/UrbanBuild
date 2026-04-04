import * as turf from "@turf/turf";
import type { UrbanIndicators } from "@/lib/types/analysis";
import {
  fetchOverpassForSite,
  minDistanceToCoastlineM,
  type OverpassElement,
  wayLengthM,
} from "@/lib/services/overpass";

const MAJOR_HIGHWAY = new Set([
  "motorway",
  "trunk",
  "primary",
  "secondary",
]);

function isMajorHighway(tags?: Record<string, string>) {
  const h = tags?.highway;
  return h ? MAJOR_HIGHWAY.has(h) : false;
}

function countSchools(elements: OverpassElement[]) {
  let n = 0;
  for (const el of elements) {
    if (el.tags?.amenity === "school") n += 1;
  }
  return n;
}

function countHospitals(elements: OverpassElement[]) {
  let n = 0;
  for (const el of elements) {
    const a = el.tags?.amenity;
    if (a === "hospital" || a === "clinic" || a === "doctors") n += 1;
  }
  return n;
}

function countParks(elements: OverpassElement[]) {
  let n = 0;
  for (const el of elements) {
    if (el.tags?.leisure === "park" || el.tags?.leisure === "garden") n += 1;
  }
  return n;
}

function countTransit(elements: OverpassElement[]) {
  let n = 0;
  for (const el of elements) {
    if (el.type !== "node") continue;
    if (el.tags?.public_transport === "stop_position") n += 1;
    if (el.tags?.railway === "tram_stop") n += 1;
    if (el.tags?.highway === "bus_stop") n += 1;
    if (el.tags?.railway === "station") n += 1;
  }
  return n;
}

function countShops(elements: OverpassElement[]) {
  let n = 0;
  for (const el of elements) {
    if (el.type !== "node") continue;
    if (el.tags?.shop) n += 1;
  }
  return n;
}

function countAmenities(elements: OverpassElement[]) {
  let n = 0;
  for (const el of elements) {
    if (el.type !== "node" && el.type !== "way") continue;
    if (el.tags?.amenity) n += 1;
  }
  return n;
}

function intersectionProxyCount(elements: OverpassElement[]) {
  let n = 0;
  for (const el of elements) {
    if (el.type !== "node") continue;
    const h = el.tags?.highway;
    if (
      h === "traffic_signals" ||
      h === "stop" ||
      h === "motorway_junction" ||
      h === "crossing"
    ) {
      n += 1;
    }
  }
  return n;
}

function majorRoadsNearStudy(
  elements: OverpassElement[],
  lng: number,
  lat: number,
  radiusM: number,
) {
  const center = turf.point([lng, lat]);
  let n = 0;
  for (const el of elements) {
    if (el.type !== "way" || !isMajorHighway(el.tags)) continue;
    if (!el.geometry?.length) continue;
    for (const g of el.geometry) {
      const d =
        turf.distance(center, turf.point([g.lon, g.lat]), {
          units: "kilometers",
        }) * 1000;
      if (d <= radiusM) {
        n += 1;
        break;
      }
    }
  }
  return n;
}

function coastlineInStudy(
  coastlineWays: OverpassElement[],
  lng: number,
  lat: number,
  radiusM: number,
) {
  const circle = turf.circle([lng, lat], radiusM / 1000, {
    units: "kilometers",
    steps: 24,
  });
  for (const w of coastlineWays) {
    if (!w.geometry?.length) continue;
    const coords = w.geometry.map((g) => [g.lon, g.lat] as [number, number]);
    const line = turf.lineString(coords);
    const inter = turf.lineIntersect(line, circle);
    if (inter.features.length > 0) return true;
  }
  return false;
}

export async function computeSiteIndicators(
  lng: number,
  lat: number,
  radiusM: number,
): Promise<{ indicators: UrbanIndicators; elements: OverpassElement[] }> {
  const data = await fetchOverpassForSite(lng, lat, radiusM);
  const elements = data.elements ?? [];

  const areaKm2 =
    Math.PI * Math.pow(radiusM / 1000, 2) || 1;

  let roadLengthM = 0;
  let buildingCount = 0;
  const coastlineWays = elements.filter(
    (e) => e.type === "way" && e.tags?.natural === "coastline",
  );

  for (const el of elements) {
    if (el.type === "way" && el.tags?.highway) {
      roadLengthM += wayLengthM(el);
    }
    if (el.type === "way" && el.tags?.building) {
      buildingCount += 1;
    }
  }

  const schoolCount = countSchools(elements);
  const hospitalCount = countHospitals(elements);
  const parkLeisureCount = countParks(elements);
  const transitStopCount = countTransit(elements);
  const shopCount = countShops(elements);
  const amenityCount = countAmenities(elements);
  const ix = intersectionProxyCount(elements);

  const coastlineDistanceM = minDistanceToCoastlineM(
    lng,
    lat,
    coastlineWays,
  );
  const coastPresent = coastlineInStudy(coastlineWays, lng, lat, radiusM);

  const roadDensity = roadLengthM / 1000 / areaKm2;
  const buildingDensity = buildingCount / areaKm2;

  const amenityRichness = Math.min(
    100,
    (amenityCount + shopCount * 0.7) / (areaKm2 * 8),
  );
  const connectivityProxy = Math.min(
    100,
    (ix * 6 + roadDensity * 2 + transitStopCount * 4) / (areaKm2 + 0.5),
  );
  const urbanIntensityProxy = Math.min(
    100,
    buildingDensity * 1.2 + roadDensity * 1.5,
  );
  const mixedUseProxy = Math.min(
    100,
    (shopCount + amenityCount * 0.35) / (buildingCount + 5),
  );
  const publicSpaceAccessProxy = Math.min(
    100,
    (parkLeisureCount * 10 + (coastPresent ? 15 : 0)) / (areaKm2 + 0.3),
  );
  const environmentalStressProxy = Math.min(
    100,
    majorRoadsNearStudy(elements, lng, lat, radiusM) * 4 +
      roadDensity * 3 -
      parkLeisureCount * 2,
  );

  const indicators: UrbanIndicators = {
    studyRadiusM: radiusM,
    roadLengthM: Math.round(roadLengthM),
    buildingCount,
    intersectionProxy: ix,
    amenityCount,
    shopCount,
    schoolCount,
    hospitalCount,
    parkLeisureCount,
    transitStopCount,
    coastlineDistanceM:
      coastlineDistanceM !== null
        ? Math.round(coastlineDistanceM)
        : null,
    amenityRichness: Math.round(amenityRichness * 10) / 10,
    connectivityProxy: Math.round(connectivityProxy * 10) / 10,
    urbanIntensityProxy: Math.round(urbanIntensityProxy * 10) / 10,
    mixedUseProxy: Math.round(mixedUseProxy * 10) / 10,
    publicSpaceAccessProxy: Math.round(publicSpaceAccessProxy * 10) / 10,
    environmentalStressProxy: Math.round(environmentalStressProxy * 10) / 10,
    dataNotes: [
      "Indicators are derived from OpenStreetMap within the study radius; completeness varies by area.",
      "Land use is not official zoning — provisional interpretation from OSM tags and density heuristics.",
    ],
  };

  return {
    indicators,
    elements,
  };
}

export function featureSummaryFromElements(
  elements: OverpassElement[],
  lng: number,
  lat: number,
  radiusM: number,
) {
  const coastlineWays = elements.filter(
    (e) => e.type === "way" && e.tags?.natural === "coastline",
  );
  return {
    majorRoadsNear: majorRoadsNearStudy(elements, lng, lat, radiusM),
    greenLeisureFeatures: countParks(elements),
    coastlineInStudy: coastlineInStudy(coastlineWays, lng, lat, radiusM),
  };
}
