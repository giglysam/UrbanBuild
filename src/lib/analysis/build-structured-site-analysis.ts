import { deriveSiteQualitativeRatings } from "@/lib/geo/derive-site-ratings";
import { DEFAULT_MISSING_DATASETS } from "@/lib/planning/format-site-data-used";
import {
  extractSiteOsmSignals,
  vacantLandEstimate,
  type SiteOsmSignals,
} from "@/lib/geo/extract-site-signals";
import type { OverpassResponse } from "@/lib/geo/indicators";
import type { PlanningContext } from "@/lib/types/planning";
import type { BeirutUrbanLabContext } from "@/lib/types/beirut-urban-lab";
import type {
  DataConfidenceOverall,
  StructuredSiteAnalysis,
  ZoningConfidence,
} from "@/lib/types/site-feasibility";

export type BuildStructuredSiteAnalysisInput = {
  lat: number;
  lng: number;
  radiusM: number;
  overpass: OverpassResponse;
  indicators: Record<string, number | string>;
  placeLabel?: string;
  city?: string;
  neighborhood?: string;
  planningContext?: PlanningContext | null;
  beirutUrbanLab?: BeirutUrbanLabContext | null;
};

function overallConfidence(signals: SiteOsmSignals): DataConfidenceOverall {
  const totalFeatures =
    signals.buildingCount + signals.highwayCount + signals.amenityCount + signals.parkLikeCount;
  if (totalFeatures < 5) return "low";
  if (totalFeatures < 25) return "medium";
  return "high";
}

function zoningConfidenceFromContext(ctx: PlanningContext | null | undefined): ZoningConfidence {
  if (ctx?.zoningNotes?.trim()) return "low";
  return "unknown";
}

function approximateCoverage(buildingCount: number, studyAreaKm2: number): number | undefined {
  if (studyAreaKm2 <= 0) return undefined;
  const density = buildingCount / studyAreaKm2;
  return Math.min(95, Math.round(Math.min(85, density * 0.9 + 5)));
}

function mobilityScores(signals: SiteOsmSignals): {
  roadAccessScore: number;
  publicTransportScore: number;
  pedestrianConnectivityScore: number;
  parkingScore: number;
  emergencyAccessScore: number;
  roadHierarchy: string[];
  accessRisks: string[];
} {
  const roadHierarchy = [...signals.highwayClasses.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([k, n]) => `${k} (${n})`);

  const nearest = signals.nearestMajorRoadM;
  const roadAccessScore =
    nearest == null ? 35 : nearest <= 80 ? 85 : nearest <= 200 ? 70 : nearest <= 400 ? 55 : 40;

  const transitAmenities =
    (signals.amenityTags.get("bus_station") ?? 0) +
    (signals.amenityTags.get("ferry_terminal") ?? 0) +
    (signals.amenityTags.get("taxi") ?? 0);
  const ptStops = signals.publicTransportStopCount;
  const publicTransportScore = Math.min(
    90,
    25 + ptStops * 12 + transitAmenities * 15 + (signals.highwayCount > 8 ? 10 : 0),
  );

  const pedBase = signals.highwayCount > 0 ? Math.min(85, 40 + signals.highwayCount * 2) : 30;
  const pedestrianConnectivityScore = Math.round(pedBase);

  const parkingScore = signals.highwayCount >= 12 ? 65 : signals.highwayCount >= 5 ? 50 : 35;

  const emergencyAccessScore =
    nearest != null && nearest <= 250 ? Math.min(90, 60 + Math.round((250 - nearest) / 5)) : 45;

  const accessRisks: string[] = [];
  if (nearest == null) accessRisks.push("No mapped primary/trunk road within study radius — verify arterial access.");
  else if (nearest > 300)
    accessRisks.push(`Nearest mapped major road ~${nearest} m — may limit emergency and service vehicle access.`);
  if (signals.highwayCount < 3) accessRisks.push("Sparse street network in OSM — pedestrian and service connectivity uncertain.");

  return {
    roadAccessScore,
    publicTransportScore,
    pedestrianConnectivityScore,
    parkingScore,
    emergencyAccessScore,
    roadHierarchy,
    accessRisks,
  };
}

