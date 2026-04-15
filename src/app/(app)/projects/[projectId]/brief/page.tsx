import { ProjectBriefPanel } from "@/components/project-brief-panel";

export default async function ProjectBriefPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return (
    <div className="p-6">
      <ProjectBriefPanel projectId={projectId} />
    </div>
  );
}
