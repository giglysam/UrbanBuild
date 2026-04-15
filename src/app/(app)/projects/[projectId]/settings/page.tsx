import { ProjectSettingsForm } from "@/components/project-settings-form";
import { createClient } from "@/lib/supabase/server";

export default async function ProjectSettingsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const supabase = await createClient();
  const { data: project } = await supabase
    .from("projects")
    .select("id, name, description")
    .eq("id", projectId)
    .single();

  if (!project) {
    return null;
  }

  return (
    <div className="mx-auto max-w-lg p-6">
      <h2 className="text-lg font-semibold">Project settings</h2>
      <p className="mt-1 text-sm text-muted-foreground">Update name and description. Danger zone: delete project.</p>
      <div className="mt-6">
        <ProjectSettingsForm projectId={projectId} initialName={project.name} initialDescription={project.description ?? ""} />
      </div>
    </div>
  );
}
