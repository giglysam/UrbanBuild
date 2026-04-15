import { requireUserJson } from "@/lib/api/auth-json";
import { jsonError } from "@/lib/api/http";
import { logError } from "@/lib/logging/logger";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";

const createBody = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
});

export async function GET() {
  const auth = await requireUserJson();
  if (!auth.ok) return auth.response;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select("id, name, description, created_at, updated_at")
    .eq("owner_id", auth.user.id)
    .order("updated_at", { ascending: false });

  if (error) {
    logError("projects_list_failed", { message: error.message });
    return jsonError("Failed to load projects", 500);
  }

  return NextResponse.json({ projects: data ?? [] });
}

export async function POST(req: Request) {
  const auth = await requireUserJson();
  if (!auth.ok) return auth.response;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }
  const parsed = createBody.safeParse(json);
  if (!parsed.success) {
    return jsonError("Invalid request body", 400, parsed.error.flatten());
  }

  const supabase = await createClient();
  const { data: project, error: pErr } = await supabase
    .from("projects")
    .insert({
      owner_id: auth.user.id,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
    })
    .select("id, name, description, created_at, updated_at")
    .single();

  if (pErr || !project) {
    logError("project_create_failed", { message: pErr?.message });
    return jsonError("Failed to create project", 500);
  }

  const { error: sErr } = await supabase.from("project_sites").insert({
    project_id: project.id,
    label: "Study area",
    center_lat: 33.8938,
    center_lng: 35.5018,
    radius_m: 400,
  });

  if (sErr) {
    logError("project_site_seed_failed", { message: sErr.message });
  }

  return NextResponse.json({ project }, { status: 201 });
}