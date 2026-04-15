import { ProjectNav } from "@/components/project-nav";
import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: project, error } = await supabase
    .from("projects")
    .select("id, name, owner_id")
    .eq("id", projectId)
    .maybeSingle();

  if (error || !project || project.owner_id !== user.id) {
    notFound();
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="border-b px-6 py-4">
        <h1 className="text-xl font-semibold tracking-tight">{project.name}</h1>
        <p className="text-sm text-muted-foreground">Project workspace</p>
      </header>
      <ProjectNav projectId={projectId} />
      <div className="flex-1">{children}</div>
    </div>
  );
}
