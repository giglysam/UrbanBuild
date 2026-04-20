"use client";

import { Loader2, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ProjectAnalyticsCharts } from "@/components/project-analytics-charts";
import { ProjectPlanningContextForm } from "@/components/project-planning-context-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import type { PlanningContext, PlanningModuleId, PlanningModulesOutput } from "@/lib/types/planning";

const MODULES: { id: Exclude<PlanningModuleId, "all">; title: string; blurb: string }[] = [
  {
    id: "land_use",
    title: "Land use analyzer",
    blurb: "Zoning mix, land-use efficiency, and optimization ideas (non-binding).",
  },
  {
    id: "traffic_transit",
    title: "Traffic & transit planner",
    blurb: "Street network context, access, and infrastructure priorities.",
  },
  {
    id: "green_space",
    title: "Green space advisor",
    blurb: "Parks, open space, and sustainability initiatives.",
  },
  {
    id: "budget",
    title: "Budget allocator",
    blurb: "Prioritized spending themes and tradeoffs vs. your line items.",
  },
  {
    id: "risk",
    title: "Risk assessment",
    blurb: "Hazards, exposure, and mitigations informed by flags + OSM context.",
  },
];

export function ProjectModulesWorkspace({
  projectId,
  initialContext,
  latestIndicators,
  latestModules,
}: {
  projectId: string;
  initialContext: PlanningContext;
  latestIndicators: Record<string, number | string> | null;
  latestModules: PlanningModulesOutput | null;
}) {
  const router = useRouter();
  const [running, setRunning] = useState<PlanningModuleId | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runAnalysis(focus: PlanningModuleId) {
    setRunning(focus);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moduleFocus: focus }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Analysis failed");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setRunning(null);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-10 p-6">
      <div>
        <h2 className="text-lg font-semibold">Planner inputs</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Save context once; it is included in analysis, briefs, and chat. Configure your site under{" "}
          <Link href={`/projects/${projectId}/site`} className="text-primary underline-offset-4 hover:underline">
            Site
          </Link>
          .
        </p>
        <div className="mt-6 rounded-lg border bg-card p-6">
          <ProjectPlanningContextForm projectId={projectId} initialContext={initialContext} />
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold">Planning modules</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Run a focused AI pass on one module, or run all modules together from Analysis.
        </p>
        {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {MODULES.map((m) => (
            <Card key={m.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{m.title}</CardTitle>
                <CardDescription>{m.blurb}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  type="button"
                  size="sm"
                  className="gap-2"
                  disabled={running !== null}
                  onClick={() => void runAnalysis(m.id)}
                >
                  {running === m.id ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Sparkles className="size-4" aria-hidden />}
                  Run module
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button type="button" variant="secondary" disabled={running !== null} onClick={() => void runAnalysis("all")}>
            {running === "all" ? <Loader2 className="mr-2 size-4 animate-spin" aria-hidden /> : null}
            Run all modules (same as full analysis)
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href={`/projects/${projectId}/analysis`}>Open analysis tab</Link>
          </Button>
        </div>
      </div>

      {latestIndicators && Object.keys(latestIndicators).length > 0 ? (
        <div>
          <h2 className="text-lg font-semibold">Visualizations</h2>
          <p className="mt-1 text-sm text-muted-foreground">Indicators from your last run and planner time series.</p>
          <div className="mt-4">
            <ProjectAnalyticsCharts indicators={latestIndicators} populationByYear={initialContext.populationByYear} />
          </div>
        </div>
      ) : null}

      <ModuleOutputsDisplay modules={latestModules} projectId={projectId} />
    </div>
  );
}

function severityVariant(s: string): "default" | "secondary" | "outline" | "muted" {
  if (s === "high") return "default";
  if (s === "medium") return "secondary";
  return "outline";
}

function ModuleOutputsDisplay({
  modules,
  projectId,
}: {
  modules: PlanningModulesOutput | null;
  projectId: string;
}) {
  if (!modules) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Module outputs</CardTitle>
          <CardDescription>Run analysis to populate land use, mobility, green space, budget, and risk sections.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline" size="sm">
            <Link href={`/projects/${projectId}/analysis`}>Go to analysis</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Latest module outputs</h2>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Land use</CardTitle>
            <CardDescription>{modules.landUse.summary}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <span className="font-medium">Recommendations</span>
              <ul className="mt-1 list-inside list-disc text-muted-foreground">
                {modules.landUse.recommendations.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
            <Separator />
            <div>
              <span className="font-medium">Zoning optimization ideas</span>
              <ul className="mt-1 list-inside list-disc text-muted-foreground">
                {modules.landUse.zoningOptimizationIdeas.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Traffic & transit</CardTitle>
            <CardDescription>{modules.trafficTransit.summary}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <span className="font-medium">Infrastructure</span>
              <ul className="mt-1 list-inside list-disc text-muted-foreground">
                {modules.trafficTransit.infrastructureRecommendations.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
            <Separator />
            <div>
              <span className="font-medium">Access & transit gaps</span>
              <ul className="mt-1 list-inside list-disc text-muted-foreground">
                {modules.trafficTransit.transitAndAccessGaps.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Green space</CardTitle>
            <CardDescription>{modules.greenSpace.summary}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <span className="font-medium">Parks & open space</span>
              <ul className="mt-1 list-inside list-disc text-muted-foreground">
                {modules.greenSpace.parkAndOpenSpaceIdeas.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
            <Separator />
            <div>
              <span className="font-medium">Sustainability</span>
              <ul className="mt-1 list-inside list-disc text-muted-foreground">
                {modules.greenSpace.sustainabilityInitiatives.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Budget allocator</CardTitle>
            <CardDescription>{modules.budget.summary}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div>
              <span className="text-sm font-medium">Prioritized spending</span>
              <ScrollArea className="mt-2 h-[200px] pr-3">
                <ul className="space-y-3 text-sm">
                  {modules.budget.prioritizedSpending.map((p, i) => (
                    <li key={i}>
                      <div className="font-medium">{p.projectOrTheme}</div>
                      <p className="text-muted-foreground">{p.rationale}</p>
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            </div>
            <div>
              <span className="text-sm font-medium">Tradeoffs</span>
              <ul className="mt-2 list-inside list-disc text-sm text-muted-foreground">
                {modules.budget.tradeoffs.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Risk assessment</CardTitle>
            <CardDescription>{modules.risk.summary}</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-4">
              {modules.risk.risks.map((r, i) => (
                <li key={i} className="rounded-md border p-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{r.hazard}</span>
                    <Badge variant={severityVariant(r.severity)}>{r.severity}</Badge>
                  </div>
                  <p className="mt-2 text-muted-foreground">
                    <span className="font-medium text-foreground">Evidence: </span>
                    {r.evidence}
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    <span className="font-medium text-foreground">Mitigation: </span>
                    {r.mitigation}
                  </p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
