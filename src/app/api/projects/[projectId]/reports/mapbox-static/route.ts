import { requireUserJson } from "@/lib/api/auth-json";
import { jsonError } from "@/lib/api/http";
import { fetchMapboxStaticImage } from "@/lib/services/mapbox-data";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";

async function assertOwner(supabase: Awaited<ReturnType<typeof createClient>>, userId: string, projectId: string) {
  const { data } = await supabase.from("projects").select("owner_id").eq("id", projectId).maybeSingle();
  if (!data) return "not_found" as const;
  if (data.owner_id !== userId) return "forbidden" as const;
  return "ok" as const;
}

const querySchema = z.object({
  zoom: z.coerce.number().min(1).max(20).optional(),
  width: z.coerce.number().int().min(200).max(1280).optional(),
  height: z.coerce.number().int().min(200).max(1280).optional(),
  style: z.enum(["streets-v12", "light-v11", "dark-v11", "satellite-streets-v12"]).optional(),
});

export async function GET(req: Request, ctx: { params: Promise<{ projectId: string }> }) {
  const auth = await requireUserJson();
  if (!auth.ok) return auth.response;
  const { projectId } = await ctx.params;
  const supabase = await createClient();
  const gate = await assertOwner(supabase, auth.user.id, projectId);
  if (gate === "not_found") return jsonError("Project not found", 404);
  if (gate === "forbidden") return jsonError("Forbidden", 403);

  const qp = querySchema.safeParse(Object.fromEntries(new URL(req.url).searchParams.entries()));
  if (!qp.success) return jsonError("Invalid query params", 400, qp.error.flatten());

  const { data: site } = await supabase
    .from("project_sites")
    .select("center_lat, center_lng")
    .eq("project_id", projectId)
    .maybeSingle();
  if (site?.center_lat == null || site.center_lng == null) {
    return jsonError("Set project site center before exporting map image", 400);
  }

  try {
    const img = await fetchMapboxStaticImage({
      center: { lat: site.center_lat, lng: site.center_lng },
      marker: { lat: site.center_lat, lng: site.center_lng },
      zoom: qp.data.zoom ?? 13,
      width: qp.data.width ?? 1200,
      height: qp.data.height ?? 800,
      style: qp.data.style ?? "light-v11",
    });
    return new NextResponse(new Uint8Array(img), {
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `attachment; filename="project-${projectId}-map.png"`,
      },
    });
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "Map image export failed", 502);
  }
}
