import { requireUserJson } from "@/lib/api/auth-json";
import { jsonError } from "@/lib/api/http";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

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

  const [{ data: project }, { data: site }, { data: runs }, { data: briefs }, { data: scenarios }] = await Promise.all([
    supabase.from("projects").select("*").eq("id", projectId).single(),
    supabase.from("project_sites").select("*").eq("project_id", projectId).maybeSingle(),
    supabase.from("analysis_runs").select("id, status, created_at, result, error").eq("project_id", projectId),
    supabase.from("planning_briefs").select("id, version, content, created_at").eq("project_id", projectId),
    supabase.from("scenarios").select("id, name, payload, is_preferred, created_at").eq("project_id", projectId),
  ]);

  const snapshot = {
    exportedAt: new Date().toISOString(),
    project,
    site,
    analysisRuns: runs ?? [],
    planningBriefs: briefs ?? [],
    scenarios: scenarios ?? [],
  };

  return new NextResponse(JSON.stringify(snapshot, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="project-${projectId}.json"`,
    },
  });
}
