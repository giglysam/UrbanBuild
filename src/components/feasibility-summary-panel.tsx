"use client";

import { Download, FileText } from "lucide-react";
import { useState } from "react";

import { BeirutUrbanLabPanel } from "@/components/beirut-urban-lab-panel";
import { SiteDataDebugPanel } from "@/components/site-data-debug-panel";
import { SiteQualitativeRatingsPanel } from "@/components/site-qualitative-ratings-panel";
import {
  feasibilityVerdictLabel,
  finalRecommendationLabel,
} from "@/lib/planning/project-feasibility-labels";
import type { StructuredSiteAnalysis } from "@/lib/types/site-feasibility";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

function verdictVariant(v: string): "default" | "secondary" | "outline" | "muted" {
  if (v === "likely_suitable") return "default";
  if (v === "conditionally_suitable") return "secondary";
  if (v === "risky") return "outline";
  return "muted";
}

type Props = {
  siteAnalysis: StructuredSiteAnalysis | null;
};

export function FeasibilitySummaryPanel({ siteAnalysis }: Props) {
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const f = siteAnalysis?.projectFeasibility;

  async function exportPdf() {
    if (!siteAnalysis?.projectFeasibility) return;
    setExporting(true);
    setExportError(null);
    try {
      const res = await fetch("/api/feasibility-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteAnalysis }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Export failed");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "site-feasibility-report.pdf";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setExportError(e instanceof Error ? e.message : "Export failed");
    } finally {
      setExporting(false);
    }
  }

  if (!siteAnalysis) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pre-feasibility readiness</CardTitle>
          <CardDescription>
            Pin a site, choose a project type, and run analysis for a preliminary readiness score and study checklist.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div>
          <CardTitle className="text-base">Pre-feasibility readiness</CardTitle>
          <CardDescription>
            Site intelligence · confidence {siteAnalysis.dataConfidence.overall} · radius{" "}
            {siteAnalysis.location.studyRadiusMeters} m
          </CardDescription>
        </div>
        {f ? (
          <Button type="button" size="sm" variant="outline" className="gap-2 shrink-0" disabled={exporting} onClick={() => void exportPdf()}>
            <Download className="size-4" aria-hidden />
            PDF
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4">
        {exportError ? <p className="text-sm text-destructive">{exportError}</p> : null}

        <SiteDataDebugPanel siteAnalysis={siteAnalysis} />
        <SiteQualitativeRatingsPanel ratings={siteAnalysis.qualitativeRatings} />
        <BeirutUrbanLabPanel context={siteAnalysis.beirutUrbanLab} />

        {f ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={verdictVariant(f.verdict)}>
                {feasibilityVerdictLabel(
                  f.verdict,
                  f.feasibilityScore,
                  (siteAnalysis.bufferMetrics?.buildingCount ?? 0) +
                    (siteAnalysis.bufferMetrics?.roadCount ?? 0) >
                    0,
                )}
              </Badge>
              <span className="text-2xl font-semibold tabular-nums">{f.feasibilityScore}</span>
              <span className="text-sm text-muted-foreground">/ 100 · {f.projectTypeLabel}</span>
            </div>
            <p className="text-sm font-medium text-foreground">
              {finalRecommendationLabel(
                f,
                (siteAnalysis.bufferMetrics?.buildingCount ?? 0) +
                  (siteAnalysis.bufferMetrics?.roadCount ?? 0) >
                  0,
                siteAnalysis.landUseAndZoning.zoningConfidence === "unknown",
              )}
            </p>
            <p className="text-sm text-muted-foreground">{f.scoreRationale}</p>
            <Separator />
            <ScrollArea className="h-[280px] pr-3">
              <Section title="Opportunities" items={f.siteOpportunities} />
              <Section title="Constraints" items={f.siteConstraints} />
              <Section title="Risks" items={f.projectRisks} />
              <Section title="Required studies" items={f.requiredStudies} />
              <Section title="Alternatives" items={f.alternativeRecommendations} />
            </ScrollArea>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Structured site context is loaded. Select a project type and re-run analysis for a feasibility score.
          </p>
        )}

        <div className="rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
          <div className="mb-1 flex items-center gap-1 font-medium text-foreground">
            <FileText className="size-3.5" aria-hidden />
            Pre-feasibility scope
          </div>
          <p>
            Confidence {siteAnalysis.dataConfidence.overall}. Chat uses the seven-section readiness format: known OSM/BBED
            data, missing official layers, and required studies — not permit approval.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function Section({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="mb-4">
      <h4 className="mb-2 text-sm font-medium">{title}</h4>
      <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
