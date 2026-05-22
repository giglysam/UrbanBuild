import { describe, expect, it } from "vitest";

import { runProjectFeasibility } from "@/lib/analysis/run-project-feasibility";
import { feasibilityVerdictLabel } from "@/lib/planning/project-feasibility-labels";
import { interpretSiteForProject } from "./interpret-site-for-project";
import type { StructuredSiteAnalysis } from "@/lib/types/site-feasibility";

function denseStadiumSite(): StructuredSiteAnalysis {
  const base: StructuredSiteAnalysis = {
    location: { lat: 33.89, lng: 35.5, studyRadiusMeters: 500 },
    bufferMetrics: {
      studyRadiusMeters: 500,
      buildingCount: 1234,
      roadCount: 234,
      majorRoadCount: 12,
      intersectionCount: 40,
      schoolCount: 43,
      hospitalCount: 2,
      religiousBuildingCount: 5,
      parkCount: 21,
      parkingCount: 3,
      publicTransportStopCount: 15,
      sportsFacilityCount: 2,
      commercialPoiCount: 80,
      greenSpaceCount: 25,
    },
    qualitativeRatings: {
      builtDensity: "high",
      mobilityAccess: "moderate",
      residentialSensitivity: "high",
      parkingAvailability: "weak",
      greenSpaceAccess: "moderate",
    },
    dataConfidence: {
      overall: "medium",
      knownData: ["OSM"],
      missingData: [],
      warnings: [],
    },
    builtEnvironment: { buildingCount: 1234, builtDensity: "high", heritageSensitivity: "unknown" },
    landUseAndZoning: { zoningConfidence: "unknown" },
    mobility: {
      roadAccessScore: 55,
      publicTransportScore: 50,
      pedestrianConnectivityScore: 50,
      emergencyAccessScore: 48,
    },
    environment: {
      greenSpaceWithinRadius: 25,
      treeCoverEstimate: "low",
      slopeRisk: "unknown",
      floodRisk: "unknown",
      noiseSensitivity: "high",
      heatIslandRisk: "unknown",
    },
    sensitiveReceptors: {
      schoolsCount: 43,
      hospitalsCount: 2,
      religiousBuildingsCount: 5,
      residentialSensitivity: "high",
      publicInstitutionsCount: 0,
      parksCount: 21,
    },
    beirutUrbanLab: {
      source: "Beirut Urban Lab Open Data Platform",
      hubUrl: "https://beirut-urban-lab-open-data-platform-aub.hub.arcgis.com/",
      exploreAppUrl:
        "https://beirut-urban-lab-open-data-platform-aub.hub.arcgis.com/apps/6f927948e96a4aaa92e065267886b7ac/explore",
      featureServerUrl:
        "https://services3.arcgis.com/tuNLpt6Wfhd22qmO/arcgis/rest/services/BBBED_2024_DataSharing/FeatureServer",
      studyRadiusMeters: 500,
      bbed: {
        buildings: 234,
        gardens: 1,
        parkingAndEmptyLots: 2,
        rivers: 0,
        commercialGroundFloor: 10,
        solarPanelRooftop: 0,
        landmarks: 0,
      },
      adminAtPin: { kadaa: "Beirut" },
      notes: [],
      fetchedAt: new Date().toISOString(),
    },
    generatedAt: new Date().toISOString(),
  };
  return { ...base, projectFeasibility: runProjectFeasibility(base, "football_stadium") };
}

describe("interpret-site-for-project", () => {
  it("interprets dense fabric and schools for football stadium", () => {
    const lines = interpretSiteForProject(denseStadiumSite(), "football_stadium");
    expect(lines.some((l) => l.includes("1234") || l.includes("234"))).toBe(true);
    expect(lines.some((l) => l.toLowerCase().includes("school"))).toBe(true);
    expect(lines.some((l) => l.toLowerCase().includes("parking"))).toBe(true);
  });

  it("scores dense stadium site as low feasibility", () => {
    const site = denseStadiumSite();
    const f = site.projectFeasibility!;
    expect(f.feasibilityScore).toBeLessThan(58);
    expect(feasibilityVerdictLabel(f.verdict, f.feasibilityScore, true)).toMatch(/Low|Not recommended/);
  });
});
