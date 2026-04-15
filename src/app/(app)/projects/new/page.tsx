import { ProjectCreateForm } from "@/components/project-create-form";

export default function NewProjectPage() {
  return (
    <div className="mx-auto max-w-lg p-6 md:p-10">
      <h1 className="text-2xl font-semibold tracking-tight">New project</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        A project holds your study area, analyses, briefs, scenarios, and files.
      </p>
      <div className="mt-8">
        <ProjectCreateForm />
      </div>
    </div>
  );
}
