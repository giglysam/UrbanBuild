import {
  FINAL_RECOMMENDATION_LABELS,
  finalRecommendationFromFeasibility,
} from "@/lib/planning/pre-project-readiness";
import type { FeasibilityVerdict, ProjectFeasibility } from "@/lib/types/site-feasibility";

export function finalRecommendationLabel(
  f: ProjectFeasibility,
  hasBufferData: boolean,
  zoningUnknown: boolean,
): string {
  const key = finalRecommendationFromFeasibility(f, hasBufferData, zoningUnknown);
  return FINAL_RECOMMENDATION_LABELS[key];
}

/** User-facing feasibility tier from rule-based verdict + score. */
export function feasibilityVerdictLabel(
  verdict: FeasibilityVerdict,
  score: number,
  hasBufferData: boolean,
): string {
  if (!hasBufferData) return "Insufficient data";
  if (verdict === "likely_suitable") return "High feasibility";
  if (verdict === "conditionally_suitable") return "Medium feasibility";
  if (verdict === "risky") return "Low feasibility";
  return "Not recommended";
}

export function feasibilityVerdictOpeningLine(
  projectLabel: string,
  verdictLabel: string,
  score: number,
  recommendationLabel?: string,
): string {
  const rec = recommendationLabel ? ` Recommendation: ${recommendationLabel}.` : "";
  return `Preliminary project readiness for ${projectLabel}: ${verdictLabel}, approximately ${score}/100.${rec}`;
}
