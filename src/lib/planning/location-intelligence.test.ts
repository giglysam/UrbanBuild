import { describe, expect, it } from "vitest";

import { formatLocationIntelligence, isLikelyBeirutMetro } from "./location-intelligence";

describe("location-intelligence", () => {
  it("detects Beirut metro bbox", () => {
    expect(isLikelyBeirutMetro(33.89552, 35.50755)).toBe(true);
    expect(isLikelyBeirutMetro(40.7, -74.0)).toBe(false);
  });

  it("includes Martyrs Square civic context when hinted", () => {
    const block = formatLocationIntelligence({
      lat: 33.89552,
      lng: 35.50755,
      userPlaceHint: "Martyrs' Square",
    });
    expect(block).toContain("Martyrs' Square");
    expect(block).toContain("archaeological");
    expect(block).toContain("Beirut");
  });
});
