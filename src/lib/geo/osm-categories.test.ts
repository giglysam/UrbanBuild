import { describe, expect, it } from "vitest";

import { classifyOsmFeature, OSM_SITE_CATEGORIES } from "@/lib/geo/osm-categories";

describe("classifyOsmFeature", () => {
  it("covers all ten site layers", () => {
    expect(OSM_SITE_CATEGORIES).toHaveLength(10);
  });

  it("classifies representative tags", () => {
    expect(classifyOsmFeature({ building: "yes" })).toBe("buildings");
    expect(classifyOsmFeature({ highway: "residential" })).toBe("roads");
    expect(classifyOsmFeature({ leisure: "park" })).toBe("parks_green");
    expect(classifyOsmFeature({ amenity: "school" })).toBe("schools");
    expect(classifyOsmFeature({ amenity: "hospital" })).toBe("hospitals");
    expect(classifyOsmFeature({ building: "mosque" })).toBe("religious");
    expect(classifyOsmFeature({ amenity: "parking" })).toBe("parking");
    expect(classifyOsmFeature({ highway: "bus_stop" })).toBe("public_transport");
    expect(classifyOsmFeature({ shop: "supermarket" })).toBe("commercial");
    expect(classifyOsmFeature({ leisure: "stadium" })).toBe("sports");
  });

  it("prioritizes schools over generic buildings", () => {
    expect(classifyOsmFeature({ building: "school", amenity: "school" })).toBe("schools");
  });
});
