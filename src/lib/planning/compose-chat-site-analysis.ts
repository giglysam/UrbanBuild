import { bufferMetricsFromIndicators } from "@/lib/geo/buffer-metrics-from-indicators";
import { qualitativeRatingsFromBufferMetrics } from "@/lib/geo/qualitative-ratings-from-metrics";
import { runProjectFeasibility } from "@/lib/analysis/run-project-feasibility";
import { DEFAULT_MISSING_DATASETS } from "@/lib/planning/format-site-data-used";
import type { SiteIndicators } from "@/lib/types/planning";
import type { BeirutUrbanLabContext } from "@/lib/types/beirut-urban-lab";
import type { SiteBufferMetrics } from "@/lib/geo/site-buffer-metrics";
import type {
  ProjectTypeId,
  StructuredSiteAnalysis,
} from "@/lib/types/site-feasibility";
export type ComposeChatSiteInput = {
  lat: number;
  lng: number;
  radiusM?: number;
  placeLabel?: string;
  projectType?: ProjectTypeId;
  customProjectDescription?: string;
  indicators?: SiteIndicators;
  bufferMetrics?: SiteBufferMetrics | null;
  beirutUrbanLab?: BeirutUrbanLabContext | null;
  siteAnalysis?: StructuredSiteAnalysis | null;
};

/** Best available structured site object for chat prompts (full run or OSM+BBED partial). */
export function composeChatSiteAnalysis(input: ComposeChatSiteInput): StructuredSiteAnalysis | null {
  const radiusM =
    input.radiusM ??
    input.siteAnalysis?.location.studyRadiusMeters ??
    input.bufferMetrics?.studyRadiusMeters ??
    input.beirutUrbanLab?.studyRadiusMeters ??
    400;

  let site = input.siteAnalysis ?? null;

  if (site) {
    let merged: StructuredSiteAnalysis = {
      ...site,
      location: {
        ...site.location,
        lat: input.lat,
        lng: input.lng,
        studyRadiusMeters: radiusM,
        neighborhood: site.location.neighborhood ?? input.placeLabel,
      },
      bufferMetrics: site.bufferMetrics ?? input.bufferMetrics ?? undefined,
      beirutUrbanLab: site.beirutUrbanLab ?? input.beirutUrbanLab ?? undefined,
      projectFeasibility: site.projectFeasibility,
    };
    if (input.projectType && !merged.projectFeasibility) {
      merged = {
        ...merged,
        projectFeasibility: runProjectFeasibility(
          merged,
          input.projectType,
          input.customProjectDescription,
        ),
      };
    }
    return merged;
  }

  const bm =
    input.bufferMetrics ??
    (input.indicators ? bufferMetricsFromIndicators(input.indicators, radiusM) : null);
  if (!bm) return null;

  const area =
    typeof input.indicators?.study_area_km2 === "number" ? input.indicators.study_area_km2 : 0.5;
  const qr = qualitativeRatingsFromBufferMetrics(bm, area);
  const buildingCount = input.beirutUrbanLab?.bbed.buildings
    ? input.beirutUrbanLab.bbed.buildings
    : bm.buildingCount;

  const confidence =
    bm.buildingCount + bm.roadCount < 8
      ? ("low" as const)
      : bm.buildingCount < 25
        ? ("medium" as const)
        : ("high" as const);

  const bul = input.beirutUrbanLab;
  const knownData = [
    `OpenStreetMap buffer (${bm.studyRadiusMeters} m): buildings ${bm.buildingCount}, roads ${bm.roadCount}, parks ${bm.parkCount}, transit ${bm.publicTransportStopCount}`,
  ];
  if (bul) {
    knownData.push(`BBED surveyed buildings ${bul.bbed.buildings} in buffer`);
  }

  const minimal: StructuredSiteAnalysis = {
    location: {
      lat: input.lat,
      lng: input.lng,
      studyRadiusMeters: radiusM,
      neighborhood: input.placeLabel ?? bul?.adminAtPin.kadaa,
      city: bul?.adminAtPin.mohafaza,
    },
    bufferMetrics: bm,
    qualitativeRatings: qr,
    dataConfidence: {
      overall: confidence,
      knownData,
      missingData: [...DEFAULT_MISSING_DATASETS],
      warnings: [
        "Partial site context — run full site analysis for rule-based feasibility score and AI modules.",
        "OSM tags are community-sourced; not municipal regulatory data.",
      ],
    },
    builtEnvironment: {
      buildingCount,
      builtDensity: qr.builtDensity,
      parcelFragmentation: bm.buildingCount > 80 ? "high" : bm.buildingCount > 25 ? "medium" : "low",
      heritageSensitivity: "unknown",
    },
    landUseAndZoning: { zoningConfidence: "unknown" },
    mobility: {
      roadAccessScore: qr.mobilityAccess === "strong" ? 70 : qr.mobilityAccess === "moderate" ? 55 : 40,
      publicTransportScore: bm.publicTransportStopCount >= 5 ? 60 : 35,
      pedestrianConnectivityScore: bm.intersectionCount >= 4 ? 55 : 40,
      emergencyAccessScore: bm.majorRoadCount >= 1 ? 58 : 42,
    },
    environment: {
      greenSpaceWithinRadius: bm.greenSpaceCount,
      treeCoverEstimate: bm.parkCount >= 3 ? "low" : "unknown",
      slopeRisk: "unknown",
      floodRisk: "unknown",
      noiseSensitivity: qr.residentialSensitivity === "high" ? "high" : "medium",
      heatIslandRisk: "unknown",
    },
    sensitiveReceptors: {
      schoolsCount: bm.schoolCount,
      hospitalsCount: bm.hospitalCount,
      religiousBuildingsCount: bm.religiousBuildingCount,
      residentialSensitivity: qr.residentialSensitivity,
      publicInstitutionsCount: 0,
      parksCount: bm.parkCount,
    },
    beirutUrbanLab: bul ?? undefined,
    generatedAt: new Date().toISOString(),
  };

  if (input.projectType) {
    return {
      ...minimal,
      projectFeasibility: runProjectFeasibility(
        minimal,
        input.projectType,
        input.customProjectDescription,
      ),
    };
  }
  return minimal;
}