export function buildStructuredSiteAnalysis(input: BuildStructuredSiteAnalysisInput): StructuredSiteAnalysis {
  const signals = extractSiteOsmSignals(input.lat, input.lng, input.radiusM, input.overpass);
  const densityProxy =
    typeof input.indicators.building_density_proxy_per_km2 === "number"
      ? input.indicators.building_density_proxy_per_km2
      : signals.studyAreaKm2 > 0
        ? signals.buildingCount / signals.studyAreaKm2
        : 0;

  const confidence = overallConfidence(signals);
  const bm = signals.bufferMetrics;
  const knownData: string[] = [
    `OpenStreetMap buffer metrics (${bm.studyRadiusMeters} m radius)`,
    `Buildings ${bm.buildingCount}, roads ${bm.roadCount}, major roads ${bm.majorRoadCount}, intersections ${bm.intersectionCount}`,
    `Schools ${bm.schoolCount}, hospitals ${bm.hospitalCount}, religious ${bm.religiousBuildingCount}`,
    `Parks ${bm.parkCount}, green space ${bm.greenSpaceCount}, parking ${bm.parkingCount}`,
    `Transit stops ${bm.publicTransportStopCount}, commercial ${bm.commercialPoiCount}, sports ${bm.sportsFacilityCount}`,
  ];
  const missingData: string[] = [...DEFAULT_MISSING_DATASETS];
  const warnings: string[] = [
    "OSM tags are community-sourced; not municipal regulatory data.",
  ];
  if (confidence === "low") {
    warnings.push("Very few OSM features in buffer — site metrics are preliminary only.");
  }
  if (input.planningContext?.zoningNotes?.trim()) {
    knownData.push("Planner-supplied zoning notes (not verified against authority records)");
  }
  if (input.planningContext?.riskFlags?.floodProne) {
    warnings.push("Planner flagged flood-prone context — confirm with hydrology study.");
  }

  const bul = input.beirutUrbanLab;
  if (bul) {
    knownData.push(
      `Beirut Urban Lab BBED: ${bul.bbed.buildings} surveyed buildings in ${bul.studyRadiusMeters} m buffer`,
      `BBED gardens ${bul.bbed.gardens}, parking/empty lots ${bul.bbed.parkingAndEmptyLots}, commercial ground floor ${bul.bbed.commercialGroundFloor}`,
      `BBED solar rooftops ${bul.bbed.solarPanelRooftop}, rivers ${bul.bbed.rivers}, landmarks ${bul.bbed.landmarks}`,
    );
    if (bul.adminAtPin.kadaa || bul.adminAtPin.mohafaza) {
      knownData.push(
        `Administrative labels at pin (BBED — not boundary polygons): ${[bul.adminAtPin.kadaa, bul.adminAtPin.mohafaza].filter(Boolean).join(", ")}`,
      );
    }
    if (bul.adminAtPin.cadastralEnglishName || bul.adminAtPin.cadastralId != null) {
      knownData.push(
        `Cadastral label at pin (metadata only): ${bul.adminAtPin.cadastralEnglishName ?? "—"}${bul.adminAtPin.cadastralId != null ? ` ID ${bul.adminAtPin.cadastralId}` : ""}`,
      );
    }
    if (bul.icil?.districtName || bul.icil?.municipalityName) {
      knownData.push(
        `ICIL district/municipality at pin: ${[bul.icil.districtName, bul.icil.municipalityName].filter(Boolean).join(", ")}`,
      );
    }
    const osmBuildings = bm.buildingCount;
    if (osmBuildings > 0 && bul.bbed.buildings > 0) {
      const ratio = (bul.bbed.buildings / osmBuildings).toFixed(2);
      warnings.push(
        `OSM building features (${osmBuildings}) vs BBED surveyed buildings (${bul.bbed.buildings}) in buffer — ratio ~${ratio}; prefer BBED for Beirut building stock.`,
      );
    }
    for (const n of bul.notes) warnings.push(n);
  }

  const mobility = mobilityScores(signals);
  const qualitativeRatings = deriveSiteQualitativeRatings(signals, {
    roadAccessScore: mobility.roadAccessScore,
    publicTransportScore: mobility.publicTransportScore,
    pedestrianConnectivityScore: mobility.pedestrianConnectivityScore,
    emergencyAccessScore: mobility.emergencyAccessScore,
  });

  const zoningConf = zoningConfidenceFromContext(input.planningContext);

  return {
    location: {
      lat: input.lat,
      lng: input.lng,
      city: input.city ?? bul?.adminAtPin.mohafaza,
      neighborhood: input.neighborhood ?? input.placeLabel ?? bul?.adminAtPin.kadaa,
      studyRadiusMeters: input.radiusM,
    },
    bufferMetrics: bm,
    qualitativeRatings,
    dataConfidence: {
      overall: confidence,
      knownData,
      missingData,
      warnings,
    },
    builtEnvironment: {
      buildingCount: signals.buildingCount,
      builtDensity: qualitativeRatings.builtDensity,
      approximateBuiltCoverage: approximateCoverage(signals.buildingCount, signals.studyAreaKm2),
      vacantLandEstimate: vacantLandEstimate(signals.buildingCount, signals.studyAreaKm2),
      parcelFragmentation: signals.buildingCount > 80 ? "high" : signals.buildingCount > 25 ? "medium" : "low",
      heritageSensitivity: "unknown",
    },
    landUseAndZoning: {
      dominantLandUses: signals.dominantLandUses.length ? signals.dominantLandUses : undefined,
      zoningConfidence: zoningConf,
      permittedUses: undefined,
      conditionalUses: undefined,
      prohibitedUses: undefined,
    },
    mobility: {
      nearestMajorRoadDistanceMeters: signals.nearestMajorRoadM ?? undefined,
      ...mobility,
    },
    environment: {
      greenSpaceWithinRadius: signals.greenSpaceFeatureCount,
      treeCoverEstimate:
        signals.parkLikeCount >= 8 ? "medium" : signals.parkLikeCount >= 3 ? "low" : "unknown",
      slopeRisk: "unknown",
      floodRisk: input.planningContext?.riskFlags?.floodProne ? "medium" : "unknown",
      noiseSensitivity:
        qualitativeRatings.residentialSensitivity === "high"
          ? "high"
          : qualitativeRatings.residentialSensitivity === "medium"
            ? "medium"
            : "low",
      heatIslandRisk: signals.parkLikeCount < 2 && densityProxy > 60 ? "medium" : "unknown",
    },
    sensitiveReceptors: {
      schoolsCount: bm.schoolCount,
      hospitalsCount: bm.hospitalCount,
      religiousBuildingsCount: bm.religiousBuildingCount,
      residentialSensitivity: qualitativeRatings.residentialSensitivity,
      publicInstitutionsCount: signals.publicInstitutionCount,
      parksCount: bm.parkCount,
      securitySensitiveUses:
        signals.securitySensitiveUses.length > 0 ? signals.securitySensitiveUses : undefined,
    },
    beirutUrbanLab: bul ?? undefined,
    generatedAt: new Date().toISOString(),
  };
}
