import "server-only";

import OpenAI from "openai";

import { buildArchitecturalImagePrompt } from "@/lib/planning/image-prompt";
import { getServerEnv } from "@/env/server";
import type { ConceptImageRequest, SiteIndicators } from "@/lib/types/planning";

export type ImageGenerationInput = ConceptImageRequest & {
  siteAnalysisSummary?: string | null;
  indicators?: SiteIndicators | null;
};

export type ImageGenerationResult = {
  imageDataUrl: string;
  promptUsed: string;
  revisedPrompt?: string;
  /** Reserved for future Supabase Storage object path */
  storagePath?: string | null;
};

export { buildArchitecturalImagePrompt } from "@/lib/planning/image-prompt";

function getClient() {
  const apiKey = getServerEnv().OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");
  return new OpenAI({ apiKey });
}

export function getImageModel() {
  return getServerEnv().OPENAI_IMAGE_MODEL ?? "dall-e-3";
}

/** Calls OpenAI Images API; returns a PNG data URL for immediate display. */
export async function generateArchitecturalImage(input: ImageGenerationInput): Promise<ImageGenerationResult> {
  const client = getClient();
  const model = getImageModel();
  const promptUsed = buildArchitecturalImagePrompt(input);

  const isDalle3 = model === "dall-e-3";
  const response = await client.images.generate({
    model,
    prompt: promptUsed,
    n: 1,
    size: "1792x1024",
    ...(isDalle3 ? { quality: "hd" as const, style: "natural" as const } : {}),
    response_format: "b64_json",
  });

  const first = response.data?.[0];
  const b64 = first?.b64_json;
  if (!b64) {
    throw new Error("Image model returned no image data. Check OPENAI_API_KEY and billing.");
  }

  return {
    imageDataUrl: `data:image/png;base64,${b64}`,
    promptUsed,
    revisedPrompt: first.revised_prompt ?? undefined,
    storagePath: null,
  };
}
