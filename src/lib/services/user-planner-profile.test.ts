import { describe, expect, it } from "vitest";

import { mergePlannerProfile } from "@/lib/planning/planner-profile-merge";

describe("mergePlannerProfile", () => {
  it("merges taste arrays without duplicates", () => {
    const merged = mergePlannerProfile(
      { designTastes: ["timber"] },
      { addDesignTastes: ["timber", "low-rise"], summaryDelta: "Prefers human scale." },
    );
    expect(merged.designTastes).toEqual(["timber", "low-rise"]);
    expect(merged.summary).toContain("human scale");
  });
});
