import { describe, expect, it } from "vitest";

import {
  buildSiteDataUsedBlocks,
  DEFAULT_MISSING_DATASETS,
  formatSiteDataUsedMarkdown,
  formatSiteDataUsedForPrompt,
} from "./format-site-data-used";
import type { StructuredSiteAnalysis } from "@/lib/types/site-feasibility";

const minimalSite: StructuredSiteAnalysis = {
  location: { lat: 33.89, lng: 35.5, studyRadiusMeters: 400, neighborhood: "Mar Mikhael" },
  bufferMetrics: {
    studyRadiusMeters: 400,
    buildingCount: 120,
    roadCount: 45,
    majorRoadCount: 8,
    intersectionCount: 12,
    schoolCount: 2,
    hospitalCount: 1,
    religiousBuildingCount: 3,
    parkCount: 4,
    parkingCount: 6,
    publicTransportStopCount: 5,
    sportsFacilityCount: 1,
    commercialPoiCount: 18,
    greenSpaceCount: 7,
  },
  qualitativeRatings: {
    builtDensity: "high",
    mobilityAccess: "moderate",
    residentialSensitivity: "medium",
    parkingAvailability: "moderate",
    greenSpaceAccess: "weak",
  },
  dataConfidence: {
    overall: "medium",
    knownData: ["OSM buffer metrics"],
    missingData: [...DEFAULT_MISSING_DATASETS],
    warnings: ["OSM tags are community-sourced"],
  },
  builtEnvironment: {
    buildingCount: 120,
    builtDensity: "high",
    approximateBuiltCoverage: 45,
    vacantLandEstimate: "low",
    parcelFragmentation: "high",
    heritageSensitivity: "unknown",
  },
  landUseAndZoning: { zoningConfidence: "unknown" },
  mobility: {
    roadAccessScore: 60,
    publicTransportScore: 50,
    pedestrianConnectivityScore: 55,
    emergencyAccessScore: 58,
  },
  environment: {
    greenSpaceWithinRadius: 7,
    treeCoverEstimate: "low",
    slopeRisk: "unknown",
    floodRisk: "unknown",
    noiseSensitivity: "medium",
    heatIslandRisk: "unknown",
  },
  sensitiveReceptors: {
    schoolsCount: 2,
    hospitalsCount: 1,
    religiousBuildingsCount: 3,
    residentialSensitivity: "medium",
    publicInstitutionsCount: 0,
    parksCount: 4,
  },
  beirutUrbanLab: {
    source: "Beirut Urban Lab Open Data Platform",
    hubUrl: "https://beirut-urban-lab-open-data-platform-aub.hub.arcgis.com/",
    exploreAppUrl:
      "https://beirut-urban-lab-open-data-platform-aub.hub.arcgis.com/apps/6f927948e96a4aaa92e065267886b7ac/explore",
    featureServerUrl:
      "https://services3.arcgis.com/tuNLpt6Wfhd22qmO/arcgis/rest/services/BBBED_2024_DataSharing/FeatureServer",
    studyRadiusMeters: 400,
    bbed: {
      buildings: 191,
      gardens: 2,
      parkingAndEmptyLots: 5,
      rivers: 0,
      commercialGroundFloor: 12,
      solarPanelRooftop: 3,
      landmarks: 1,
    },
    adminAtPin: { kadaa: "Beirut", mohafaza: "Beirut", cadastralId: 42, cadastralEnglishName: "Sector A" },
    notes: ["BBED surveyed stock"],
    fetchedAt: new Date().toISOString(),
  },
  generatedAt: new Date().toISOString(),
};

describe("format-site-data-used", () => {
  it("builds OSM, BBED, admin, and missing blocks", () => {
    const b = buildSiteDataUsedBlocks(minimalSite);
    expect(b.osm[0]).toMatch(/400 m/);
    expect(b.osm[1]).toMatch(/Buildings 120/);
    expect(b.bbed[1]).toMatch(/Surveyed buildings 191/);
    expect(b.admin.some((l) => l.includes("Cadastral"))).toBe(true);
    expect(b.admin.some((l) => l.includes("not parcel geometry"))).toBe(true);
    expect(b.missing).toContain("Official zoning code and permitted uses");
    expect(b.confidence).toMatch(/medium/);
  });

  it("formats markdown with Data Used section", () => {
    const md = formatSiteDataUsedMarkdown(minimalSite);
    expect(md).toContain("## Data Used");
    expect(md).toContain("OpenStreetMap / Overpass:");
    expect(md).toContain("Beirut Urban Lab / BBED:");
    expect(md).toContain("Missing data layers");
    expect(md).toMatch(/33\.89000/);
    expect(md).toMatch(/not parcel shapes/);
  });

  it("prompt block warns against parcel polygons", () => {
    const prompt = formatSiteDataUsedForPrompt(minimalSite);
    expect(prompt).toContain("Site GIS metrics");
    expect(prompt).toMatch(/labels at pin only|not parcel geometry/i);
  });
});
