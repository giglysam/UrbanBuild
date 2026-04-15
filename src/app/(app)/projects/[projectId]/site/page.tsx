import { ProjectSiteEditor } from "@/components/project-site-editor";
import { createClient } from "@/lib/supabase/server";

export default async function ProjectSitePage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const supabase = await createClient();
  const { data: site } = await supabase.from("project_sites").select("*").eq("project_id", projectId).maybeSingle();

  if (!site) {
    return <p className="p-6 text-muted-foreground">Site row missing.</p>;
  }

  return (
    <div className="p-6">
      <ProjectSiteEditor projectId={projectId} initial={site} />
    </div>
  );
}
