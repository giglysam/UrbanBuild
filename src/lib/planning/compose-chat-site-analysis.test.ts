import { describe, expect, it } from "vitest";

import { composeChatSiteAnalysis } from "./compose-chat-site-analysis";
import { formatPlanningChatSiteContext } from "./planning-chat-site-context";

describe("composeChatSiteAnalysis", () => {
  it("builds context from bufferMetrics and BBED without full siteAnalysis", () => {
    const site = composeChatSiteAnalysis({
      lat: 33.89,
      lng: 35.5,
      radiusM: 400,
      bufferMetrics: {
        studyRadiusMeters: 400,
        buildingCount: 50,
        roadCount: 20,
        majorRoadCount: 3,
        intersectionCount: 5,
        schoolCount: 1,
        hospitalCount: 0,
        religiousBuildingCount: 2,
        parkCount: 2,
        parkingCount: 4,
        publicTransportStopCount: 3,
        sportsFacilityCount: 0,
        commercialPoiCount: 10,
        greenSpaceCount: 3,
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
          buildings: 80,
          gardens: 1,
          parkingAndEmptyLots: 2,
          rivers: 0,
          commercialGroundFloor: 5,
          solarPanelRooftop: 0,
          landmarks: 0,
        },
        adminAtPin: { kadaa: "Beirut" },
        notes: [],
        fetchedAt: new Date().toISOString(),
      },
    });
    expect(site?.bufferMetrics?.buildingCount).toBe(50);
    expect(site?.beirutUrbanLab?.bbed.buildings).toBe(80);
    const prompt = formatPlanningChatSiteContext({
      lat: 33.89,
      lng: 35.5,
      radiusM: 400,
      bufferMetrics: site!.bufferMetrics!,
      beirutUrbanLab: site!.beirutUrbanLab,
    });
    expect(prompt).toContain("Site GIS metrics");
    expect(prompt).toContain("Surveyed buildings 80");
    expect(prompt).not.toContain('"builtEnvironment"');
  });
});
