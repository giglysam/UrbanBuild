"use client";

import type { SiteQualitativeRatings } from "@/lib/types/site-feasibility";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const ROWS: { key: keyof SiteQualitativeRatings; label: string }[] = [
  { key: "builtDensity", label: "Built density" },
  { key: "mobilityAccess", label: "Mobility access" },
  { key: "residentialSensitivity", label: "Residential sensitivity" },
  { key: "parkingAvailability", label: "Parking availability" },
  { key: "greenSpaceAccess", label: "Green space access" },
];

function tierVariant(
  value: string,
): "default" | "secondary" | "outline" | "muted" {
  if (value === "high" || value === "strong") return "default";
  if (value === "medium" || value === "moderate") return "secondary";
  return "outline";
}

type Props = {
  ratings: SiteQualitativeRatings | null | undefined;
};

export function SiteQualitativeRatingsPanel({ ratings }: Props) {
  if (!ratings) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Site ratings</CardTitle>
          <CardDescription>Run analysis to derive density, mobility, and access tiers.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Site ratings</CardTitle>
        <CardDescription>Derived from OSM buffer metrics (400 m study area).</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {ROWS.map(({ key, label }) => (
            <li key={key} className="flex items-center justify-between gap-2 text-sm">
              <span className="text-muted-foreground">{label}</span>
              <Badge variant={tierVariant(ratings[key])} className="capitalize">
                {ratings[key]}
              </Badge>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
