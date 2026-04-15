import { requireUserJson } from "@/lib/api/auth-json";
import { jsonError } from "@/lib/api/http";
import { renderPlanningBriefPdf } from "@/lib/reports/planning-brief-pdf";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

async function assertOwner(supabase: Awaited<ReturnType<typeof createClient>>, userId: string, projectId: string) {
  const { data } = await supabase.from("projects").select("owner_id").eq("id", projectId).maybeSingle();
  if (!data) return "not_found" as const;
  if (data.owner_id !== userId) return "forbidden" as const;
  return "ok" as const;
}

export async function GET(req: Request, ctx: { params: Promise<{ projectId: string }> }) {
  const auth = await requireUserJson();
  if (!auth.ok) return auth.response;
  const { projectId } = await ctx.params;
  const { searchParams } = new URL(req.url);
  const versionParam = searchParams.get("version");

  const supabase = await createClient();
  const gate = await assertOwner(supabase, auth.user.id, projectId);
  if (gate === "not_found") return jsonError("Project not found", 404);
  if (gate === "forbidden") return jsonError("Forbidden", 403);

  let brief: { content: string; version: number } | null = null;
  let error: { message: string } | null = null;

  if (versionParam) {
    const r = await supabase
      .from("planning_briefs")
      .select("content, version")
      .eq("project_id", projectId)
      .eq("version", Number(versionParam))
      .maybeSingle();
    brief = r.data
      ? { content: String(r.data.content), version: Number(r.data.version) }
      : null;
    error = r.error;
  } else {
    const r = await supabase
      .from("planning_briefs")
      .select("content, version")
      .eq("project_id", projectId)
      .order("version", { ascending: false })
      .limit(1);
    const row = r.data?.[0];
    brief = row
      ? { content: String(row.content), version: Number(row.version) }
      : null;
    error = r.error;
  }

  if (error || !brief) {
    return jsonError("Planning brief not found", 404);
  }

  const buf = await renderPlanningBriefPdf(brief.content);
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="planning-brief-v${brief.version}.pdf"`,
    },
  });
}
