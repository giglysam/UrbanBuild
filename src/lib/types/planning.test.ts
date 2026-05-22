import { describe, expect, it } from "vitest";

import {
  designConceptsBundleSchema,
  planningContextSchema,
  scenarioSchema,
  studyRequestSchema,
} from "@/lib/types/planning";

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

describe("designConceptsBundleSchema", () => {
  it("parses a minimal concept bundle", () => {
    const b = designConceptsBundleSchema.parse({
      siteDiagnosis: "Dense corridor with limited open space.",
      designPriorities: ["Walkability", "Shade"],
      subsurfaceCautions: "Assume utilities present; no deep basement without survey.",
      concepts: [
        {
          id: "concept-1",
          title: "Courtyard block",
          interventionType: "mixed_use",
          designConcept: "Mid-rise courtyard framing a shaded plaza.",
          program: ["Retail", "Housing"],
          massingLogic: "L-shaped bar around central void.",
          contextRelationship: "Matches mid-rise neighbors.",
          materials: ["stone", "timber screens", "glass"],
          facadeOrLandscapeStrategy: "Deep reveals and planted terraces.",
          sustainabilityFeatures: ["Cross ventilation", "Rain gardens"],
          publicRealmStrategy: "Pedestrian plaza with seating.",
          siteFitRationale: "Fits tight urban grain.",
          feasibilityAdaptations: "Shallow foundations only.",
          imagePrompt:
            "Photorealistic aerial oblique of a Mediterranean mid-rise courtyard block with stone and timber facade, shaded plaza, existing streets visible, late afternoon light, no text.",
        },
        {
          id: "concept-2",
          title: "Green connector",
          interventionType: "green_space",
          designConcept: "Linear park linking two arterials.",
          program: ["Park", "Playground"],
          massingLogic: "Open corridor with tree alleys.",
          contextRelationship: "Softens hard edges.",
          materials: ["gravel paths", "native planting"],
          facadeOrLandscapeStrategy: "Layered planting and permeable paving.",
          sustainabilityFeatures: ["Bioswales"],
          publicRealmStrategy: "Continuous shaded path.",
          siteFitRationale: "Uses underused verge.",
          feasibilityAdaptations: "Avoid deep planting over utility easement.",
          imagePrompt:
            "Eye-level photorealistic view along a shaded urban linear park with native trees, stone paths, surrounding buildings, warm Mediterranean light, no text.",
        },
      ],
    });
    expect(b.concepts).toHaveLength(2);
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
