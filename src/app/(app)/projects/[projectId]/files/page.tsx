import { ProjectFilesPanel } from "@/components/project-files-panel";

export default async function ProjectFilesPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return (
    <div className="p-6">
      <ProjectFilesPanel projectId={projectId} />
    </div>
  );
}
