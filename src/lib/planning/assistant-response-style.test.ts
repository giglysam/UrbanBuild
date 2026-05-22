import { describe, expect, it } from "vitest";

import {
  ASSISTANT_RESPONSE_STYLE,
  DATA_USED_RESPONSE_FORMAT,
  PROJECT_PROPOSAL_RESPONSE_FORMAT,
  PROJECT_PROPOSAL_RULES,
  SUGGESTIONS_RESPONSE_FORMAT,
} from "./assistant-response-style";
import { formatPlanningChatSiteContext } from "./planning-chat-site-context";

describe("ASSISTANT_RESPONSE_STYLE", () => {
  it("includes the suggestions template with ### sections and recommended next step", () => {
    expect(ASSISTANT_RESPONSE_STYLE).toContain(SUGGESTIONS_RESPONSE_FORMAT);
    expect(SUGGESTIONS_RESPONSE_FORMAT).toContain("## Suggestions for Beirut Downtown");
    expect(SUGGESTIONS_RESPONSE_FORMAT).toContain("### Public art installations");
    expect(SUGGESTIONS_RESPONSE_FORMAT).toContain("## Recommended next step");
    expect(ASSISTANT_RESPONSE_STYLE).toMatch(/never pack multiple ideas/i);
    expect(ASSISTANT_RESPONSE_STYLE).toMatch(/Never merge different themes/i);
  });

  it("requires Project Readiness Summary before Data Used in project assessment", () => {
    expect(ASSISTANT_RESPONSE_STYLE).toContain(DATA_USED_RESPONSE_FORMAT);
    expect(PROJECT_PROPOSAL_RESPONSE_FORMAT).toContain("## Project Readiness Summary");
    expect(PROJECT_PROPOSAL_RESPONSE_FORMAT).toContain("## 5. Feasibility & Risk Assessment");
    expect(PROJECT_PROPOSAL_RESPONSE_FORMAT.indexOf("## Project Readiness Summary")).toBeLessThan(
      PROJECT_PROPOSAL_RESPONSE_FORMAT.indexOf("## Data Used"),
    );
  });

  it("includes project proposal rules and readiness template", () => {
    expect(ASSISTANT_RESPONSE_STYLE).toContain(PROJECT_PROPOSAL_RULES);
    expect(ASSISTANT_RESPONSE_STYLE).toContain(PROJECT_PROPOSAL_RESPONSE_FORMAT);
    expect(PROJECT_PROPOSAL_RESPONSE_FORMAT).toContain("## 7. Final Recommendation");
    expect(PROJECT_PROPOSAL_RULES).toMatch(/Do NOT use the Suggestions template/i);
    expect(SUGGESTIONS_RESPONSE_FORMAT).toMatch(/Do NOT use this template when the user names a concrete project/i);
  });
});

describe("formatPlanningChatSiteContext", () => {
  it("includes authoritative site data when siteAnalysis is present", () => {
    const block = formatPlanningChatSiteContext({
      lat: 33.89,
      lng: 35.5,
      radiusM: 400,
      siteAnalysis: {
        location: { lat: 33.89, lng: 35.5, studyRadiusMeters: 400 },
        bufferMetrics: {
          studyRadiusMeters: 400,
          buildingCount: 10,
          roadCount: 5,
          majorRoadCount: 1,
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
        },
        qualitativeRatings: {
          builtDensity: "low",
          mobilityAccess: "weak",
          residentialSensitivity: "low",
          parkingAvailability: "weak",
          greenSpaceAccess: "weak",
        },
        dataConfidence: {
          overall: "low",
          knownData: ["OSM"],
          missingData: ["Official zoning"],
          warnings: [],
        },
        builtEnvironment: {
          buildingCount: 10,
          builtDensity: "low",
          approximateBuiltCoverage: 20,
          vacantLandEstimate: "high",
          parcelFragmentation: "low",
          heritageSensitivity: "unknown",
        },
        landUseAndZoning: { zoningConfidence: "unknown" },
        mobility: {
          roadAccessScore: 40,
          publicTransportScore: 30,
          pedestrianConnectivityScore: 35,
          emergencyAccessScore: 40,
        },
        environment: {
          greenSpaceWithinRadius: 0,
          treeCoverEstimate: "unknown",
          slopeRisk: "unknown",
          floodRisk: "unknown",
          noiseSensitivity: "low",
          heatIslandRisk: "unknown",
        },
        sensitiveReceptors: {
          schoolsCount: 0,
          hospitalsCount: 0,
          religiousBuildingsCount: 0,
          residentialSensitivity: "low",
          publicInstitutionsCount: 0,
          parksCount: 0,
        },
        generatedAt: new Date().toISOString(),
      },
    });
    expect(block).toContain("Site GIS metrics");
    expect(block).toContain("OSM / Overpass:");
    expect(block).toContain("Truly missing layers");
    expect(block).not.toContain("CHAT RESPONSE RULES");
  });

  it("includes pinned coordinates and preliminary assessment hint without analysis", () => {
    const block = formatPlanningChatSiteContext({
      lat: 33.89,
      lng: 35.5,
      placeLabel: "Mar Mikhael",
    });
    expect(block).toContain("33.89000");
    expect(block).toContain("Mar Mikhael");
    expect(block).toContain("Site metrics not loaded");
  });
});
