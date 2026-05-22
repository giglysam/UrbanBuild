import { describe, expect, it } from "vitest";

import { computeSiteBufferMetrics } from "@/lib/geo/site-buffer-metrics";

describe("computeSiteBufferMetrics", () => {
  it("returns all thirteen metric fields", () => {
    const m = computeSiteBufferMetrics(33.9, 35.5, 400, { elements: [] });
    expect(m.studyRadiusMeters).toBe(400);
    expect(m).toMatchObject({
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
    });
  });

  it("counts major roads and junction-tagged intersections separately from bus stops", () => {
    const m = computeSiteBufferMetrics(33.8938, 35.5018, 400, {
      elements: [
        { type: "node", id: 1, lat: 33.8945, lon: 35.502, tags: { highway: "primary" } },
        { type: "node", id: 2, lat: 33.8945, lon: 35.5021, tags: { highway: "secondary", junction: "yes" } },
        { type: "node", id: 3, lat: 33.895, lon: 35.5022, tags: { highway: "bus_stop" } },
        { type: "node", id: 4, lat: 33.8955, lon: 35.5023, tags: { leisure: "park" } },
        { type: "node", id: 5, lat: 33.896, lon: 35.5024, tags: { natural: "wood" } },
      ],
    });
    expect(m.roadCount).toBe(2);
    expect(m.majorRoadCount).toBe(1);
    expect(m.intersectionCount).toBeGreaterThanOrEqual(1);
    expect(m.publicTransportStopCount).toBe(1);
    expect(m.parkCount).toBe(1);
    expect(m.greenSpaceCount).toBe(2);
  });
});
