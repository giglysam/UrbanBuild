import type { SiteBufferMetrics } from "@/lib/geo/site-buffer-metrics";
import type { BeirutUrbanLabContext } from "@/lib/types/beirut-urban-lab";
import type { StructuredSiteAnalysis } from "@/lib/types/site-feasibility";

import { CANONICAL_MISSING_DATA } from "@/lib/planning/pre-project-readiness";

/** Datasets UrbanBuild does not load — for Missing Data sections only (never pin coordinates). */
export const DEFAULT_MISSING_DATASETS = [...CANONICAL_MISSING_DATA];

export type SiteDataUsedBlocks = {
  pin: { lat: number; lng: number; radiusM: number; placeLabel?: string };
  osm: string[];
  bbed: string[];
  admin: string[];
  missing: string[];
  warnings: string[];
  confidence: string;
};

function formatOsmLines(bm: SiteBufferMetrics): string[] {
  return [
    `Study radius ${bm.studyRadiusMeters} m (community-sourced OSM / Overpass, not municipal GIS)`,
    `Buildings ${bm.buildingCount}, roads ${bm.roadCount}, major roads ${bm.majorRoadCount}, intersections ${bm.intersectionCount}`,
    `Schools ${bm.schoolCount}, hospitals ${bm.hospitalCount}, religious ${bm.religiousBuildingCount}`,
    `Parks ${bm.parkCount}, green space ${bm.greenSpaceCount}, parking ${bm.parkingCount}`,
    `Transit stops ${bm.publicTransportStopCount}, commercial POIs ${bm.commercialPoiCount}, sports ${bm.sportsFacilityCount}`,
  ];
}

function formatBbedLines(bul: BeirutUrbanLabContext): string[] {
  const { bbed } = bul;
  return [
    `BBED 2024 feature counts in ${bul.studyRadiusMeters} m buffer (surveyed stock; counts only — no parcel or building footprints on map)`,
    `Surveyed buildings ${bbed.buildings}, gardens ${bbed.gardens}, parking/empty lots ${bbed.parkingAndEmptyLots}`,
    `Commercial ground floor ${bbed.commercialGroundFloor}, solar rooftops ${bbed.solarPanelRooftop}, rivers ${bbed.rivers}, landmarks ${bbed.landmarks}`,
  ];
}

function formatAdminLines(site: StructuredSiteAnalysis): string[] {
  const lines: string[] = [];
  const bul = site.beirutUrbanLab;
  if (bul) {
    const { adminAtPin, icil } = bul;
    if (adminAtPin.kadaa || adminAtPin.mohafaza) {
      lines.push(
        `BBED admin at pin (polygon boundaries not loaded): ${[adminAtPin.kadaa, adminAtPin.mohafaza].filter(Boolean).join(" · ")}`,
      );
    }
    if (adminAtPin.cadastralEnglishName || adminAtPin.cadastralId != null) {
      lines.push(
        `Cadastral label at pin only (not parcel geometry): ${adminAtPin.cadastralEnglishName ?? "—"}${adminAtPin.cadastralId != null ? ` (ID ${adminAtPin.cadastralId})` : ""}`,
      );
    }
    if (icil?.districtName || icil?.municipalityName) {
      lines.push(
        `AUB ICIL district/municipality names at pin: ${[icil.districtName, icil.municipalityName].filter(Boolean).join(" · ")}`,
      );
    }
  }
  if (site.location.neighborhood && !lines.some((l) => l.includes(site.location.neighborhood!))) {
    lines.push(`Neighborhood / place label: ${site.location.neighborhood}`);
  }
  return lines;
}

