"use client";

import type { BeirutUrbanLabContext } from "@/lib/types/beirut-urban-lab";
import { BEIRUT_URBAN_LAB_EXPLORE_APP_URL } from "@/lib/types/beirut-urban-lab";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  context: BeirutUrbanLabContext | null | undefined;
};

export function BeirutUrbanLabPanel({ context }: Props) {
  if (!context) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Beirut Urban Lab data</CardTitle>
          <CardDescription>
            Surveyed built-environment layers from the{" "}
            <a
              href={BEIRUT_URBAN_LAB_EXPLORE_APP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline-offset-4 hover:underline"
            >
              open data platform
            </a>{" "}
            load when you run site analysis.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const { bbed, adminAtPin, icil } = context;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Beirut Urban Lab (BBED 2024)</CardTitle>
        <CardDescription>
          Official surveyed layers within {context.studyRadiusMeters} m —{" "}
          <a
            href={context.exploreAppUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline-offset-4 hover:underline"
          >
            explore on hub
          </a>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {(adminAtPin.kadaa || adminAtPin.mohafaza) && (
          <p className="text-muted-foreground">
            <span className="font-medium text-foreground">Admin: </span>
            {[adminAtPin.kadaa, adminAtPin.mohafaza].filter(Boolean).join(" · ")}
          </p>
        )}
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1">
          <Metric label="Surveyed buildings" value={bbed.buildings} />
          <Metric label="Gardens" value={bbed.gardens} />
          <Metric label="Parking / empty lots" value={bbed.parkingAndEmptyLots} />
          <Metric label="Commercial (ground floor)" value={bbed.commercialGroundFloor} />
          <Metric label="Solar rooftops" value={bbed.solarPanelRooftop} />
          <Metric label="Rivers (mapped)" value={bbed.rivers} />
          <Metric label="Landmarks" value={bbed.landmarks} />
        </dl>
        {icil?.buildingsPoly != null ? (
          <p className="text-xs text-muted-foreground">
            AUB ICIL building polygons in buffer: {icil.buildingsPoly}
            {icil.districtName ? ` · district ${icil.districtName}` : ""}
          </p>
        ) : null}
        {context.notes.length > 0 ? (
          <ul className="list-inside list-disc space-y-1 text-xs text-muted-foreground">
            {context.notes.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        ) : null}
      </CardContent>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-mono text-right font-medium tabular-nums">{value}</dd>
    </>
  );
}
