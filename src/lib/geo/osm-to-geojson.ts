import type { Feature, FeatureCollection, Geometry } from "geojson";
import type { OverpassElement } from "@/lib/services/overpass";

function props(
  tags: Record<string, string> | undefined,
  category: string,
) {
  return { ...(tags ?? {}), _category: category };
}

export function overpassToGeoJSON(
  elements: OverpassElement[],
): FeatureCollection {
  const features: Feature<Geometry>[] = [];

  for (const el of elements) {
    if (el.type === "node" && el.lat != null && el.lon != null) {
      const g: Geometry = {
        type: "Point",
        coordinates: [el.lon, el.lat],
      };
      const cat =
        el.tags?.amenity || el.tags?.shop || el.tags?.leisure
          ? "poi"
          : el.tags?.highway === "bus_stop" ||
              el.tags?.public_transport ||
              el.tags?.railway
            ? "transit"
            : "other";
      features.push({
        type: "Feature",
        id: el.id,
        geometry: g,
        properties: props(el.tags, cat),
      });
    }
    if (el.type === "way" && el.geometry?.length) {
      const coords = el.geometry.map((p) => [p.lon, p.lat] as [number, number]);
      if (coords.length < 2) continue;
      const isCoast = el.tags?.natural === "coastline";
      const cat = isCoast
        ? "coastline"
        : el.tags?.building
          ? "building"
          : el.tags?.highway
            ? "road"
            : el.tags?.leisure
              ? "green"
              : "other";
      const g: Geometry = { type: "LineString", coordinates: coords };
      features.push({
        type: "Feature",
        id: el.id,
        geometry: g,
        properties: props(el.tags, cat),
      });
    }
  }

  return { type: "FeatureCollection", features };
}
