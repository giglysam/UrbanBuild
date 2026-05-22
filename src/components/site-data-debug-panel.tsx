"use client";

import { buildSiteDataUsedBlocks } from "@/lib/planning/format-site-data-used";
import type { StructuredSiteAnalysis } from "@/lib/types/site-feasibility";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  siteAnalysis: StructuredSiteAnalysis | null | undefined;
  defaultOpen?: boolean;
};

export function SiteDataDebugPanel({ siteAnalysis }: Props) {
  if (!siteAnalysis) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Data sources (debug)</CardTitle>
          <CardDescription>Run site analysis to see OSM, BBED, and missing-dataset breakdown.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const blocks = buildSiteDataUsedBlocks(siteAnalysis);
  const confidence = siteAnalysis.dataConfidence.overall;

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-mono">Data sources (debug)</CardTitle>
        <CardDescription>
          Pin {blocks.pin.lat.toFixed(5)}, {blocks.pin.lng.toFixed(5)} · {blocks.pin.radiusM} m · confidence{" "}
          <span className="font-medium text-foreground">{confidence}</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 font-mono text-xs">
        <DebugSection title="OpenStreetMap / Overpass" items={blocks.osm} />
        <DebugSection title="Beirut Urban Lab / BBED" items={blocks.bbed} />
        <DebugSection title="Admin / cadastral metadata" items={blocks.admin.length ? blocks.admin : ["— none at pin —"]} />
        <DebugSection title="Missing or unavailable" items={blocks.missing} />
        {blocks.warnings.length > 0 ? <DebugSection title="Warnings" items={blocks.warnings} /> : null}
        <p className="text-muted-foreground">{blocks.confidence}</p>
      </CardContent>
    </Card>
  );
}

function DebugSection({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="mb-1 font-sans text-xs font-medium text-foreground">{title}</p>
      <ul className="list-inside list-disc space-y-0.5 text-muted-foreground">
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
