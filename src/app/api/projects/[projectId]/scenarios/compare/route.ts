import { compareScenariosWithLLM } from "@/lib/analysis/scenario-compare";
import { requireUserJson } from "@/lib/api/auth-json";
import { jsonError } from "@/lib/api/http";
import { logError } from "@/lib/logging/logger";
import { createClient } from "@/lib/supabase/server";
import { scenarioSchema } from "@/lib/types/planning";
import { NextResponse } from "next/server";
import { z } from "zod";

export const maxDuration = 60;

const bodySchema = z.object({
  scenarioAId: z.string().uuid(),
  scenarioBId: z.string().uuid(),
});

async function assertOwner(supabase: Awaited<ReturnType<typeof createClient>>, userId: string, projectId: string) {
  const { data } = await supabase.from("projects").select("owner_id").eq("id", projectId).maybeSingle();
  if (!data) return "not_found" as const;
  if (data.owner_id !== userId) return "forbidden" as const;
  return "ok" as const;
}

export async function POST(req: Request, ctx: { params: Promise<{ projectId: string }> }) {
  const auth = await requireUserJson();
  if (!auth.ok) return auth.response;
  const { projectId } = await ctx.params;

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

  const supabase = await createClient();
  const gate = await assertOwner(supabase, auth.user.id, projectId);
  if (gate === "not_found") return jsonError("Project not found", 404);
  if (gate === "forbidden") return jsonError("Forbidden", 403);

  const { data: rows, error } = await supabase
    .from("scenarios")
    .select("id, payload")
    .eq("project_id", projectId)
    .in("id", [parsed.data.scenarioAId, parsed.data.scenarioBId]);

  if (error || !rows || rows.length !== 2) {
    return jsonError("Scenarios not found for this project", 404);
  }

  const aRow = rows.find((r) => r.id === parsed.data.scenarioAId);
  const bRow = rows.find((r) => r.id === parsed.data.scenarioBId);
  if (!aRow || !bRow) {
    return jsonError("Scenarios not found for this project", 404);
  }

  const aParsed = scenarioSchema.safeParse(aRow.payload);
  if (!aParsed.success) {
    return jsonError("Invalid scenario A payload", 400, aParsed.error.flatten());
  }
  const bParsed = scenarioSchema.safeParse(bRow.payload);
  if (!bParsed.success) {
    return jsonError("Invalid scenario B payload", 400, bParsed.error.flatten());
  }

  try {
    const result = await compareScenariosWithLLM(aParsed.data, bParsed.data);
    const { data: row, error: insErr } = await supabase
      .from("scenario_comparisons")
      .insert({
        project_id: projectId,
        scenario_a_id: parsed.data.scenarioAId,
        scenario_b_id: parsed.data.scenarioBId,
        result: result as unknown as Record<string, unknown>,
      })
      .select("id, scenario_a_id, scenario_b_id, result, created_at")
      .single();

    if (insErr || !row) {
      logError("scenario_compare_insert_failed", { message: insErr?.message });
      return jsonError("Failed to save comparison", 500);
    }

    /** Single shape: persisted row (metadata + JSONB `result` from the LLM). */
    return NextResponse.json({ comparison: row });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Comparison failed";
    const status = message.includes("OPENAI_API_KEY") ? 503 : 502;
    return jsonError(message, status);
  }
}
