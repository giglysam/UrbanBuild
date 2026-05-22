import {
  CANONICAL_REQUIRED_STUDIES,
  deriveFinalRecommendation,
  FINAL_RECOMMENDATION_LABELS,
} from "@/lib/planning/pre-project-readiness";
import { feasibilityVerdictLabel } from "@/lib/planning/project-feasibility-labels";
import type { StructuredSiteAnalysis } from "@/lib/types/site-feasibility";
import {
  PROJECT_TYPE_LABELS,
  type FeasibilityVerdict,
  type ProjectFeasibility,
  type ProjectTypeId,
} from "@/lib/types/site-feasibility";

type ScoreWeights = {
  land: number;
  access: number;
  environment: number;
  receptors: number;
  programFit: number;
};

const TYPE_WEIGHTS: Record<Exclude<ProjectTypeId, "custom">, ScoreWeights> = {
  football_stadium: { land: 0.3, access: 0.25, environment: 0.1, receptors: 0.2, programFit: 0.15 },
  public_park: { land: 0.15, access: 0.15, environment: 0.35, receptors: 0.1, programFit: 0.25 },
  residential_building: { land: 0.2, access: 0.2, environment: 0.15, receptors: 0.15, programFit: 0.3 },
  mixed_use_development: { land: 0.2, access: 0.25, environment: 0.15, receptors: 0.15, programFit: 0.25 },
  school: { land: 0.15, access: 0.25, environment: 0.15, receptors: 0.25, programFit: 0.2 },
  hospital: { land: 0.15, access: 0.3, environment: 0.1, receptors: 0.2, programFit: 0.25 },
  mall: { land: 0.15, access: 0.35, environment: 0.1, receptors: 0.2, programFit: 0.2 },
  community_center: { land: 0.15, access: 0.25, environment: 0.2, receptors: 0.2, programFit: 0.2 },
  public_square: { land: 0.1, access: 0.25, environment: 0.3, receptors: 0.15, programFit: 0.2 },
  sports_complex: { land: 0.25, access: 0.25, environment: 0.15, receptors: 0.2, programFit: 0.15 },
};

function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(n)));
}

function buildingStockCount(site: StructuredSiteAnalysis): number {
  const bbed = site.beirutUrbanLab?.bbed.buildings;
  if (bbed != null && bbed > 0) return bbed;
  return site.bufferMetrics?.buildingCount ?? site.builtEnvironment.buildingCount ?? 0;
}

function landScore(site: StructuredSiteAnalysis, type: ProjectTypeId): number {
  const density = site.builtEnvironment.builtDensity ?? "unknown";
  const vacant = site.builtEnvironment.vacantLandEstimate ?? "unknown";
  const coverage = site.builtEnvironment.approximateBuiltCoverage ?? 50;
  const stock = buildingStockCount(site);

  const needsLargeFootprint = ["football_stadium", "sports_complex", "mall", "hospital"].includes(type);
  const prefersOpen = ["public_park", "public_square"].includes(type);

  if (needsLargeFootprint) {
    if (vacant === "high") return 85;
    if (vacant === "medium" && density !== "high") return 65;
    if (density === "high" && coverage > 70) return 30;
    return 50;
  }
  if (prefersOpen) {
    if (vacant === "high" || density === "low") return 80;
    if (density === "high") return 40;
    return 60;
  }
  if (density === "medium") return 70;
  if (density === "low") return 55;
  if (density === "high") return 45;
  return 50;
}

function accessScore(site: StructuredSiteAnalysis): number {
  const scores = [
    site.mobility.roadAccessScore,
    site.mobility.emergencyAccessScore,
    site.mobility.publicTransportScore,
    site.mobility.pedestrianConnectivityScore,
  ].filter((n): n is number => typeof n === "number");
  if (scores.length === 0) return 45;
  return clamp(scores.reduce((a, b) => a + b, 0) / scores.length);
}

function environmentScore(site: StructuredSiteAnalysis, type: ProjectTypeId): number {
  const green = site.environment.greenSpaceWithinRadius ?? 0;
  if (type === "public_park" || type === "public_square") {
    return green >= 3 ? 75 : green >= 1 ? 60 : 50;
  }
  if (site.environment.floodRisk === "high") return 20;
  if (site.environment.floodRisk === "medium") return 45;
  return green >= 2 ? 65 : 55;
}

