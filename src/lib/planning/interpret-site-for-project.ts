import { runProjectFeasibility } from "@/lib/analysis/run-project-feasibility";
import {
  feasibilityVerdictLabel,
  feasibilityVerdictOpeningLine,
  finalRecommendationLabel,
} from "@/lib/planning/project-feasibility-labels";
import { PROJECT_TYPE_LABELS, type ProjectFeasibility, type ProjectTypeId, type StructuredSiteAnalysis } from "@/lib/types/site-feasibility";
import type { SiteBufferMetrics } from "@/lib/geo/site-buffer-metrics";

import { CANONICAL_MISSING_DATA } from "@/lib/planning/pre-project-readiness";

/** Layers that are genuinely unavailable — never include pin coordinates here. */
export const TRULY_MISSING_DATA_LAYERS = CANONICAL_MISSING_DATA;

function bm(site: StructuredSiteAnalysis): SiteBufferMetrics | undefined {
  return site.bufferMetrics;
}

function buildingStock(site: StructuredSiteAnalysis): number {
  const b = bm(site);
  const bbed = site.beirutUrbanLab?.bbed.buildings;
  if (bbed != null && bbed > 0) return bbed;
  return b?.buildingCount ?? site.builtEnvironment.buildingCount ?? 0;
}

function interpretFootballStadium(site: StructuredSiteAnalysis): string[] {
  const m = bm(site);
  if (!m) return ["Insufficient OSM/BBED buffer metrics — run site analysis before judging stadium feasibility."];

  const buildings = buildingStock(site);
  const lines: string[] = [];

  if (buildings >= 150) {
    lines.push(
      `Very high building count (${buildings} in ${m.studyRadiusMeters} m${site.beirutUrbanLab ? ", BBED surveyed stock confirms dense fabric" : ""}) — indicates limited open land, difficult land assembly, and infill/demolition risk for a full stadium footprint.`,
    );
  } else if (buildings >= 60) {
    lines.push(
      `Elevated building count (${buildings}) — a full stadium needs a large contiguous parcel; assembly or clearance is likely required.`,
    );
  } else {
    lines.push(
      `Moderate building count (${buildings}) — more open land may exist, but parcel boundaries are unverified; confirm vacant parcel size.`,
    );
  }

  if (m.schoolCount >= 15) {
    lines.push(
      `${m.schoolCount} schools in buffer — high sensitive-receptor density: match-day traffic, crowd safety, noise, and floodlight impacts on students are major concerns.`,
    );
  } else if (m.schoolCount >= 5) {
    lines.push(
      `${m.schoolCount} schools nearby — elevated sensitive-receptor and traffic-conflict risk during events.`,
    );
  } else if (m.schoolCount > 0) {
    lines.push(`${m.schoolCount} school(s) in buffer — coordinate event schedules and safe pedestrian routes.`);
  }

  if (m.majorRoadCount < 2) {
    lines.push(
      `${m.roadCount} OSM roads but only ${m.majorRoadCount} major road segment(s) — road quantity alone does not guarantee stadium access; arterial capacity, turning, and emergency lanes need verification.`,
    );
  } else {
    lines.push(
      `${m.roadCount} roads including ${m.majorRoadCount} major segments — check match-day capacity, not just everyday connectivity; emergency and bus ingress still need study.`,
    );
  }

  const emergency = site.mobility.emergencyAccessScore ?? 0;
  if (emergency < 50) {
    lines.push(`Emergency access score ${emergency}/100 — fire, ambulance, and evacuation routes may be constrained for large crowds.`);
  }

  if (m.parkCount >= 8 && m.greenSpaceCount <= m.parkCount * 2) {
    lines.push(
      `${m.parkCount} parks mapped — likely pocket green spaces or small lots, not a substitute for a stadium site; do not treat park count as available land for the venue.`,
    );
  } else if (m.parkCount > 0) {
    lines.push(`${m.parkCount} park(s) nearby — positive for district amenity but unlikely to host a stadium program.`);
  }

  if (m.parkingCount < 8) {
    lines.push(
      `Low mapped parking (${m.parkingCount} features) — expect major match-day parking deficit and spillover on surrounding streets unless structured parking is planned.`,
    );
  } else {
    lines.push(`${m.parkingCount} parking-related features in OSM — still verify real capacity; OSM undercounts structured lots.`);
  }

  if (site.landUseAndZoning.zoningConfidence === "unknown") {
    lines.push("Official zoning is missing — permitted stadium use is unverified; reduce zoning confidence and require authority confirmation.");
  }

  if (site.beirutUrbanLab && site.beirutUrbanLab.bbed.buildings > 0) {
    lines.push(
      `BBED ${site.beirutUrbanLab.bbed.buildings} surveyed buildings reinforce dense built fabric — use as evidence of land constraints, not as a reason to delay site reading with more generic surveys.`,
    );
  }

  lines.push(
    "Stadium-specific: plan for match-day traffic peaks, crowd flow and security perimeter, noise and floodlight disturbance, service/loading access, and parking overflow.",
  );

  return lines;
}