export function buildSiteDataUsedBlocks(site: StructuredSiteAnalysis): SiteDataUsedBlocks {
  const bm = site.bufferMetrics;
  const bul = site.beirutUrbanLab;
  const missing = [...site.dataConfidence.missingData];
  const warnings = [...site.dataConfidence.warnings];

  return {
    pin: {
      lat: site.location.lat,
      lng: site.location.lng,
      radiusM: site.location.studyRadiusMeters,
      placeLabel: site.location.neighborhood,
    },
    osm: bm ? formatOsmLines(bm) : ["OSM buffer metrics not computed — run site analysis"],
    bbed: bul
      ? formatBbedLines(bul)
      : ["Beirut Urban Lab / BBED not available for this pin (outside Beirut coverage or fetch failed)"],
    admin: formatAdminLines(site),
    missing: missing.length ? missing : [...DEFAULT_MISSING_DATASETS],
    warnings,
    confidence: `Overall data confidence: ${site.dataConfidence.overall} (OSM + optional BBED counts; zoning and legal status unverified)`,
  };
}

/** Markdown block the model must echo (or closely match) before feasibility verdicts. */
export function formatSiteDataUsedMarkdown(site: StructuredSiteAnalysis): string {
  const b = buildSiteDataUsedBlocks(site);
  const lines = [
    "## Data Used",
    `- Pin: ${b.pin.lat.toFixed(5)}, ${b.pin.lng.toFixed(5)} · study radius ${b.pin.radiusM} m${b.pin.placeLabel ? ` · ${b.pin.placeLabel}` : ""}`,
    `- ${b.confidence}`,
    "- OpenStreetMap / Overpass:",
    ...b.osm.map((l) => `  - ${l}`),
    "- Beirut Urban Lab / BBED:",
    ...b.bbed.map((l) => `  - ${l}`),
  ];
  if (b.admin.length) {
    lines.push("- Administrative / cadastral metadata (labels at pin, not parcel shapes):");
    for (const l of b.admin) lines.push(`  - ${l}`);
  }
  lines.push("- Missing data layers (not the pin — coordinates belong above):");
  for (const m of b.missing) lines.push(`  - ${m}`);
  if (b.warnings.length) {
    lines.push("- Data warnings:");
    for (const w of b.warnings) lines.push(`  - ${w}`);
  }
  return lines.join("\n");
}

/** Compact authoritative block injected into system prompts. */
export function formatSiteDataUsedForPrompt(
  site: StructuredSiteAnalysis,
  opts?: { compact?: boolean },
): string {
  const b = buildSiteDataUsedBlocks(site);
  const lines = [
    "Site GIS metrics (use these exact numbers in ## Data Used):",
    `Pin: ${b.pin.lat.toFixed(5)}, ${b.pin.lng.toFixed(5)} · radius ${b.pin.radiusM} m`,
    b.confidence,
    "OSM / Overpass:",
    ...b.osm.map((l) => `  - ${l}`),
    "BBED:",
    ...b.bbed.map((l) => `  - ${l}`),
    ...(b.admin.length ? ["Admin (labels at pin only):", ...b.admin.map((l) => `  - ${l}`)] : []),
    "Truly missing layers:",
    ...b.missing.map((l) => `  - ${l}`),
    ...(b.warnings.length ? b.warnings.map((w) => `  - Warning: ${w}`) : []),
  ];
  if (!opts?.compact) {
    lines.push(formatSiteDataUsedMarkdown(site));
  }
  return lines.join("\n");
}

/** Dev-only structured console output after site analysis. */
export function logSiteDataDebug(site: StructuredSiteAnalysis, label = "UrbanBuild site data"): void {
  if (typeof console === "undefined" || !console.groupCollapsed) return;
  const b = buildSiteDataUsedBlocks(site);
  console.groupCollapsed(`[${label}] ${b.pin.lat.toFixed(5)}, ${b.pin.lng.toFixed(5)} · ${b.pin.radiusM}m · confidence ${site.dataConfidence.overall}`);
  console.log("OSM / Overpass", Object.fromEntries(b.osm.map((s, i) => [`line${i}`, s])));
  console.log("BBED", Object.fromEntries(b.bbed.map((s, i) => [`line${i}`, s])));
  console.log("Admin / cadastral metadata", b.admin);
  console.log("Missing datasets", b.missing);
  console.log("Warnings", b.warnings);
  console.log("Data confidence", site.dataConfidence.overall);
  console.groupEnd();
}