function receptorPenalty(site: StructuredSiteAnalysis, type: ProjectTypeId): number {
  const sens = site.sensitiveReceptors.residentialSensitivity ?? "unknown";
  const schools = site.sensitiveReceptors.schoolsCount ?? 0;
  const hospitals = site.sensitiveReceptors.hospitalsCount ?? 0;
  const noiseHeavy = ["football_stadium", "mall", "sports_complex"].includes(type);

  let base = 70;
  if (sens === "high") base -= noiseHeavy ? 35 : 15;
  else if (sens === "medium") base -= noiseHeavy ? 20 : 8;
  if (noiseHeavy && schools + hospitals > 2) base -= 15;
  if (type === "hospital" && hospitals > 0) base += 10;
  return clamp(base);
}

function programFitScore(site: StructuredSiteAnalysis, type: ProjectTypeId): number {
  const uses = site.landUseAndZoning.dominantLandUses ?? [];
  const useText = uses.join(" ").toLowerCase();
  if (type === "football_stadium" || type === "sports_complex") {
    if (useText.includes("recreation") || useText.includes("grass")) return 75;
    if (useText.includes("industrial")) return 55;
    return 50;
  }
  if (type === "school" && (site.sensitiveReceptors.schoolsCount ?? 0) > 0) return 60;
  if (type === "mall" && (site.mobility.roadAccessScore ?? 0) >= 65) return 70;
  return 55;
}

function verdictFromScore(score: number): FeasibilityVerdict {
  if (score >= 72) return "likely_suitable";
  if (score >= 58) return "conditionally_suitable";
  if (score >= 42) return "risky";
  return "likely_unsuitable";
}

function defaultRequiredStudies(type: ProjectTypeId): string[] {
  const base = [...CANONICAL_REQUIRED_STUDIES];
  const byType: Partial<Record<ProjectTypeId, string[]>> = {
    football_stadium: [
      "Match-day transport impact and crowd management plan",
      "Noise and night-lighting impact assessment",
    ],
    hospital: ["Health facility siting standards review", "Ambulance access and critical utilities redundancy study"],
    school: ["Safe routes to school and traffic calming review", "Playground / outdoor environmental health screening"],
    mall: ["Retail trip generation and parking demand study"],
    public_park: ["Irrigation and soil suitability for planting", "Tree survey and shade strategy"],
  };
  const extra = byType[type] ?? [];
  return [...new Set([...base, ...extra])].slice(0, 14);
}

function buildAlternatives(
  type: ProjectTypeId,
  verdict: FeasibilityVerdict,
  site: StructuredSiteAnalysis,
): string[] {
  const alts: string[] = [];
  if (verdict === "likely_unsuitable" || verdict === "risky") {
    if (type === "football_stadium" || type === "sports_complex") {
      alts.push(
        "Football academy or futsal complex instead of a full stadium.",
        "Evaluate a better-connected site with a large vacant parcel and primary-road access.",
      );
    } else if (type === "mall") {
      alts.push("Neighborhood-scale retail with structured parking on a partial redevelopment parcel.");
    } else if (type === "hospital") {
      alts.push("Urgent-care clinic or medical office building if full hospital footprint is constrained.");
    } else {
      alts.push("Reduce program scale or shift to a typology with lower land and access requirements.");
    }
  }
  if ((site.builtEnvironment.vacantLandEstimate ?? "unknown") === "low") {
    alts.push("Assembly of adjacent parcels or phased redevelopment may be required for the proposed program.");
  }
  return alts.slice(0, 4);
}

