import {
  generatePlanningBriefDocument,
  planningBriefToMarkdown,
} from "@/lib/analysis/generate-planning-brief";
import { requireUserJson } from "@/lib/api/auth-json";
import { jsonError } from "@/lib/api/http";
import { logError } from "@/lib/logging/logger";
import { createClient } from "@/lib/supabase/server";
import { planningContextSchema, siteAnalysisSchema } from "@/lib/types/planning";
import { NextResponse } from "next/server";
import { z } from "zod";

export const maxDuration = 60;

const postBody = z.object({
  analysisRunId: z.string().uuid().optional(),
  editorNotes: z.string().max(8000).optional(),
});

async function assertOwner(supabase: Awaited<ReturnType<typeof createClient>>, userId: string, projectId: string) {
  const { data } = await supabase.from("projects").select("owner_id").eq("id", projectId).maybeSingle();
  if (!data) return "not_found" as const;
  if (data.owner_id !== userId) return "forbidden" as const;
  return "ok" as const;
}

export async function GET(_req: Request, ctx: { params: Promise<{ projectId: string }> }) {
  const auth = await requireUserJson();
  if (!auth.ok) return auth.response;
  const { projectId } = await ctx.params;
  const supabase = await createClient();
  const gate = await assertOwner(supabase, auth.user.id, projectId);
  if (gate === "not_found") return jsonError("Project not found", 404);
  if (gate === "forbidden") return jsonError("Forbidden", 403);

  const { data, error } = await supabase
    .from("planning_briefs")
    .select("id, version, content, analysis_run_id, created_at")
    .eq("project_id", projectId)
    .order("version", { ascending: false });

  if (error) {
    logError("brief_list_failed", { message: error.message });
    return jsonError("Failed to load briefs", 500);
  }

  return NextResponse.json({ briefs: data ?? [] });
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
  const parsed = postBody.safeParse(json);
  if (!parsed.success) {
    return jsonError("Invalid request body", 400, parsed.error.flatten());
  }

  const supabase = await createClient();
  const gate = await assertOwner(supabase, auth.user.id, projectId);
  if (gate === "not_found") return jsonError("Project not found", 404);
  if (gate === "forbidden") return jsonError("Forbidden", 403);

  const { data: projRow } = await supabase
    .from("projects")
    .select("planning_context")
    .eq("id", projectId)
    .maybeSingle();
  const pcParsed = planningContextSchema.safeParse(projRow?.planning_context ?? {});
  const planningContext = pcParsed.success ? pcParsed.data : null;

  let run: { id: string; result: unknown } | null = null;
  let runErr: { message: string } | null = null;

  if (parsed.data.analysisRunId) {
    const r = await supabase
      .from("analysis_runs")
      .select("id, result")
      .eq("project_id", projectId)
      .eq("id", parsed.data.analysisRunId)
      .maybeSingle();
    run = r.data;
    runErr = r.error;
  } else {
    const r = await supabase
      .from("analysis_runs")
      .select("id, result")
      .eq("project_id", projectId)
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(1);
    run = r.data?.[0] ?? null;
    runErr = r.error;
  }

  if (runErr) {
    logError("brief_run_load_failed", { message: runErr.message });
    return jsonError("Failed to load analysis", 500);
  }

  if (!run) {
    return jsonError("No completed analysis found for this project", 400);
  }

  if (!run.result) {
    return jsonError("Run a site analysis before generating a planning brief", 400);
  }

  const raw = run.result as {
    analysis?: unknown;
    indicators?: Record<string, number | string>;
  };
  const analysisParsed = siteAnalysisSchema.safeParse(raw.analysis);
  const indicators =
    raw.indicators && typeof raw.indicators === "object"
      ? raw.indicators
      : analysisParsed.success
        ? analysisParsed.data.indicators
        : {};

  try {
    const doc = await generatePlanningBriefDocument({
      indicators,
      priorAnalysis: analysisParsed.success ? analysisParsed.data : null,
      planningContext,
      editorNotes: parsed.data.editorNotes,
    });
    const markdown = planningBriefToMarkdown(doc);

    const { data: maxRow } = await supabase
      .from("planning_briefs")
      .select("version")
      .eq("project_id", projectId)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextVersion = (maxRow?.version ?? 0) + 1;

    const { data: briefRow, error: insErr } = await supabase
      .from("planning_briefs")
      .insert({
        project_id: projectId,
        version: nextVersion,
        content: markdown,
        analysis_run_id: run.id as string,
      })
      .select("id, version, content, created_at")
      .single();

    if (insErr || !briefRow) {
      logError("brief_insert_failed", { message: insErr?.message });
      return jsonError("Failed to save planning brief", 500);
    }

    return NextResponse.json({ brief: briefRow, document: doc });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Brief generation failed";
    const status = message.includes("OPENAI_API_KEY") ? 503 : 502;
    return jsonError(message, status);
  }
}
