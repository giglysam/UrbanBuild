import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export default async function ProjectOverviewPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const supabase = await createClient();

  const { data: site } = await supabase.from("project_sites").select("*").eq("project_id", projectId).maybeSingle();

  const { count: analysisCount } = await supabase
    .from("analysis_runs")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId)
    .eq("status", "completed");

  const { count: briefCount } = await supabase
    .from("planning_briefs")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId);

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Modules</CardTitle>
            <CardDescription>Planner inputs, five AI modules, charts</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" size="sm">
              <Link href={`/projects/${projectId}/modules`}>
                Open modules <ArrowRight className="ml-1 size-3" aria-hidden />
              </Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Site</CardTitle>
            <CardDescription>
              {site?.center_lat != null
                ? `${site.center_lat.toFixed(4)}, ${site.center_lng?.toFixed(4)} · ${site.radius_m ?? 400}m`
                : "Not set"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" size="sm">
              <Link href={`/projects/${projectId}/site`}>
                Edit site <ArrowRight className="ml-1 size-3" aria-hidden />
              </Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Analysis runs</CardTitle>
            <CardDescription>{analysisCount ?? 0} completed</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" size="sm">
              <Link href={`/projects/${projectId}/analysis`}>Open analysis</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Planning briefs</CardTitle>
            <CardDescription>{briefCount ?? 0} versions saved</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" size="sm">
              <Link href={`/projects/${projectId}/brief`}>Open briefs</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