function buildPlanningBrief(
  site: StructuredSiteAnalysis,
  feasibility: Omit<ProjectFeasibility, "planningBrief">,
  hasBufferData: boolean,
): string {
  const loc = site.location;
  const coord = `${loc.lat.toFixed(5)}, ${loc.lng.toFixed(5)}`;
  const tier = feasibilityVerdictLabel(feasibility.verdict, feasibility.feasibilityScore, hasBufferData);
  const recLabel = FINAL_RECOMMENDATION_LABELS[feasibility.finalRecommendation!];

  return [
    "## Project Readiness Summary",
    `- Project: ${feasibility.projectTypeLabel}`,
    `- Verdict: ${tier} · Score ${feasibility.feasibilityScore}/100`,
    `- Recommendation: ${recLabel}`,
    `- ${feasibility.scoreRationale}`,
    "",
    "## Data Used",
    `- Pin: ${coord} · radius ${loc.studyRadiusMeters} m`,
    `- Data confidence: ${site.dataConfidence.overall}`,
    "",
    "## 1. Site Conditions & Topography",
    `- Buildings in buffer: ${site.builtEnvironment.buildingCount ?? "n/a"}; built density ${site.builtEnvironment.builtDensity ?? "unknown"}; vacant land estimate ${site.builtEnvironment.vacantLandEstimate ?? "unknown"}`,
    `- Topography / slope: not in dataset — topographic survey required`,
    `- Flood risk signal: ${site.environment.floodRisk ?? "unknown"}; green space features ${site.environment.greenSpaceWithinRadius ?? 0}`,
    "",
    "## 2. Regulatory & Zoning Compliance",
    `- Zoning confidence: ${site.landUseAndZoning.zoningConfidence}`,
    `- Dominant OSM land uses: ${(site.landUseAndZoning.dominantLandUses ?? ["not mapped"]).join("; ")}`,
    `- Official permitted uses / FAR / setbacks: not verified in dataset`,
    "",
    "## 3. Project Scope & Requirements",
    `- Assess program scale, access, parking, and service needs for ${feasibility.projectTypeLabel} against site constraints below.`,
    "",
    "## 4. Utility & Infrastructure Access",
    `- Nearest major road: ${site.mobility.nearestMajorRoadDistanceMeters != null ? `${site.mobility.nearestMajorRoadDistanceMeters} m` : "not mapped in OSM"}`,
    `- Road access ${site.mobility.roadAccessScore ?? "n/a"}/100 · transit ${site.mobility.publicTransportScore ?? "n/a"}/100 · emergency ${site.mobility.emergencyAccessScore ?? "n/a"}/100`,
    `- Water / sewer / power / drainage utilities: not in dataset`,
    "",
    "## 5. Feasibility & Risk Assessment",
    ...feasibility.siteConstraints.map((c) => `- Constraint: ${c}`),
    ...feasibility.projectRisks.map((r) => `- Risk: ${r}`),
    ...feasibility.siteOpportunities.map((o) => `- Opportunity: ${o}`),
    "",
    "## 6. Missing Data & Required Studies",
    ...feasibility.missingData.map((m) => `- Missing: ${m}`),
    ...feasibility.requiredStudies.map((s) => `- Study: ${s}`),
    "",
    "## 7. Final Recommendation",
    `- ${recLabel}. Preliminary only — confirm with authorities and commissioned studies before design commitment.`,
  ].join("\n");
}

