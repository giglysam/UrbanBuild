import { ProjectModulesWorkspace } from "@/components/project-modules-workspace";
import { createClient } from "@/lib/supabase/server";
import { planningContextSchema, siteAnalysisSchema } from "@/lib/types/planning";

export default async function ProjectModulesPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const supabase = await createClient();

  const { data: project } = await supabase.from("projects").select("planning_context").eq("id", projectId).single();

  const pcParsed = planningContextSchema.safeParse(project?.planning_context ?? {});
  const initialContext = pcParsed.success ? pcParsed.data : planningContextSchema.parse({});

  const { data: run } = await supabase
    .from("analysis_runs")
    .select("result")
    .eq("project_id", projectId)
    .eq("status", "completed")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const rawResult = run?.result as
    | {
        indicators?: Record<string, number | string>;
        analysis?: unknown;
      }
    | null
    | undefined;

  const latestIndicators = rawResult?.indicators ?? null;
  const analysisParsed = rawResult?.analysis ? siteAnalysisSchema.safeParse(rawResult.analysis) : null;
  const latestModules = analysisParsed?.success && analysisParsed.data.modules ? analysisParsed.data.modules : null;

  return (
    <ProjectModulesWorkspace
      projectId={projectId}
      initialContext={initialContext}
      latestIndicators={latestIndicators}
      latestModules={latestModules}
    />
  );
}
