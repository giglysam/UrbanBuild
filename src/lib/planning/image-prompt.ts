import type { DesignConcept, SiteIndicators } from "@/lib/types/planning";

export type ImagePromptInput = {
  lat: number;
  lng: number;
  radiusM: number;
  placeLabel?: string;
  concept: DesignConcept;
  siteDiagnosis?: string | null;
  siteAnalysisSummary?: string | null;
  mapboxContextText?: string | null;
  indicators?: SiteIndicators | null;
};

function interventionLabel(type: string): string {
  return type.replace(/_/g, " ");
}

function indicatorsSummary(indicators: SiteIndicators | null | undefined): string | null {
  if (!indicators) return null;
  const keys = [
    "study_radius_m",
    "study_area_km2",
    "osm_building_features_in_buffer",
    "osm_highway_features_in_buffer",
    "osm_park_like_features_in_buffer",
    "building_density_proxy_per_km2",
  ];
  const lines = keys
    .filter((k) => indicators[k] != null)
    .map((k) => `${k.replace(/_/g, " ")}: ${indicators[k]}`);
  return lines.length ? lines.join("; ") : null;
}

/** Builds a site-specific architectural visualization prompt for OpenAI Images. */
export function buildArchitecturalImagePrompt(input: ImagePromptInput): string {
  const { concept } = input;
  const place = input.placeLabel?.trim() || `urban site at ${input.lat.toFixed(4)}, ${input.lng.toFixed(4)}`;
  const projectType = interventionLabel(concept.interventionType);

  const siteContextParts = [
    `Location: ${place}. Study radius: ${input.radiusM} m.`,
    concept.contextRelationship,
    input.siteDiagnosis?.trim(),
    input.siteAnalysisSummary?.trim(),
    input.mapboxContextText?.trim()?.slice(0, 1200),
    indicatorsSummary(input.indicators),
  ].filter(Boolean);

  const designIntervention = [
    concept.designConcept,
    `Massing / spatial logic: ${concept.massingLogic}`,
    `Program: ${concept.program.join(", ")}`,
    `Site fit: ${concept.siteFitRationale}`,
  ].join(" ");

  const materials = concept.materials.join(", ");
  const landscape = [
    concept.publicRealmStrategy,
    concept.facadeOrLandscapeStrategy,
    concept.sustainabilityFeatures.join(", "),
  ]
    .filter(Boolean)
    .join(" ");

  const prompt = `Create a realistic architectural concept visualization of "${concept.title}" on the selected urban site.

Project type:
${projectType}

Site context:
${siteContextParts.join("\n")}

Design intervention:
${designIntervention}

Materials:
${materials}

Landscape / public realm:
${landscape}

Architectural style and façade / landscape strategy:
${concept.facadeOrLandscapeStrategy}

Feasibility / buildability (respect in the design shown):
${concept.feasibilityAdaptations}

Visual direction:
${concept.imagePrompt.trim()}

Camera:
Street-level architectural visualization, realistic perspective, human scale, professional design competition render quality.

Realism:
Photorealistic materials and light; coherent urban scale; Mediterranean coastal city atmosphere when site suggests it.

Important:
Preserve the surrounding urban context as much as possible. Only transform the selected intervention area within the study site. Do not randomly replace unrelated nearby buildings or streets. No text, logos, watermarks, borders, or collage panels in the image.`;

  return prompt.slice(0, 3900);
}
