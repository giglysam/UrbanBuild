import { requireUserJson } from "@/lib/api/auth-json";
import { jsonError } from "@/lib/api/http";
import { logError } from "@/lib/logging/logger";
import { createClient } from "@/lib/supabase/server";
import { planningContextSchema } from "@/lib/types/planning";
import { NextResponse } from "next/server";
import { z } from "zod";

const patchBody = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional().nullable(),
  planningContext: planningContextSchema.optional().nullable(),
});

type ProjectRow = {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  planning_context: unknown;
  created_at: string;
  updated_at: string;
};

function mapProjectResponse(row: ProjectRow) {
  const pcParsed = planningContextSchema.safeParse(row.planning_context ?? {});
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    planningContext: pcParsed.success ? pcParsed.data : {},
  };
}

async function loadOwnedProject(supabase: Awaited<ReturnType<typeof createClient>>, userId: string, projectId: string) {
  const { data, error } = await supabase
    .from("projects")
    .select("id, owner_id, name, description, planning_context, created_at, updated_at")
    .eq("id", projectId)
    .maybeSingle();

  if (error || !data) {
    return { project: null, error: "not_found" as const };
  }
  if (data.owner_id !== userId) {
    return { project: null, error: "forbidden" as const };
  }
  return { project: data as ProjectRow, error: null };
}

export async function GET(_req: Request, ctx: { params: Promise<{ projectId: string }> }) {
  const auth = await requireUserJson();
  if (!auth.ok) return auth.response;
  const { projectId } = await ctx.params;
  const supabase = await createClient();
  const { project, error } = await loadOwnedProject(supabase, auth.user.id, projectId);
  if (error === "not_found") return jsonError("Project not found", 404);
  if (error === "forbidden") return jsonError("Forbidden", 403);

  const { data: site } = await supabase.from("project_sites").select("*").eq("project_id", projectId).maybeSingle();

  return NextResponse.json({ project: mapProjectResponse(project), site });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ projectId: string }> }) {
  const auth = await requireUserJson();
  if (!auth.ok) return auth.response;
  const { projectId } = await ctx.params;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }
  const parsed = patchBody.safeParse(json);
  if (!parsed.success) {
    return jsonError("Invalid request body", 400, parsed.error.flatten());
  }

  const supabase = await createClient();
  const { error } = await loadOwnedProject(supabase, auth.user.id, projectId);
  if (error === "not_found") return jsonError("Project not found", 404);
  if (error === "forbidden") return jsonError("Forbidden", 403);

  const updates: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) updates.name = parsed.data.name;
  if (parsed.data.description !== undefined) updates.description = parsed.data.description;
  if (parsed.data.planningContext !== undefined) {
    updates.planning_context =
      parsed.data.planningContext === null ? {} : planningContextSchema.parse(parsed.data.planningContext);
  }

  if (Object.keys(updates).length === 0) {
    return jsonError("No valid fields to update", 400);
  }

  const { data, error: uErr } = await supabase
    .from("projects")
    .update(updates)
    .eq("id", projectId)
    .select("id, owner_id, name, description, planning_context, created_at, updated_at")
    .single();

  if (uErr || !data) {
    logError("project_patch_failed", { message: uErr?.message });
    return jsonError("Failed to update project", 500);
  }

  return NextResponse.json({ project: mapProjectResponse(data as ProjectRow) });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ projectId: string }> }) {
  const auth = await requireUserJson();
  if (!auth.ok) return auth.response;
  const { projectId } = await ctx.params;
  const supabase = await createClient();
  const { error } = await loadOwnedProject(supabase, auth.user.id, projectId);
  if (error === "not_found") return jsonError("Project not found", 404);
  if (error === "forbidden") return jsonError("Forbidden", 403);

  const { error: dErr } = await supabase.from("projects").delete().eq("id", projectId);
  if (dErr) {
    logError("project_delete_failed", { message: dErr.message });
    return jsonError("Failed to delete project", 500);
  }

  return NextResponse.json({ ok: true });
}
