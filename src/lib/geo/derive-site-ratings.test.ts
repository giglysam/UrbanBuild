import { describe, expect, it } from "vitest";

import { extractSiteOsmSignals } from "@/lib/geo/extract-site-signals";
import {
  deriveGreenSpaceAccess,
  deriveMobilityAccess,
  deriveParkingAvailability,
  deriveSiteQualitativeRatings,
} from "@/lib/geo/derive-site-ratings";
import { emptySiteBufferMetrics } from "@/lib/geo/site-buffer-metrics";

describe("deriveSiteQualitativeRatings", () => {
  it("returns all five qualitative fields from OSM signals", () => {
    const signals = extractSiteOsmSignals(33.8938, 35.5018, 400, { elements: [] });
    const ratings = deriveSiteQualitativeRatings(signals, {
      roadAccessScore: 40,
      publicTransportScore: 30,
      pedestrianConnectivityScore: 35,
      emergencyAccessScore: 45,
    });

    expect(ratings.builtDensity).toMatch(/^(low|medium|high)$/);
    expect(ratings.mobilityAccess).toBe("weak");
    expect(ratings.residentialSensitivity).toBe("low");
    expect(ratings.parkingAvailability).toBe("weak");
    expect(ratings.greenSpaceAccess).toBe("weak");
  });

  it("rates green space access stronger when many park features exist", () => {
    const bm = emptySiteBufferMetrics(400);
    bm.greenSpaceCount = 12;
    bm.parkCount = 3;
    expect(deriveGreenSpaceAccess(bm, 0.5)).toBe("strong");
  });

  it("rates parking stronger when mapped parking exceeds threshold", () => {
    const bm = emptySiteBufferMetrics(400);
    bm.parkingCount = 8;
    expect(deriveParkingAvailability(bm)).toBe("strong");
  });

  it("rates mobility strong when scores and major roads are favorable", () => {
    const bm = emptySiteBufferMetrics(400);
    bm.majorRoadCount = 2;
    bm.publicTransportStopCount = 5;
    expect(
      deriveMobilityAccess(bm, {
        roadAccessScore: 80,
        publicTransportScore: 75,
        pedestrianConnectivityScore: 70,
        emergencyAccessScore: 72,
      }),
    ).toBe("strong");
  });
});
