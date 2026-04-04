import * as turf from "@turf/turf";

export function bboxFromCenterRadiusM(
  lng: number,
  lat: number,
  radiusM: number,
): [number, number, number, number] {
  const circle = turf.circle([lng, lat], radiusM / 1000, {
    steps: 32,
    units: "kilometers",
  });
  const b = turf.bbox(circle);
  return [b[0], b[1], b[2], b[3]];
}

/** Overpass expects: south,west,north,east */
export function overpassBboxString(bbox: [number, number, number, number]) {
  const [west, south, east, north] = bbox;
  return `${south},${west},${north},${east}`;
}
