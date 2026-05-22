import { requireUserJson } from "@/lib/api/auth-json";
import { jsonError } from "@/lib/api/http";
import { logError } from "@/lib/logging/logger";
import { createClient } from "@/lib/supabase/server";
import {
  designConceptsBundleSchema,
  planningNarrativeSchema,
  siteIndicatorsSchema,
  type Scenario,
} from "@/lib/types/planning";
import { structuredSiteAnalysisSchema } from "@/lib/types/site-feasibility";
import { NextResponse } from "next/server";
import { z } from "zod";

const saveWorkspaceSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  site: z.object({
    label: z.string().max(500).optional(),
    centerLat: z.number(),
    centerLng: z.number(),
    radiusM: z.number().min(50).max(2000),
  }),
  indicators: siteIndicatorsSchema.optional(),
  siteAnalysis: structuredSiteAnalysisSchema.optional(),
  analysis: planningNarrativeSchema.optional(),
  designBundle: designConceptsBundleSchema.optional(),
  chatMessages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(16000),
      }),
    )
    .max(80)
    .optional(),
});

export async function POST(req: Request) {
  const auth = await requireUserJson();
  if (!auth.ok) return auth.response;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const parsed = saveWorkspaceSchema.safeParse(json);
  if (!parsed.success) {
    return jsonError("Invalid request body", 400, parsed.error.flatten());
  }

  const supabase = await createClient();
  const body = parsed.data;

  const { data: project, error: pErr } = await supabase
    .from("projects")
    .insert({
      owner_id: auth.user.id,
      name: body.name,
      description: body.description ?? `Saved from demo — ${body.site.label ?? "study area"}`,
    })
    .select("id, name")
    .single();

  if (pErr || !project) {
    logError("save_workspace_project_failed", { message: pErr?.message });
    return jsonError("Failed to create project", 500);
  }

  const projectId = project.id as string;

  const { error: siteErr } = await supabase.from("project_sites").insert({
    project_id: projectId,
    label: body.site.label ?? "Study area",
    center_lat: body.site.centerLat,
    center_lng: body.site.centerLng,
    radius_m: body.site.radiusM,
  });

  if (siteErr) {
    logError("save_workspace_site_failed", { message: siteErr.message });
    return jsonError("Project created but site save failed", 500);
  }

  if (body.indicators && (body.siteAnalysis || body.analysis)) {
    const resultPayload = {
      indicators: body.indicators,
      siteAnalysis: body.siteAnalysis ?? null,
      planningNarrative: body.analysis ?? null,
      analysis: body.analysis ?? null,
      designBundle: body.designBundle ?? null,
      savedFrom: "demo",
    };

    const { data: runRow, error: runErr } = await supabase
      .from("analysis_runs")
      .insert({
        project_id: projectId,
        status: "completed",
        input: {
          lat: body.site.centerLat,
          lng: body.site.centerLng,
          radiusM: body.site.radiusM,
        },
        result: resultPayload as unknown as Record<string, unknown>,
      })
      .select("id")
      .single();

    if (!runErr && runRow) {
      const scenarios: Scenario[] = body.analysis?.scenarios ?? [];
      if (scenarios.length > 0) {
        await supabase.from("scenarios").insert(
          scenarios.map((s) => ({
            project_id: projectId,
            analysis_run_id: runRow.id,
            name: s.name,
            payload: s as unknown as Record<string, unknown>,
            is_preferred: false,
          })),
        );
      }
    }
  }

  if (body.chatMessages?.length) {
    const { data: thread, error: tErr } = await supabase
      .from("chat_threads")
      .insert({ project_id: projectId, title: "Imported from demo" })
      .select("id")
      .single();

    if (!tErr && thread) {
      const rows = body.chatMessages
        .filter((m) => m.content.trim())
        .map((m) => ({
          thread_id: thread.id,
          role: m.role,
          content: m.content.trim(),
          meta: { source: "demo_import" },
        }));
      if (rows.length) {
        await supabase.from("chat_messages").insert(rows);
      }
    }
  }

  return NextResponse.json({ projectId, name: project.name }, { status: 201 });
}