const INTERPRETERS: Partial<Record<ProjectTypeId, (site: StructuredSiteAnalysis) => string[]>> = {
  football_stadium: interpretFootballStadium,
  sports_complex: interpretFootballStadium,
};

function interpretGeneric(site: StructuredSiteAnalysis, type: ProjectTypeId): string[] {
  const m = bm(site);
  if (!m) return ["Run site analysis to interpret metrics for this project type."];
  const label = PROJECT_TYPE_LABELS[type];
  const buildings = buildingStock(site);
  return [
    `${label} at pin: ${buildings} buildings, ${m.roadCount} roads (${m.majorRoadCount} major), ${m.schoolCount} schools, ${m.parkCount} parks, ${m.publicTransportStopCount} transit stops in ${m.studyRadiusMeters} m.`,
    `Built density tier: ${site.qualitativeRatings?.builtDensity ?? site.builtEnvironment.builtDensity ?? "unknown"} — affects land assembly and compatible scale.`,
    `Mobility access tier: ${site.qualitativeRatings?.mobilityAccess ?? "unknown"}; emergency access score ${site.mobility.emergencyAccessScore ?? "n/a"}/100.`,
    site.landUseAndZoning.zoningConfidence === "unknown"
      ? "Zoning unverified — reduce confidence on permitted use."
      : "Planner or partial zoning context present — still confirm with authority.",
  ];
}

export function interpretSiteForProject(
  site: StructuredSiteAnalysis,
  projectType: ProjectTypeId,
): string[] {
  const fn = INTERPRETERS[projectType];
  return fn ? fn(site) : interpretGeneric(site, projectType);
}

export function ensureProjectFeasibility(
  site: StructuredSiteAnalysis,
  projectType: ProjectTypeId,
  customProjectDescription?: string,
): StructuredSiteAnalysis {
  if (site.projectFeasibility?.projectType === projectType) return site;
  return {
    ...site,
    projectFeasibility: runProjectFeasibility(site, projectType, customProjectDescription),
  };
}

/** Authoritative planning judgment block for chat — verdict first, then how to interpret numbers. */
export function formatProjectPlanningAssessmentForPrompt(
  site: StructuredSiteAnalysis,
  projectType: ProjectTypeId,
  customProjectDescription?: string,
): string {
  const enriched = ensureProjectFeasibility(site, projectType, customProjectDescription);
  const f: ProjectFeasibility = enriched.projectFeasibility!;
  const hasData = (enriched.bufferMetrics?.buildingCount ?? 0) + (enriched.bufferMetrics?.roadCount ?? 0) > 0;
  const zoningUnknown = enriched.landUseAndZoning.zoningConfidence === "unknown";
  const label = f.projectTypeLabel;
  const tier = feasibilityVerdictLabel(f.verdict, f.feasibilityScore, hasData);
  const rec = finalRecommendationLabel(f, hasData, zoningUnknown);
  const opening = feasibilityVerdictOpeningLine(label, tier, f.feasibilityScore, rec);

  const interpretation = interpretSiteForProject(enriched, projectType);
  return [
    "Precomputed project readiness for this pin (align ## Project Readiness Summary with these numbers):",
    opening,
    `Internal verdict: ${f.verdict.replace(/_/g, " ")} · score ${f.feasibilityScore}/100.`,
    `Score basis: ${f.scoreRationale}`,
    "Interpretation notes:",
    ...interpretation.map((l) => `- ${l}`),
    "Constraints:",
    ...f.siteConstraints.map((c) => `- ${c}`),
    "Risks:",
    ...f.projectRisks.map((r) => `- ${r}`),
    "Alternatives if score is low:",
    ...f.alternativeRecommendations.map((a) => `- ${a}`),
    `Data confidence: ${enriched.dataConfidence.overall}`,
    "Missing layers only:",
    ...TRULY_MISSING_DATA_LAYERS.map((m) => `- ${m}`),
  ].join("\n");
}
