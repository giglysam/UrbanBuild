import { ProjectAnalysisPanel } from "@/components/project-analysis-panel";

export default async function ProjectAnalysisPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return (
    <div className="p-6">
      <ProjectAnalysisPanel projectId={projectId} />
    </div>
  );
}
