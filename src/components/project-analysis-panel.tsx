"use client";

import { Loader2, Sparkles } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import type { PlanningNarrative } from "@/lib/types/planning";
import type { StructuredSiteAnalysis } from "@/lib/types/site-feasibility";
import { FeasibilitySummaryPanel } from "@/components/feasibility-summary-panel";
import { logSiteDataDebug } from "@/lib/planning/format-site-data-used";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

function confidenceVariant(c: string): "default" | "secondary" | "outline" | "muted" {
  if (c === "observed") return "default";
  if (c === "inferred") return "secondary";
  return "outline";
}

export function ProjectAnalysisPanel({ projectId }: { projectId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [siteAnalysis, setSiteAnalysis] = useState<StructuredSiteAnalysis | null>(null);
  const [planningNarrative, setPlanningNarrative] = useState<PlanningNarrative | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moduleFocus: "all" }),
      });
      const data = (await res.json()) as {
        siteAnalysis?: StructuredSiteAnalysis;
        planningNarrative?: PlanningNarrative;
        analysis?: PlanningNarrative;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Analysis failed");
      if (data.siteAnalysis) {
        setSiteAnalysis(data.siteAnalysis);
        logSiteDataDebug(data.siteAnalysis, "UrbanBuild project analyze");
      }
      setPlanningNarrative(data.planningNarrative ?? data.analysis ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Run AI analysis</CardTitle>
          <CardDescription>
            Uses your saved site center and radius, planner context (from Modules), Overpass OSM data, and structured
            OpenAI output including five planning modules. Results are stored on the project.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <Button type="button" onClick={() => void run()} disabled={loading} className="gap-2">
            {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Sparkles className="size-4" aria-hidden />}
            Run analysis
          </Button>
          {error ? <span className="text-sm text-destructive">{error}</span> : null}
        </CardContent>
      </Card>

      <FeasibilitySummaryPanel siteAnalysis={siteAnalysis} />

      {planningNarrative ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Insights</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[320px] pr-4">
                <ul className="space-y-4">
                  {planningNarrative.insights.map((ins, i) => (
                    <li key={i} className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{ins.title}</span>
                        <Badge variant={confidenceVariant(ins.confidence)}>{ins.confidence}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{ins.body}</p>
                      <Separator className="mt-3" />
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Scenarios (preview)</CardTitle>
              <CardDescription>Saved under Scenarios after each successful run.</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[320px] pr-4">
                <ul className="space-y-4">
                  {planningNarrative.scenarios.map((s, i) => (
                    <li key={i}>
                      <div className="font-medium">{s.name}</div>
                      <p className="text-sm text-muted-foreground">{s.summary}</p>
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {planningNarrative?.modules ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Planning modules (summary)</CardTitle>
            <CardDescription>
              Land use, mobility, green space, budget, and risk — see the{" "}
              <Link href={`/projects/${projectId}/modules`} className="text-primary underline-offset-4 hover:underline">
                Modules
              </Link>{" "}
              page for full detail.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm md:grid-cols-2">
            <p>
              <span className="font-medium">Land use: </span>
              {planningNarrative.modules.landUse.summary}
            </p>
            <p>
              <span className="font-medium">Traffic & transit: </span>
              {planningNarrative.modules.trafficTransit.summary}
            </p>
            <p>
              <span className="font-medium">Green space: </span>
              {planningNarrative.modules.greenSpace.summary}
            </p>
            <p>
              <span className="font-medium">Budget: </span>
              {planningNarrative.modules.budget.summary}
            </p>
            <p className="md:col-span-2">
              <span className="font-medium">Risk: </span>
              {planningNarrative.modules.risk.summary}
            </p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
