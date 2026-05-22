"use client";

import type { SiteBufferMetrics } from "@/lib/geo/site-buffer-metrics";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const METRIC_ROWS: { key: keyof SiteBufferMetrics; label: string }[] = [
  { key: "buildingCount", label: "Buildings" },
  { key: "roadCount", label: "Roads" },
  { key: "majorRoadCount", label: "Major roads" },
  { key: "intersectionCount", label: "Intersections" },
  { key: "schoolCount", label: "Schools" },
  { key: "hospitalCount", label: "Hospitals / clinics" },
  { key: "religiousBuildingCount", label: "Religious buildings" },
  { key: "parkCount", label: "Parks" },
  { key: "greenSpaceCount", label: "Green space (all)" },
  { key: "parkingCount", label: "Parking" },
  { key: "publicTransportStopCount", label: "Transit stops" },
  { key: "commercialPoiCount", label: "Commercial POIs" },
  { key: "sportsFacilityCount", label: "Sports facilities" },
];

type Props = {
  metrics: SiteBufferMetrics | null;
};

export function SiteBufferMetricsPanel({ metrics }: Props) {
  if (!metrics) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Site buffer metrics</CardTitle>
          <CardDescription>Run analysis to compute OSM counts inside the study radius.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Site buffer metrics</CardTitle>
        <CardDescription>
          OpenStreetMap features within {metrics.studyRadiusMeters} m of the pin.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          {METRIC_ROWS.map(({ key, label }) => (
            <div key={key} className="flex justify-between gap-2 border-b border-border/50 py-1">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="font-mono font-medium tabular-nums">{metrics[key]}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}
