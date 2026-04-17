import { ProjectChatPanel } from "@/components/project-chat-panel";

export default async function ProjectChatPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return (
    <div className="p-6">
      <ProjectChatPanel key={projectId} projectId={projectId} />
    </div>
  );
}
