import { runSiteAnalysisPipeline } from "@/lib/analysis/run-site-analysis";
import { requireUserJson } from "@/lib/api/auth-json";
import { jsonError } from "@/lib/api/http";
import { logError, logInfo, logWarn } from "@/lib/logging/logger";
import { createClient } from "@/lib/supabase/server";
import type { Scenario } from "@/lib/types/planning";
import { NextResponse } from "next/server";

export const maxDuration = 60;

async function assertOwner(supabase: Awaited<ReturnType<typeof createClient>>, userId: string, projectId: string) {
  const { data } = await supabase.from("projects").select("owner_id").eq("id", projectId).maybeSingle();
  if (!data) return "not_found" as const;
  if (data.owner_id !== userId) return "forbidden" as const;
  return "ok" as const;
}

export async function POST(_req: Request, ctx: { params: Promise<{ projectId: string }> }) {
  const auth = await requireUserJson();
  if (!auth.ok) return auth.response;
  const { projectId } = await ctx.params;
  const supabase = await createClient();

  const gate = await assertOwner(supabase, auth.user.id, projectId);
  if (gate === "not_found") return jsonError("Project not found", 404);
  if (gate === "forbidden") return jsonError("Forbidden", 403);

  const { data: site, error: siteErr } = await supabase
    .from("project_sites")
    .select("*")
    .eq("project_id", projectId)
    .maybeSingle();

  if (siteErr || !site || site.center_lat == null || site.center_lng == null) {
    return jsonError("Configure site location before analysis", 400);
  }

  const input = {
    lat: site.center_lat,
    lng: site.center_lng,
    radiusM: site.radius_m ?? 400,
    boundaryGeojson: site.boundary_geojson ?? undefined,
  };

  const { data: runRow, error: runInsertErr } = await supabase
    .from("analysis_runs")
    .insert({
      project_id: projectId,
      status: "running",
      input: input as unknown as Record<string, unknown>,
    })
    .select("id")
    .single();

  if (runInsertErr || !runRow) {
    logError("analysis_run_insert_failed", { message: runInsertErr?.message });
    return jsonError("Failed to start analysis", 500);
  }

  const runId = runRow.id as string;

  try {
    const out = await runSiteAnalysisPipeline(input);
    const resultPayload = {
      indicators: out.indicators,
      stats: out.stats,
      featureCollection: out.featureCollection,
      analysis: out.analysis,
    };

    const { error: upErr } = await supabase
      .from("analysis_runs")
      .update({
        status: "completed",
        result: resultPayload as unknown as Record<string, unknown>,
        overpass_remark: out.overpassRemark,
        error: null,
      })
      .eq("id", runId);

    if (upErr) {
      logError("analysis_run_update_failed", { message: upErr.message });
      return jsonError("Analysis completed but failed to save", 500);
    }

    const { error: delErr } = await supabase.from("scenarios").delete().eq("project_id", projectId);
    if (delErr) {
      logError("scenario_delete_failed", { message: delErr.message, projectId, runId });
      return jsonError("Analysis saved but failed to refresh scenarios for this project", 500);
    }

    const scenarios: Scenario[] = out.analysis.scenarios;
    if (scenarios.length > 0) {
      const rows = scenarios.map((s) => ({
        project_id: projectId,
        analysis_run_id: runId,
        name: s.name,
        payload: s as unknown as Record<string, unknown>,
        is_preferred: false,
      }));
      const { error: scErr } = await supabase.from("scenarios").insert(rows);
      if (scErr) {
        logWarn("scenario_insert_failed", { message: scErr.message });
      }
    }

    logInfo("analysis_completed", { projectId, runId });
    return NextResponse.json({
      runId,
      ...resultPayload,
      overpassRemark: out.overpassRemark,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Analysis failed";
    await supabase
      .from("analysis_runs")
      .update({ status: "failed", error: message })
      .eq("id", runId);
    const status = message.includes("OPENAI_API_KEY") ? 503 : 502;
    return jsonError(message, status);
  }
}
