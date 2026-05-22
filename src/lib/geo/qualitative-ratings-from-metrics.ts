import {
  deriveBuiltDensity,
  deriveGreenSpaceAccess,
  deriveMobilityAccess,
  deriveParkingAvailability,
  type SiteQualitativeRatings,
} from "@/lib/geo/derive-site-ratings";
import { residentialSensitivity } from "@/lib/geo/extract-site-signals";
import type { SiteBufferMetrics } from "@/lib/geo/site-buffer-metrics";

/** Rebuild qualitative ratings when only buffer metrics are stored (legacy runs). */
export function qualitativeRatingsFromBufferMetrics(
  metrics: SiteBufferMetrics,
  studyAreaKm2 = 0.5,
): SiteQualitativeRatings {
  const roadAccessScore =
    metrics.majorRoadCount >= 2
      ? 75
      : metrics.majorRoadCount >= 1
        ? 60
        : metrics.roadCount >= 8
          ? 55
          : 35;

  const mobility = {
    roadAccessScore,
    publicTransportScore: Math.min(90, 20 + metrics.publicTransportStopCount * 12),
    pedestrianConnectivityScore: Math.min(85, 30 + metrics.roadCount * 2),
    emergencyAccessScore: metrics.majorRoadCount >= 1 ? 65 : 40,
  };

  return {
    builtDensity: deriveBuiltDensity(metrics.buildingCount, studyAreaKm2),
    mobilityAccess: deriveMobilityAccess(metrics, mobility),
    residentialSensitivity: (() => {
      const s = residentialSensitivity(
        metrics.buildingCount,
        metrics.schoolCount,
        metrics.hospitalCount,
      );
      return s === "unknown" ? "low" : s;
    })(),
    parkingAvailability: deriveParkingAvailability(metrics),
    greenSpaceAccess: deriveGreenSpaceAccess(metrics, studyAreaKm2),
  };
}
