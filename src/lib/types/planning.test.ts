import { describe, expect, it } from "vitest";

import { planningContextSchema, scenarioSchema, studyRequestSchema } from "@/lib/types/planning";

describe("studyRequestSchema", () => {
  it("accepts valid study request", () => {
    const r = studyRequestSchema.parse({ lat: 33.9, lng: 35.5, radiusM: 400 });
    expect(r.radiusM).toBe(400);
  });

  it("rejects invalid radius", () => {
    expect(() => studyRequestSchema.parse({ lat: 0, lng: 0, radiusM: 10 })).toThrow();
  });
});

describe("scenarioSchema", () => {
  it("parses scenario payload", () => {
    const s = scenarioSchema.parse({
      name: "A",
      summary: "S",
      tradeoffs: ["x"],
      confidence: "inferred",
    });
    expect(s.name).toBe("A");
  });
});

describe("planningContextSchema", () => {
  it("accepts empty object", () => {
    const c = planningContextSchema.parse({});
    expect(c.budgetLineItems).toBeUndefined();
  });

  it("parses budget and risk flags", () => {
    const c = planningContextSchema.parse({
      budgetTotalUsd: 1_000_000,
      budgetLineItems: [{ category: "Transit", amountUsd: 400_000, priority: 1 }],
      riskFlags: { floodProne: true, coastal: true },
      populationByYear: [
        { year: 2020, population: 1000 },
        { year: 2024, population: 1100 },
      ],
    });
    expect(c.budgetLineItems?.[0]?.category).toBe("Transit");
    expect(c.riskFlags?.floodProne).toBe(true);
    expect(c.populationByYear?.length).toBe(2);
  });
});
