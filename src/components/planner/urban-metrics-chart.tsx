"use client";

import type { UrbanIndicators } from "@/lib/types/analysis";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export function UrbanMetricsChart({ data }: { data: UrbanIndicators }) {
  const chartData = [
    { name: "Amenity", value: data.amenityRichness },
    { name: "Connect", value: data.connectivityProxy },
    { name: "Intensity", value: data.urbanIntensityProxy },
    { name: "Mixed-use", value: data.mixedUseProxy },
    { name: "Public space", value: data.publicSpaceAccessProxy },
    { name: "Env. stress", value: data.environmentalStressProxy },
  ];

  return (
    <div className="h-44 w-full text-xs">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
          <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-25} textAnchor="end" height={48} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} width={28} />
          <Tooltip
            contentStyle={{
              fontSize: 12,
              borderRadius: 8,
              border: "1px solid oklch(0.922 0 0)",
            }}
            formatter={(v) => [`${v ?? ""}`, "0–100 proxy"]}
          />
          <Bar dataKey="value" fill="oklch(0.371 0 0)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
      <p className="mt-1 text-[10px] text-muted-foreground">
        Proxies from OSM density and counts — not regulatory scores.
      </p>
    </div>
  );
}
