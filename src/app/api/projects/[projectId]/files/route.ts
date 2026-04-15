import { requireUserJson } from "@/lib/api/auth-json";
import { jsonError } from "@/lib/api/http";
import { getServerEnv } from "@/env/server";
import { logError } from "@/lib/logging/logger";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";

const registerBody = z.object({
  storagePath: z.string().min(1),
  filename: z.string().min(1).max(500),
  mimeType: z.string().max(200).optional(),
  sizeBytes: z.number().int().nonnegative().optional(),
});

const ALLOWED_PREFIX = /^[a-f0-9-]{36}\/[a-f0-9-]{36}\//;

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
    .from("project_files")
    .select("id, storage_path, filename, mime_type, size_bytes, created_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) {
    logError("files_list_failed", { message: error.message });
    return jsonError("Failed to list files", 500);
  }

  return NextResponse.json({ files: data ?? [] });
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
  const parsed = registerBody.safeParse(json);
  if (!parsed.success) {
    return jsonError("Invalid request body", 400, parsed.error.flatten());
  }

  const supabase = await createClient();
  const gate = await assertOwner(supabase, auth.user.id, projectId);
  if (gate === "not_found") return jsonError("Project not found", 404);
  if (gate === "forbidden") return jsonError("Forbidden", 403);

  const maxBytes = getServerEnv().MAX_UPLOAD_BYTES ?? 15 * 1024 * 1024;
  if (parsed.data.sizeBytes != null && parsed.data.sizeBytes > maxBytes) {
    return jsonError(`File too large (max ${maxBytes} bytes)`, 400);
  }

  const path = parsed.data.storagePath;
  if (!path.startsWith(`${auth.user.id}/${projectId}/`)) {
    return jsonError("Invalid storage path for this user/project", 400);
  }
  if (!ALLOWED_PREFIX.test(path)) {
    return jsonError("Invalid storage path format", 400);
  }

  const { data: row, error } = await supabase
    .from("project_files")
    .insert({
      project_id: projectId,
      storage_path: path,
      filename: parsed.data.filename,
      mime_type: parsed.data.mimeType ?? null,
      size_bytes: parsed.data.sizeBytes ?? null,
      uploaded_by: auth.user.id,
    })
    .select("id, storage_path, filename, mime_type, size_bytes, created_at")
    .single();

  if (error || !row) {
    logError("file_register_failed", { message: error?.message });
    return jsonError("Failed to register file", 500);
  }

  return NextResponse.json({ file: row }, { status: 201 });
}
