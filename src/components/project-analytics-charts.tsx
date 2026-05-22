"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { SiteBufferMetrics } from "@/lib/geo/site-buffer-metrics";
import { bufferMetricsFromIndicators } from "@/lib/geo/buffer-metrics-from-indicators";
import type { PopulationPoint } from "@/lib/types/planning";

type Props = {
  indicators: Record<string, number | string>;
  bufferMetrics?: SiteBufferMetrics | null;
  populationByYear?: PopulationPoint[] | null;
};

export function ProjectAnalyticsCharts({ indicators, bufferMetrics, populationByYear }: Props) {
  const bm = bufferMetrics ?? bufferMetricsFromIndicators(indicators);

  const osmBar = bm
    ? [
        { name: "Buildings", value: bm.buildingCount },
        { name: "Roads", value: bm.roadCount },
        { name: "Major roads", value: bm.majorRoadCount },
        { name: "Intersections", value: bm.intersectionCount },
        { name: "Schools", value: bm.schoolCount },
        { name: "Hospitals", value: bm.hospitalCount },
        { name: "Parks", value: bm.parkCount },
        { name: "Green space", value: bm.greenSpaceCount },
        { name: "Transit", value: bm.publicTransportStopCount },
        { name: "Commercial", value: bm.commercialPoiCount },
        { name: "Sports", value: bm.sportsFacilityCount },
      ]
    : [
        { name: "Buildings", value: num(indicators.buildingCount ?? indicators.osm_buildings_in_buffer) },
        { name: "Roads", value: num(indicators.roadCount ?? indicators.osm_roads_in_buffer) },
        { name: "Green", value: num(indicators.greenSpaceCount ?? indicators.osm_green_space_in_buffer) },
      ];

  const popSorted = [...(populationByYear ?? [])].sort((a, b) => a.year - b.year);
  const hasPop = popSorted.length >= 2;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-lg border bg-card p-4">
        <h3 className="mb-1 text-sm font-medium">OSM buffer metrics</h3>
        <p className="mb-4 text-xs text-muted-foreground">
          {bm ? `${bm.studyRadiusMeters} m study radius` : "Snapshot from OpenStreetMap — not official zoning."}
        </p>
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={osmBar} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-35} textAnchor="end" height={70} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {hasPop ? (
        <div className="rounded-lg border bg-card p-4">
          <h3 className="mb-1 text-sm font-medium">Population trend</h3>
          <p className="mb-4 text-xs text-muted-foreground">Planner-supplied context.</p>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={popSorted} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="population" stroke="hsl(var(--primary))" strokeWidth={2} dot />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function num(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}
