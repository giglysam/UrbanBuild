"use client";

import MapboxDraw from "@mapbox/mapbox-gl-draw";
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";
import { Loader2, Save } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import Map, { Marker, NavigationControl, type MapRef } from "react-map-gl/mapbox";
import type { FeatureCollection, Polygon } from "geojson";

import { getClientEnv } from "@/env/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

type Props = {
  projectId: string;
  initial: {
    center_lat: number | null;
    center_lng: number | null;
    radius_m: number | null;
    label: string | null;
    boundary_geojson: unknown | null;
  };
};

export function ProjectSiteEditor({ projectId, initial }: Props) {
  const token = getClientEnv().NEXT_PUBLIC_MAPBOX_TOKEN ?? "";
  const mapRef = useRef<MapRef>(null);
  const drawRef = useRef<MapboxDraw | null>(null);

  const [lat, setLat] = useState(initial.center_lat ?? 33.8938);
  const [lng, setLng] = useState(initial.center_lng ?? 35.5018);
  const [radiusM, setRadiusM] = useState(initial.radius_m ?? 400);
  const [label, setLabel] = useState(initial.label ?? "Study area");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onMapLoad = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map || drawRef.current) return;
    const draw = new MapboxDraw({
      displayControlsDefault: false,
      controls: { polygon: true, trash: true },
    });
    map.addControl(draw, "top-left");
    drawRef.current = draw;

    if (initial.boundary_geojson && typeof initial.boundary_geojson === "object") {
      try {
        draw.add(initial.boundary_geojson as GeoJSON.Feature | GeoJSON.FeatureCollection);
      } catch {
        /* ignore */
      }
    }
  }, [initial.boundary_geojson]);

  async function save() {
    setSaving(true);
    setError(null);
    setMessage(null);
    let boundary: Polygon | null = null;
    const draw = drawRef.current;
    const map = mapRef.current?.getMap();
    if (draw && map) {
      const fc = draw.getAll() as FeatureCollection;
      const poly = fc.features.find((f) => f.geometry?.type === "Polygon" || f.geometry?.type === "MultiPolygon");
      if (poly?.geometry && poly.geometry.type === "Polygon") {
        boundary = poly.geometry as Polygon;
      }
    }

    try {
      const res = await fetch(`/api/projects/${projectId}/site`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label,
          centerLat: lat,
          centerLng: lng,
          radiusM,
          boundaryGeojson: boundary
            ? ({ type: "Feature", properties: {}, geometry: boundary } satisfies GeoJSON.Feature<Polygon>)
            : null,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      setMessage("Site saved.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (!token) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Map disabled</CardTitle>
          <CardDescription>Set NEXT_PUBLIC_MAPBOX_TOKEN to edit the map.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
      <div className="relative h-[min(70vh,560px)] min-h-[320px] overflow-hidden rounded-lg border">
        <Map
          ref={mapRef}
          mapboxAccessToken={token}
          mapStyle="mapbox://styles/mapbox/light-v11"
          initialViewState={{ longitude: lng, latitude: lat, zoom: 13 }}
          style={{ width: "100%", height: "100%" }}
          onLoad={onMapLoad}
          onClick={(e) => {
            const { lat: la, lng: ln } = e.lngLat;
            setLat(la);
            setLng(ln);
          }}
        >
          <NavigationControl position="top-right" />
          <Marker longitude={lng} latitude={lat} anchor="center" color="#1d4ed8" />
        </Map>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Study area</CardTitle>
          <CardDescription>
            Click the map to move the center pin. Draw a polygon for the study boundary (optional). Set buffer radius
            for OSM analysis.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="label">Label</Label>
            <Input id="label" value={label} onChange={(e) => setLabel(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Radius (m): {radiusM}</Label>
            <Slider value={[radiusM]} min={50} max={2000} step={10} onValueChange={(v) => setRadiusM(v[0] ?? 400)} />
          </div>
          <div className="text-xs text-muted-foreground">
            Center: {lat.toFixed(5)}, {lng.toFixed(5)}
          </div>
          <Button type="button" onClick={() => void save()} disabled={saving} className="w-full gap-2">
            {saving ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Save className="size-4" aria-hidden />}
            Save site
          </Button>
          {message ? <p className="text-sm text-green-600 dark:text-green-400">{message}</p> : null}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </CardContent>
      </Card>
    </div>
  );
}
