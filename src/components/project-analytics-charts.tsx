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

import type { PopulationPoint } from "@/lib/types/planning";

type Props = {
  indicators: Record<string, number | string>;
  populationByYear?: PopulationPoint[] | null;
};

export function ProjectAnalyticsCharts({ indicators, populationByYear }: Props) {
  const osmBar = [
    { name: "Buildings", value: num(indicators.osm_building_features_in_buffer) },
    { name: "Highways", value: num(indicators.osm_highway_features_in_buffer) },
    { name: "Park-like", value: num(indicators.osm_park_like_features_in_buffer) },
    { name: "Amenities", value: num(indicators.osm_amenity_nodes_in_buffer) },
  ];

  const popSorted = [...(populationByYear ?? [])].sort((a, b) => a.year - b.year);
  const hasPop = popSorted.length >= 2;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-lg border bg-card p-4">
        <h3 className="mb-1 text-sm font-medium">OSM feature counts (study buffer)</h3>
        <p className="mb-4 text-xs text-muted-foreground">Snapshot from OpenStreetMap tags — not official zoning.</p>
        <div className="h-[260px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={osmBar} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-4">
        <h3 className="mb-1 text-sm font-medium">Population trend (planner-supplied)</h3>
        <p className="mb-4 text-xs text-muted-foreground">
          {hasPop
            ? "Uses years you entered in planner context."
            : "Add at least two years under Population by year to plot a trend."}
        </p>
        <div className="h-[260px] w-full">
          {hasPop ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={popSorted} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="population" stroke="hsl(var(--primary))" strokeWidth={2} dot />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No time series yet</div>
          )}
        </div>
      </div>
    </div>
  );
}

function num(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}
