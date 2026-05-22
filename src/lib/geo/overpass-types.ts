import * as turf from "@turf/turf";
import type { Feature, Polygon } from "geojson";

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
