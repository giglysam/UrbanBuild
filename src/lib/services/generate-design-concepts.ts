import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";

import {
  ASSISTANT_RESPONSE_STYLE,
  DESIGN_CONCEPT_RESPONSE_FORMAT,
  SITE_ANALYSIS_RESPONSE_FORMAT,
} from "@/lib/planning/assistant-response-style";
import { getServerEnv } from "@/env/server";
import {
  designConceptsBundleSchema,
  type DesignConceptsBundle,
  type DesignConceptsRequest,
} from "@/lib/types/planning";
import { getPlanningModel } from "@/lib/services/openai-planning";

const DESIGN_CONCEPTS_SYSTEM = `You are UrbanBuild's pre-design studio — architect and pre-feasibility consultant for engineers, planners, and developers.

Workflow rules (mandatory):
- You are generating design CONCEPTS only after site analysis. Do not skip diagnosis.
- Propose exactly 2 to 4 contrasting concepts. Each must differ in program, massing, or public realm strategy.
- Never invent official zoning or utility maps. Subsurface/utility guidance must be cautious: note unknowns and recommend surveys where data is missing.
- Each concept must include feasibilityAdaptations (no deep basements if water table/flood risk; lighter structure if weak soil inferred; respect utility corridors).
- imagePrompt: one dense paragraph for the image model only (photorealistic, in context, materials, massing, public realm, lighting; no text/watermarks in image).
- Use stable ids: "concept-1", "concept-2", etc.
- Field brevity: designConcept, massingLogic, contextRelationship, facadeOrLandscapeStrategy, publicRealmStrategy, siteFitRationale, feasibilityAdaptations — each ≤ 2 short sentences unless a bullet list fits.
- siteDiagnosis: markdown with the site analysis headings (see below). subsurfaceCautions under Ground and infrastructure themes.

Site analysis headings for siteDiagnosis:
${SITE_ANALYSIS_RESPONSE_FORMAT}

Concept fields map to this presentation (write content accordingly):
${DESIGN_CONCEPT_RESPONSE_FORMAT}

${ASSISTANT_RESPONSE_STYLE}`;

function getClient() {
  const apiKey = getServerEnv().OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");
  return new OpenAI({ apiKey });
}

export async function generateDesignConcepts(input: DesignConceptsRequest): Promise<DesignConceptsBundle> {
  const client = getClient();
  const model = getPlanningModel();

  const response = await client.responses.parse({
    model,
    instructions: DESIGN_CONCEPTS_SYSTEM,
    input: [
      {
        role: "user",
        content: JSON.stringify({
          task: "Produce site diagnosis summary and 2-4 design concepts grounded in the analysis.",
          site: {
            lat: input.lat,
            lng: input.lng,
            radius_m: input.radiusM,
            place_label: input.placeLabel ?? null,
          },
          indicators: input.indicators,
          structured_site_analysis: input.siteAnalysis ?? null,
          planning_narrative: input.analysis ?? null,
          mapbox_context: input.mapboxContextText ?? null,
        }),
      },
    ],
    text: {
      format: zodTextFormat(designConceptsBundleSchema, "design_concepts"),
    },
  });

  const parsed = response.output_parsed;
  if (!parsed) throw new Error("Model returned no parsed design concepts");
  return parsed;
}
