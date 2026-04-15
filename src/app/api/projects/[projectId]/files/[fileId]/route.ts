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

export async function DELETE(_req: Request, ctx: { params: Promise<{ projectId: string; fileId: string }> }) {
  const auth = await requireUserJson();
  if (!auth.ok) return auth.response;
  const { projectId, fileId } = await ctx.params;

  const supabase = await createClient();
  const gate = await assertOwner(supabase, auth.user.id, projectId);
  if (gate === "not_found") return jsonError("Project not found", 404);
  if (gate === "forbidden") return jsonError("Forbidden", 403);

  const { data: fileRow, error: fErr } = await supabase
    .from("project_files")
    .select("storage_path")
    .eq("id", fileId)
    .eq("project_id", projectId)
    .maybeSingle();

  if (fErr || !fileRow) {
    return jsonError("File not found", 404);
  }

  const { error: rmErr } = await supabase.storage.from("project-files").remove([fileRow.storage_path]);
  if (rmErr) {
    logError("storage_remove_failed", { message: rmErr.message });
  }

  const { error: dErr } = await supabase.from("project_files").delete().eq("id", fileId);
  if (dErr) {
    logError("file_delete_failed", { message: dErr.message });
    return jsonError("Failed to delete file record", 500);
  }

  return NextResponse.json({ ok: true });
}
