import { generateDesignConcepts } from "@/lib/services/generate-design-concepts";
import { jsonError } from "@/lib/api/http";
import { designConceptsRequestSchema } from "@/lib/types/planning";
import { NextResponse } from "next/server";

export const maxDuration = 90;

export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const parsed = designConceptsRequestSchema.safeParse(json);
  if (!parsed.success) {
    return jsonError("Invalid request body", 400, parsed.error.flatten());
  }

  try {
    const bundle = await generateDesignConcepts(parsed.data);
    return NextResponse.json({ bundle });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Concept generation failed";
    const status = message.includes("OPENAI_API_KEY") ? 503 : 502;
    return jsonError(message, status);
  }
}
