import "server-only";

import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";

import { getServerEnv } from "@/env/server";
import { profileDeltaSchema, type ProfileDelta } from "@/lib/types/user-profile";
import { getPlanningModel } from "@/lib/services/openai-planning";

const EXTRACT_INSTRUCTIONS = `You extract durable user preferences from a single planning chat exchange.
Only output preferences the USER clearly stated or strongly implied (likes, dislikes, style, materials, scale, program priorities).
Do not invent preferences. If nothing new, return empty optional fields.
Prefer short phrases (e.g. "timber facades", "low-rise", "shaded plazas").`;

function getClient() {
  const apiKey = getServerEnv().OPENAI_API_KEY;
  if (!apiKey) return null;
  return new OpenAI({ apiKey });
}

/** Returns null when extraction is skipped or yields nothing. */
export async function extractProfileDeltaFromExchange(
  userMessage: string,
  assistantReply: string,
): Promise<ProfileDelta | null> {
  const client = getClient();
  if (!client) return null;

  const hint =
    /\b(i prefer|i like|i love|i want|i need|i hate|i dislike|please use|always|never|favorite|favourite)\b/i.test(
      userMessage,
    );
  if (!hint && userMessage.length < 40) return null;

  const model = getPlanningModel();
  try {
    const response = await client.responses.parse({
      model,
      instructions: EXTRACT_INSTRUCTIONS,
      input: [
        {
          role: "user",
          content: JSON.stringify({
            user_message: userMessage.slice(0, 4000),
            assistant_reply: assistantReply.slice(0, 2000),
          }),
        },
      ],
      text: { format: zodTextFormat(profileDeltaSchema, "profile_delta") },
    });
    const parsed = response.output_parsed;
    if (!parsed) return null;
    const hasContent =
      parsed.summaryDelta ||
      parsed.addDesignTastes?.length ||
      parsed.addMaterialPreferences?.length ||
      parsed.addInterventionPreferences?.length ||
      parsed.addAvoidances?.length ||
      parsed.addNotesFromUser?.length ||
      parsed.communicationStyle;
    return hasContent ? parsed : null;
  } catch {
    return null;
  }
}
