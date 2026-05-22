import { describe, expect, it } from "vitest";

import { buildArchitecturalImagePrompt } from "@/lib/planning/image-prompt";
import type { DesignConcept } from "@/lib/types/planning";

const sampleConcept: DesignConcept = {
  id: "concept-1",
  title: "Courtyard block",
  interventionType: "mixed_use",
  designConcept: "Mid-rise courtyard framing a shaded plaza.",
  program: ["Retail", "Housing"],
  massingLogic: "L-shaped bar around central void.",
  contextRelationship: "Matches mid-rise neighbors.",
  materials: ["stone", "timber screens"],
  facadeOrLandscapeStrategy: "Deep reveals and planted terraces.",
  sustainabilityFeatures: ["Cross ventilation"],
  publicRealmStrategy: "Pedestrian plaza with seating.",
  siteFitRationale: "Fits tight urban grain.",
  feasibilityAdaptations: "Shallow foundations only.",
  imagePrompt:
    "Photorealistic aerial oblique of a Mediterranean courtyard block, late afternoon light, no text in image.",
};

describe("buildArchitecturalImagePrompt", () => {
  it("includes proposal name, materials, and context preservation", () => {
    const prompt = buildArchitecturalImagePrompt({
      lat: 33.89,
      lng: 35.5,
      radiusM: 400,
      placeLabel: "Hamra, Beirut",
      concept: sampleConcept,
      siteDiagnosis: "Dense corridor, limited open space.",
    });
    expect(prompt).toContain("Courtyard block");
    expect(prompt).toContain("stone");
    expect(prompt).toContain("Preserve the surrounding urban context");
    expect(prompt).toContain("Hamra, Beirut");
  });
});
