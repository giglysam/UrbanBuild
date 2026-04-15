import { requireUserJson } from "@/lib/api/auth-json";
import { jsonError } from "@/lib/api/http";
import { logError } from "@/lib/logging/logger";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

async function assertOwner(supabase: Awaited<ReturnType<typeof createClient>>, userId: string, projectId: string) {
  const { data } = await supabase.from("projects").select("owner_id").eq("id", projectId).maybeSingle();
  if (!data) return "not_found" as const;
  if (data.owner_id !== userId) return "forbidden" as const;
  return "ok" as const;
}

export async function POST(_req: Request, ctx: { params: Promise<{ projectId: string; scenarioId: string }> }) {
  const auth = await requireUserJson();
  if (!auth.ok) return auth.response;
  const { projectId, scenarioId } = await ctx.params;

  const supabase = await createClient();
  const gate = await assertOwner(supabase, auth.user.id, projectId);
  if (gate === "not_found") return jsonError("Project not found", 404);
  if (gate === "forbidden") return jsonError("Forbidden", 403);

  const { data: scenario, error: sErr } = await supabase
    .from("scenarios")
    .select("id")
    .eq("project_id", projectId)
    .eq("id", scenarioId)
    .maybeSingle();

  if (sErr || !scenario) {
    return jsonError("Scenario not found", 404);
  }

  const { error: clearErr } = await supabase.from("scenarios").update({ is_preferred: false }).eq("project_id", projectId);
  if (clearErr) {
    logError("scenario_prefer_clear_failed", { message: clearErr.message });
    return jsonError("Failed to update preference", 500);
  }

  const { error: setErr } = await supabase.from("scenarios").update({ is_preferred: true }).eq("id", scenarioId);
  if (setErr) {
    logError("scenario_prefer_set_failed", { message: setErr.message });
    return jsonError("Failed to set preferred scenario", 500);
  }

  return NextResponse.json({ ok: true, scenarioId });
}
