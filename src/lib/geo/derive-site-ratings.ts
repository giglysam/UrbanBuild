import { builtDensityFromProxy, residentialSensitivity, type SiteOsmSignals } from "@/lib/geo/extract-site-signals";
import type { SiteBufferMetrics } from "@/lib/geo/site-buffer-metrics";

export const densityTierSchema = ["low", "medium", "high"] as const;
export type DensityTier = (typeof densityTierSchema)[number];

export const accessStrengthSchema = ["weak", "moderate", "strong"] as const;
export type AccessStrength = (typeof accessStrengthSchema)[number];

export type SiteQualitativeRatings = {
  builtDensity: DensityTier;
  mobilityAccess: AccessStrength;
  residentialSensitivity: DensityTier;
  parkingAvailability: AccessStrength;
  greenSpaceAccess: AccessStrength;
};

type MobilityNumeric = {
  roadAccessScore: number;
  publicTransportScore: number;
  pedestrianConnectivityScore: number;
  emergencyAccessScore: number;
};

function scoreToAccessStrength(avgScore: number): AccessStrength {
  if (avgScore >= 68) return "strong";
  if (avgScore >= 48) return "moderate";
  return "weak";
}

export function deriveMobilityAccess(
  metrics: SiteBufferMetrics,
  mobility: MobilityNumeric,
): AccessStrength {
  const avg =
    (mobility.roadAccessScore +
      mobility.publicTransportScore +
      mobility.pedestrianConnectivityScore +
      mobility.emergencyAccessScore) /
    4;

  let strength = scoreToAccessStrength(avg);

  if (metrics.majorRoadCount === 0 && mobility.roadAccessScore < 55) {
    strength = strength === "strong" ? "moderate" : "weak";
  }
  if (metrics.publicTransportStopCount >= 4 && metrics.majorRoadCount >= 1) {
    if (strength === "weak") strength = "moderate";
    else if (strength === "moderate") strength = "strong";
  }

  return strength;
}

export function deriveParkingAvailability(metrics: SiteBufferMetrics): AccessStrength {
  if (metrics.parkingCount >= 6) return "strong";
  if (metrics.parkingCount >= 2) return "moderate";
  if (metrics.parkingCount >= 1 || metrics.roadCount >= 12) return "moderate";
  if (metrics.commercialPoiCount >= 8 && metrics.roadCount >= 6) return "moderate";
  return "weak";
}

export function deriveGreenSpaceAccess(
  metrics: SiteBufferMetrics,
  studyAreaKm2: number,
): AccessStrength {
  const perKm2 = studyAreaKm2 > 0 ? metrics.greenSpaceCount / studyAreaKm2 : 0;

  if (metrics.parkCount >= 2 || metrics.greenSpaceCount >= 10 || perKm2 >= 20) {
    return "strong";
  }
  if (metrics.greenSpaceCount >= 4 || metrics.parkCount >= 1 || perKm2 >= 8) {
    return "moderate";
  }
  if (metrics.greenSpaceCount >= 1 || perKm2 >= 3) {
    return "moderate";
  }
  return "weak";
}

export function deriveBuiltDensity(
  buildingCount: number,
  studyAreaKm2: number,
  densityProxyPerKm2?: number,
): DensityTier {
  const proxy =
    typeof densityProxyPerKm2 === "number" && Number.isFinite(densityProxyPerKm2)
      ? densityProxyPerKm2
      : studyAreaKm2 > 0
        ? buildingCount / studyAreaKm2
        : 0;
  const tier = builtDensityFromProxy(proxy);
  return tier === "unknown" ? "low" : tier;
}

export function deriveSiteQualitativeRatings(
  signals: SiteOsmSignals,
  mobility: MobilityNumeric,
): SiteQualitativeRatings {
  const bm = signals.bufferMetrics;
  const densityProxy =
    signals.studyAreaKm2 > 0 ? bm.buildingCount / signals.studyAreaKm2 : 0;

  const builtDensity = deriveBuiltDensity(
    bm.buildingCount,
    signals.studyAreaKm2,
    densityProxy,
  );

  const resSensRaw = residentialSensitivity(
    bm.buildingCount,
    bm.schoolCount,
    bm.hospitalCount,
  );
  const residentialSensitivityTier: DensityTier =
    resSensRaw === "unknown" ? "low" : resSensRaw;

  return {
    builtDensity,
    mobilityAccess: deriveMobilityAccess(bm, mobility),
    residentialSensitivity: residentialSensitivityTier,
    parkingAvailability: deriveParkingAvailability(bm),
    greenSpaceAccess: deriveGreenSpaceAccess(bm, signals.studyAreaKm2),
  };
}
