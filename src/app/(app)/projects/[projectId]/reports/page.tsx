import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function ProjectReportsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return (
    <div className="mx-auto max-w-xl space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Exports</CardTitle>
          <CardDescription>Download planning briefs and snapshots for stakeholders.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row">
          <Button asChild variant="outline">
            <a href={`/api/projects/${projectId}/reports/planning-brief`} target="_blank" rel="noreferrer">
              Planning brief (PDF)
            </a>
          </Button>
          <Button asChild variant="outline">
            <a href={`/api/projects/${projectId}/export`} target="_blank" rel="noreferrer">
              Project JSON
            </a>
          </Button>
        </CardContent>
      </Card>
      <p className="text-sm text-muted-foreground">
        <Link href={`/projects/${projectId}/brief`} className="underline">
          Generate a brief
        </Link>{" "}
        before exporting PDF.
      </p>
    </div>
  );
}
