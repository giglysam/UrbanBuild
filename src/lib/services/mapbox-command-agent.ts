import "server-only";

import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";

import { getServerEnv } from "@/env/server";
import { mapboxCommandPlanSchema, type MapboxCommandPlan } from "@/lib/types/planning";

const MAPBOX_AGENT_SYSTEM = `You are UrbanBuild's map control agent.
Translate user intent into concrete map actions.

Rules:
- Be direct and practical.
- Prefer actions that improve spatial understanding for urban planning.
- Never fabricate regulatory certainty.
- Output must match the JSON schema exactly.
- Use at most 4 actions.
- Follow-up questions are optional and must be max 2, only if critical details are missing.`;

function getClient() {
  const key = getServerEnv().OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY is not configured");
  return new OpenAI({ apiKey: key });
}

function getModel() {
  return getServerEnv().OPENAI_MODEL ?? "gpt-4o-mini";
}

export async function planMapboxActions(input: {
  userCommand: string;
  mapContextText: string;
}): Promise<MapboxCommandPlan> {
  const client = getClient();
  const response = await client.responses.parse({
    model: getModel(),
    instructions: MAPBOX_AGENT_SYSTEM,
    input: [
      {
        role: "user",
        content: JSON.stringify({
          user_command: input.userCommand,
          map_context: input.mapContextText,
          allowed_actions: [
            "show_route",
            "show_isochrone",
            "show_pois",
            "clear_overlays",
            "set_center",
            "set_style",
          ],
        }),
      },
    ],
    text: {
      format: zodTextFormat(mapboxCommandPlanSchema, "mapbox_command_plan"),
    },
  });

  const parsed = response.output_parsed;
  if (!parsed) throw new Error("Mapbox command plan returned empty output");
  return parsed;
}

export function heuristicMapboxPlan(command: string): MapboxCommandPlan {
  const c = command.toLowerCase();
  const actions: MapboxCommandPlan["actions"] = [];
  if (c.includes("clear")) actions.push({ type: "clear_overlays", reason: "User requested reset" });
  if (c.includes("route") || c.includes("path")) {
    actions.push({ type: "show_route", reason: "User asked for routing" });
  }
  if (c.includes("walk") || c.includes("isochrone") || c.includes("reach")) {
    actions.push({
      type: "show_isochrone",
      reason: "User asked about reachable area",
      profile: c.includes("drive") ? "driving" : c.includes("cycle") ? "cycling" : "walking",
      contourMinutes: [10, 20],
    });
  }
  if (c.includes("amenit") || c.includes("poi") || c.includes("places")) {
    actions.push({ type: "show_pois", reason: "User asked for places/amenities" });
  }
  if (c.includes("satellite")) {
    actions.push({ type: "set_style", reason: "User asked for satellite style", style: "satellite-streets-v12" });
  }
  if (actions.length === 0) {
    actions.push({ type: "show_pois", reason: "Default to useful exploratory layer" });
  }
  return {
    summary: "Generated a practical map action plan from command keywords.",
    actions: actions.slice(0, 4),
  };
}
