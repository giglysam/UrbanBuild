import { requireUserJson } from "@/lib/api/auth-json";
import { jsonError } from "@/lib/api/http";
import { logError } from "@/lib/logging/logger";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";

const siteBody = z.object({
  label: z.string().max(200).optional(),
  centerLat: z.number().min(-90).max(90),
  centerLng: z.number().min(-180).max(180),
  radiusM: z.number().min(50).max(2000).default(400),
  boundaryGeojson: z.unknown().optional().nullable(),
});

async function assertProjectOwner(supabase: Awaited<ReturnType<typeof createClient>>, userId: string, projectId: string) {
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
  const gate = await assertProjectOwner(supabase, auth.user.id, projectId);
  if (gate === "not_found") return jsonError("Project not found", 404);
  if (gate === "forbidden") return jsonError("Forbidden", 403);

  const { data: site, error } = await supabase.from("project_sites").select("*").eq("project_id", projectId).maybeSingle();
  if (error) {
    logError("site_get_failed", { message: error.message });
    return jsonError("Failed to load site", 500);
  }

  return NextResponse.json({ site });
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
  const parsed = siteBody.safeParse(json);
  if (!parsed.success) {
    return jsonError("Invalid request body", 400, parsed.error.flatten());
  }

  const supabase = await createClient();
  const gate = await assertProjectOwner(supabase, auth.user.id, projectId);
  if (gate === "not_found") return jsonError("Project not found", 404);
  if (gate === "forbidden") return jsonError("Forbidden", 403);

  const updates: Record<string, unknown> = {
    center_lat: parsed.data.centerLat,
    center_lng: parsed.data.centerLng,
    radius_m: parsed.data.radiusM,
  };
  if (parsed.data.label !== undefined) updates.label = parsed.data.label;
  if (parsed.data.boundaryGeojson !== undefined) updates.boundary_geojson = parsed.data.boundaryGeojson;

  const { data, error } = await supabase
    .from("project_sites")
    .update(updates)
    .eq("project_id", projectId)
    .select("*")
    .maybeSingle();

  if (error) {
    logError("site_patch_failed", { message: error.message });
    return jsonError("Failed to update site", 500);
  }

  return NextResponse.json({ site: data });
}
