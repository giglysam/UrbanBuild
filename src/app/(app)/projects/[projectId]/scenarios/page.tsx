import { ProjectScenariosPanel } from "@/components/project-scenarios-panel";

export default async function ProjectScenariosPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return (
    <div className="p-6">
      <ProjectScenariosPanel projectId={projectId} />
    </div>
  );
}
