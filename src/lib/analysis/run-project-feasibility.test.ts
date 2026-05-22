import { describe, expect, it } from "vitest";

import { buildStructuredSiteAnalysis } from "@/lib/analysis/build-structured-site-analysis";
import { runProjectFeasibility } from "@/lib/analysis/run-project-feasibility";

describe("runProjectFeasibility", () => {
  it("scores public park higher than stadium on a dense built-up buffer", () => {
    const elements = Array.from({ length: 90 }, (_, i) => ({
      type: "node" as const,
      id: i + 1,
      lat: 33.9 + (i % 10) * 0.0003,
      lon: 35.5 + Math.floor(i / 10) * 0.0003,
      tags: { building: "yes" },
    }));

    const site = buildStructuredSiteAnalysis({
      lat: 33.9,
      lng: 35.5,
      radiusM: 400,
      overpass: { elements },
      indicators: {
        study_radius_m: 400,
        study_area_km2: 0.5,
        osm_building_features_in_buffer: 90,
        building_density_proxy_per_km2: 180,
      },
    });

    const park = runProjectFeasibility(site, "public_park");
    const stadium = runProjectFeasibility(site, "football_stadium");

    expect(park.feasibilityScore).toBeGreaterThan(stadium.feasibilityScore);
    expect(stadium.verdict).not.toBe("likely_suitable");
  });

  it("includes required studies for stadium proposals", () => {
    const site = buildStructuredSiteAnalysis({
      lat: 33.89,
      lng: 35.5,
      radiusM: 400,
      overpass: {
        elements: [
          {
            type: "node",
            id: 1,
            lat: 33.891,
            lon: 35.501,
            tags: { amenity: "school" },
          },
          {
            type: "node",
            id: 2,
            lat: 33.892,
            lon: 35.502,
            tags: { highway: "primary" },
          },
        ],
      },
      indicators: { building_density_proxy_per_km2: 90 },
    });

    const f = runProjectFeasibility(site, "football_stadium");
    expect(f.requiredStudies.some((s) => s.toLowerCase().includes("transport"))).toBe(true);
    expect(f.planningBrief).toContain("Project Readiness Summary");
    expect(f.finalRecommendation).toBeDefined();
  });
});
