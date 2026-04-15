import { describe, expect, it } from "vitest";

import { scenarioSchema, studyRequestSchema } from "@/lib/types/planning";

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
