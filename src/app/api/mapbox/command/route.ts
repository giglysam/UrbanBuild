import { jsonError } from "@/lib/api/http";
import { heuristicMapboxPlan, planMapboxActions } from "@/lib/services/mapbox-command-agent";
import { executeMapboxActionPlan } from "@/lib/services/mapbox-data";
import { getServerEnv } from "@/env/server";
import { lngLatSchema, mapboxCommandPlanSchema, mapboxProfileSchema } from "@/lib/types/planning";
import { NextResponse } from "next/server";
import { z } from "zod";

export const maxDuration = 60;

const bodySchema = z.object({
  command: z.string().min(1).max(2000),
  center: lngLatSchema,
  radiusM: z.number().min(50).max(5000).default(800),
  destination: lngLatSchema.optional(),
  profile: mapboxProfileSchema.optional(),
  mapContextText: z.string().max(20_000).default(""),
});

export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return jsonError("Invalid request body", 400, parsed.error.flatten());
  }

  const input = parsed.data;
  let plan = heuristicMapboxPlan(input.command);
  if (getServerEnv().OPENAI_API_KEY) {
    try {
      plan = await planMapboxActions({
        userCommand: input.command,
        mapContextText: input.mapContextText,
      });
    } catch {
      /* fallback to heuristic */
    }
  }
  const safePlan = mapboxCommandPlanSchema.parse(plan);

  try {
    const out = await executeMapboxActionPlan({
      center: input.center,
      radiusM: input.radiusM,
      destination: input.destination,
      profile: input.profile,
      actions: safePlan.actions,
    });
    return NextResponse.json({
      plan: safePlan,
      center: out.center,
      style: out.style,
      route: out.route,
      isochrone: out.isochrone,
      pois: out.pois,
      context: out.context,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to execute map command";
    return jsonError(message, 502);
  }
}