export function runProjectFeasibility(
  site: StructuredSiteAnalysis,
  projectType: ProjectTypeId,
  customProjectDescription?: string,
): ProjectFeasibility {
  const label = customProjectDescription?.trim()
    ? customProjectDescription.trim().slice(0, 200)
    : PROJECT_TYPE_LABELS[projectType];

  const weights =
    projectType === "custom"
      ? TYPE_WEIGHTS.mixed_use_development
      : TYPE_WEIGHTS[projectType];

  const components = {
    land: landScore(site, projectType),
    access: accessScore(site),
    environment: environmentScore(site, projectType),
    receptors: receptorPenalty(site, projectType),
    programFit: programFitScore(site, projectType),
  };

  let feasibilityScore = clamp(
    components.land * weights.land +
      components.access * weights.access +
      components.environment * weights.environment +
      components.receptors * weights.receptors +
      components.programFit * weights.programFit,
  );

  const bm = site.bufferMetrics;
  const stock =
    site.beirutUrbanLab?.bbed.buildings ??
    bm?.buildingCount ??
    site.builtEnvironment.buildingCount ??
    0;

  if (projectType === "football_stadium" || projectType === "sports_complex") {
    if (stock >= 400) feasibilityScore = clamp(feasibilityScore - 28);
    else if (stock >= 150) feasibilityScore = clamp(feasibilityScore - 18);
    else if (stock >= 80) feasibilityScore = clamp(feasibilityScore - 10);

    const schools = bm?.schoolCount ?? site.sensitiveReceptors.schoolsCount ?? 0;
    if (schools >= 20) feasibilityScore = clamp(feasibilityScore - 15);
    else if (schools >= 8) feasibilityScore = clamp(feasibilityScore - 8);

    const parking = bm?.parkingCount ?? 0;
    if (parking < 8) feasibilityScore = clamp(feasibilityScore - 6);

    if (bm && bm.majorRoadCount < 2) feasibilityScore = clamp(feasibilityScore - 8);
    if ((site.mobility.emergencyAccessScore ?? 50) < 45) feasibilityScore = clamp(feasibilityScore - 6);
  }

  const verdict = verdictFromScore(feasibilityScore);

  const siteOpportunities: string[] = [];
  const siteConstraints: string[] = [];
  const projectRisks: string[] = [];

  if (components.access >= 65) {
    siteOpportunities.push("Road network and access scores are favorable for service and emergency vehicles.");
  } else {
    siteConstraints.push("Limited mapped arterial access — verify turning radii and fire lane requirements.");
    projectRisks.push("Access constraints may delay approvals or require new connections.");
  }

  if ((site.builtEnvironment.vacantLandEstimate ?? "unknown") === "high") {
    siteOpportunities.push("Lower built density in buffer suggests more assemble-able or open land for the program.");
  } else if ((site.builtEnvironment.builtDensity ?? "unknown") === "high") {
    siteConstraints.push("High built density in study radius — likely infill or demolition-heavy delivery.");
  }

  if ((site.sensitiveReceptors.residentialSensitivity ?? "unknown") === "high") {
    if (["football_stadium", "mall", "sports_complex"].includes(projectType)) {
      projectRisks.push("Nearby schools, hospitals, or dense residential context — noise and traffic impacts are elevated.");
    }
  }

  if (projectType === "football_stadium" || projectType === "sports_complex") {
    const schools = bm?.schoolCount ?? site.sensitiveReceptors.schoolsCount ?? 0;
    if (schools >= 10) {
      projectRisks.push(
        `${schools} schools in study radius — sensitive-receptor concentration raises crowd safety, traffic conflict, and night-event disturbance risks.`,
      );
    }
    if (stock >= 150) {
      siteConstraints.push(
        `High building stock (${stock} in radius) — land assembly for a full stadium footprint is likely difficult without major clearance.`,
      );
    }
    const parking = bm?.parkingCount ?? 0;
    if (parking < 8) {
      projectRisks.push(
        "Low mapped parking supply — match-day parking overflow and curbside congestion are a major operational risk.",
      );
    }
    if (bm && bm.parkCount >= 6 && (bm.greenSpaceCount ?? 0) < bm.parkCount * 3) {
      siteConstraints.push(
        "Multiple small parks nearby do not provide a buildable stadium site — pocket green space is not developable land.",
      );
    }
    projectRisks.push(
      "Match-day traffic peaks, security perimeter, floodlight/noise impacts, and emergency evacuation require dedicated studies.",
    );
  }

  if (site.landUseAndZoning.zoningConfidence === "unknown") {
    siteConstraints.push("No official zoning in dataset — permitted uses for this project type are unverified.");
  }

  if (siteOpportunities.length === 0) {
    siteOpportunities.push("Centroid and radius are fixed — further study can target parcel-level opportunities.");
  }

  const missingData = [...new Set([...site.dataConfidence.missingData])].slice(0, 12);
  const requiredStudies = defaultRequiredStudies(projectType);
  const hasBufferData = (bm?.buildingCount ?? 0) + (bm?.roadCount ?? 0) > 0;
  const zoningUnknown = site.landUseAndZoning.zoningConfidence === "unknown";
  const finalRecommendation = deriveFinalRecommendation(
    verdict,
    feasibilityScore,
    hasBufferData,
    zoningUnknown,
  );
  let alternativeRecommendations = buildAlternatives(projectType, verdict, site);
  if (
    (projectType === "football_stadium" || projectType === "sports_complex") &&
    (verdict === "likely_unsuitable" || verdict === "risky")
  ) {
    alternativeRecommendations = [
      "Football academy, futsal complex, or community sports facility with smaller footprint and fewer match-day impacts.",
      ...alternativeRecommendations,
    ].slice(0, 4);
  }

  const scoreRationale = `Weighted score ${feasibilityScore}/100 from land (${components.land}), access (${components.access}), environment (${components.environment}), receptor context (${components.receptors}), and program fit (${components.programFit}) using OSM signals within ${site.location.studyRadiusMeters} m.`;

  const base: Omit<ProjectFeasibility, "planningBrief"> = {
    projectType,
    projectTypeLabel: label,
    customProjectDescription: projectType === "custom" ? customProjectDescription : undefined,
    verdict,
    feasibilityScore,
    scoreRationale,
    siteOpportunities,
    siteConstraints,
    projectRisks,
    missingData,
    requiredStudies,
    alternativeRecommendations,
    finalRecommendation,
  };

  return {
    ...base,
    planningBrief: buildPlanningBrief(site, base, hasBufferData),
  };
}
