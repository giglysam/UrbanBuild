"use client";

import { getClientEnv } from "@/env/client";
import { Loader2, MapPin, Search, Sparkles } from "lucide-react";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { FeatureCollection, Point } from "geojson";
import type { MapboxCommandPlan, MapboxContextBundle, SiteAnalysis } from "@/lib/types/planning";
import { GoogleMapsEmbed } from "@/components/google-maps-embed";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const UrbanMap = dynamic(
  () =>
    import("@/components/urban-map").then((mod) => ({
      default: mod.UrbanMap,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center bg-muted">
        <Loader2 className="size-8 animate-spin text-muted-foreground" aria-hidden />
      </div>
    ),
  },
);

const BEIRUT = { lat: 33.8938, lng: 35.5018 };

type CapabilityKind = "api" | "style" | "tooling" | "planning";
type CapabilityDef = {
  id: string;
  label: string;
  kind: CapabilityKind;
  description: string;
  docsUrl?: string;
  commandTemplate?: string;
};

const MAPBOX_CAPABILITIES: CapabilityDef[] = [
  { id: "directions", label: "Directions API", kind: "api", description: "Turn-by-turn routes and travel costs.", docsUrl: "https://docs.mapbox.com/playground/directions/", commandTemplate: "Show a walking route from center to destination." },
  { id: "map_matching", label: "Map Matching API", kind: "api", description: "Snap noisy GPS traces to roads.", docsUrl: "https://docs.mapbox.com/playground/map-matching/", commandTemplate: "Prepare map matching workflow and required trace inputs." },
  { id: "search_suggest", label: "Search Box Suggest", kind: "api", description: "Autocomplete suggestions for places.", docsUrl: "https://docs.mapbox.com/playground/search-box-api/", commandTemplate: "Use suggest endpoint and propose best place candidates." },
  { id: "search_retrieve", label: "Search Box Retrieve", kind: "api", description: "Retrieve selected place details.", docsUrl: "https://docs.mapbox.com/playground/search-box-api/", commandTemplate: "Retrieve selected suggestion and center map there." },
  { id: "standard_style", label: "Mapbox Standard Style", kind: "style", description: "Switch and tune style theme.", docsUrl: "https://docs.mapbox.com/playground/", commandTemplate: "Switch map style to streets and improve visual legibility." },
  { id: "static_images", label: "Static Images API", kind: "api", description: "Generate report-ready static PNG maps.", docsUrl: "https://docs.mapbox.com/playground/static-images-api/", commandTemplate: "Prepare static map export for project reporting." },
  { id: "geocoding", label: "Geocoding API", kind: "api", description: "Forward and reverse geocoding.", docsUrl: "https://docs.mapbox.com/playground/geocoding/", commandTemplate: "Reverse geocode current center and summarize named places." },
  { id: "isochrone", label: "Isochrone API", kind: "api", description: "Reachability polygons by travel time.", docsUrl: "https://docs.mapbox.com/playground/isochrone-api/", commandTemplate: "Show 10 and 20 minute walking isochrones around center." },
  { id: "matrix", label: "Matrix API", kind: "api", description: "Travel-time matrix between points.", docsUrl: "https://docs.mapbox.com/playground/matrix-api/", commandTemplate: "Compute walking matrix between center, destination, and top search hits." },
  { id: "tilequery", label: "Tilequery API", kind: "api", description: "Nearby vector-tile features and POIs.", docsUrl: "https://docs.mapbox.com/playground/tilequery-api/", commandTemplate: "Show nearby amenities and classify categories." },
  { id: "geocoding_v5", label: "Geocoding v5", kind: "api", description: "Legacy geocoding compatibility.", docsUrl: "https://docs.mapbox.com/playground/geocoding-v5-api/", commandTemplate: "Compare geocoding v5 result quality for this site." },
  { id: "ev_charge", label: "EV Charge Finder", kind: "planning", description: "EV charging station planning.", docsUrl: "https://docs.mapbox.com/playground/ev-charge-finder-api/", commandTemplate: "Plan EV charging coverage near the study center." },
  { id: "mapbox_console", label: "Mapbox Console", kind: "tooling", description: "Tokens, usage and project settings.", docsUrl: "https://console.mapbox.com", commandTemplate: "Explain token and usage strategy for production." },
  { id: "developer_playgrounds", label: "Developer Playgrounds", kind: "tooling", description: "API sandbox and option discovery.", docsUrl: "https://docs.mapbox.com/playground/", commandTemplate: "Recommend best playground checks for this project." },
];

function confidenceVariant(c: string): "default" | "secondary" | "outline" | "muted" {
  if (c === "observed") return "default";
  if (c === "inferred") return "secondary";
  return "outline";
}

export function StudyWorkspace() {
  const token = getClientEnv().NEXT_PUBLIC_MAPBOX_TOKEN ?? "";
  const [lat, setLat] = useState(BEIRUT.lat);
  const [lng, setLng] = useState(BEIRUT.lng);
  const [radiusM, setRadiusM] = useState(400);
  const [query, setQuery] = useState("Beirut");
  const [searchSuggestions, setSearchSuggestions] = useState<{ mapboxId: string; name: string; fullAddress: string }[]>([]);
  const [destinationQuery, setDestinationQuery] = useState("Martyrs' Square Beirut");
  const [destination, setDestination] = useState<{ lat: number; lng: number } | null>(null);
  const [geocodeLoading, setGeocodeLoading] = useState(false);

  const [metrics, setMetrics] = useState<Record<string, number | string> | null>(null);
  const [analysis, setAnalysis] = useState<SiteAnalysis | null>(null);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [analyzeLoading, setAnalyzeLoading] = useState(false);

  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<{ role: "user" | "assistant"; content: string }[]>(
    [
      {
        role: "assistant",
        content:
          "Ask about walkability, public space, mobility, or coastal risks for your study pin. I will not invent official zoning — cite local authorities for binding rules.",
      },
    ],
  );
  const [chatLoading, setChatLoading] = useState(false);

  const [mapView, setMapView] = useState<"mapbox" | "google">("mapbox");
  const [googleSatellite, setGoogleSatellite] = useState(true);
  const [mapboxStyleId, setMapboxStyleId] = useState<"streets-v12" | "light-v11" | "dark-v11" | "satellite-streets-v12">("light-v11");
  const [mapboxContext, setMapboxContext] = useState<MapboxContextBundle | null>(null);
  const [mapboxContextLoading, setMapboxContextLoading] = useState(false);
  const [mapboxCommand, setMapboxCommand] = useState("Show 10 and 20 minute walking isochrones and nearby amenities");
  const [mapboxCommandLoading, setMapboxCommandLoading] = useState(false);
  const [mapboxCommandPlan, setMapboxCommandPlan] = useState<MapboxCommandPlan | null>(null);
  const [matrixRows, setMatrixRows] = useState<{ from: number; to: number; durationS: number | null; distanceM: number | null }[] | null>(null);
  const [matrixPoints, setMatrixPoints] = useState<{ lat: number; lng: number }[]>([]);
  const [matrixLoading, setMatrixLoading] = useState(false);
  const [mapboxError, setMapboxError] = useState<string | null>(null);
  const [routeOverlay, setRouteOverlay] = useState<unknown | null>(null);
  const [isochroneOverlay, setIsochroneOverlay] = useState<unknown | null>(null);
  const [poiOverlay, setPoiOverlay] = useState<unknown | null>(null);
  const [enabledCapabilities, setEnabledCapabilities] = useState<Set<string>>(
    () => new Set(["geocoding", "directions", "isochrone", "tilequery", "matrix"]),
  );

  useEffect(() => {
    setMapView(token ? "mapbox" : "google");
  }, [token]);

  const setLocation = useCallback((nextLat: number, nextLng: number) => {
    setLat(nextLat);
    setLng(nextLng);
  }, []);

  const onGeocode = async () => {
    setGeocodeLoading(true);
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Geocode failed");
      setLat(data.lat);
      setLng(data.lng);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Geocode failed");
    } finally {
      setGeocodeLoading(false);
    }
  };

  const onSuggestSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setSearchSuggestions([]);
      return;
    }
    try {
      const res = await fetch(
        `/api/mapbox/search/suggest?q=${encodeURIComponent(q)}&lat=${lat}&lng=${lng}&limit=6`,
      );
      const data = (await res.json()) as {
        suggestions?: { mapboxId: string; name: string; fullAddress: string }[];
      };
      if (!res.ok) return;
      setSearchSuggestions(data.suggestions ?? []);
    } catch {
      /* ignore */
    }
  }, [lat, lng]);

  const onPickSuggestion = async (mapboxId: string, label: string) => {
    setQuery(label);
    setSearchSuggestions([]);
    setGeocodeLoading(true);
    try {
      const res = await fetch(`/api/mapbox/search/retrieve?mapboxId=${encodeURIComponent(mapboxId)}`);
      const data = (await res.json()) as { lat?: number; lng?: number; point?: { lat: number; lng: number }; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Retrieve failed");
      const point = data.point;
      if (point) {
        setLat(point.lat);
        setLng(point.lng);
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : "Retrieve failed");
    } finally {
      setGeocodeLoading(false);
    }
  };

  const onGeocodeDestination = async () => {
    setGeocodeLoading(true);
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(destinationQuery)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Destination geocode failed");
      setDestination({ lat: data.lat, lng: data.lng });
    } catch (e) {
      alert(e instanceof Error ? e.message : "Destination geocode failed");
    } finally {
      setGeocodeLoading(false);
    }
  };

  const onAnalyze = async () => {
    setAnalyzeLoading(true);
    setAnalyzeError(null);
    setMetrics(null);
    setAnalysis(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat, lng, radiusM }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Analysis failed");
      setMetrics(data.indicators);
      setAnalysis(data.analysis);
    } catch (e) {
      setAnalyzeError(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setAnalyzeLoading(false);
    }
  };

  const onSendChat = async () => {
    const trimmed = chatInput.trim();
    if (!trimmed) return;
    applyCapabilityControlsFromChat(trimmed);
    const next = [...chatMessages, { role: "user" as const, content: trimmed }];
    setChatMessages(next);
    setChatInput("");
    setChatLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      let data: { reply?: string; error?: string };
      try {
        data = (await res.json()) as { reply?: string; error?: string };
      } catch {
        throw new Error("Invalid response from server");
      }
      if (!res.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "Chat failed");
      }
      if (typeof data.reply !== "string") {
        throw new Error("Chat response missing reply");
      }
      setChatMessages([...next, { role: "assistant", content: data.reply }]);
    } catch (e) {
      setChatMessages([
        ...next,
        { role: "assistant", content: e instanceof Error ? e.message : "Chat failed" },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const metricEntries = useMemo(() => (metrics ? Object.entries(metrics) : []), [metrics]);
  const poiFeatureCollection = useMemo(() => {
    if (!Array.isArray(mapboxContext?.nearbyPois) || mapboxContext.nearbyPois.length === 0) return null;
    const geo: FeatureCollection<Point> = {
      type: "FeatureCollection",
      features: mapboxContext.nearbyPois.map((p) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [p.point.lng, p.point.lat] },
        properties: {
          name: p.name ?? "POI",
          category: p.category ?? "unknown",
          distanceM: p.distanceM ?? null,
        },
      })),
    };
    return geo;
  }, [mapboxContext]);
  const renderedPoiOverlay = poiOverlay ?? poiFeatureCollection;

  const onLoadMapboxContext = async () => {
    setMapboxContextLoading(true);
    setMapboxError(null);
    try {
      const res = await fetch("/api/mapbox/context", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          center: { lat, lng },
          radiusM,
          searchQuery: query,
          destination: destination ?? undefined,
          profile: "walking",
          contourMinutes: [10, 20],
        }),
      });
      const data = (await res.json()) as MapboxContextBundle & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to load Mapbox context");
      setMapboxContext(data);
      setRouteOverlay(data.routeToDestination?.geometry ?? null);
      setIsochroneOverlay(data.isochrone?.geometry ?? null);
      setPoiOverlay(null);
    } catch (e) {
      setMapboxError(e instanceof Error ? e.message : "Failed to load Mapbox context");
    } finally {
      setMapboxContextLoading(false);
    }
  };

  const onRunMapboxCommand = async () => {
    const command = mapboxCommand.trim();
    if (!command) return;
    setMapboxCommandLoading(true);
    setMapboxError(null);
    try {
      const res = await fetch("/api/mapbox/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          command,
          center: { lat, lng },
          radiusM,
          destination: destination ?? undefined,
          profile: "walking",
          mapContextText: [
            mapboxContext?.textualContext ?? "",
            `Enabled capabilities: ${[...enabledCapabilities].join(", ") || "none"}.`,
          ].join("\n"),
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        center?: { lat: number; lng: number };
        style?: "streets-v12" | "light-v11" | "dark-v11" | "satellite-streets-v12" | null;
        route?: { geometry?: unknown } | null;
        isochrone?: { geometry?: unknown } | null;
        pois?: unknown[];
        plan?: MapboxCommandPlan;
        context?: MapboxContextBundle;
      };
      if (!res.ok) throw new Error(data.error ?? "Map command failed");

      if (data.center) {
        setLat(data.center.lat);
        setLng(data.center.lng);
      }
      if (data.style) setMapboxStyleId(data.style);
      setRouteOverlay(data.route?.geometry ?? null);
      setIsochroneOverlay(data.isochrone?.geometry ?? null);
      if (Array.isArray(data.pois)) {
        const geo: FeatureCollection<Point> = {
          type: "FeatureCollection",
          features: data.pois
            .map((p) => {
              const point = (p as { point?: { lng?: number; lat?: number } }).point;
              if (typeof point?.lng !== "number" || typeof point?.lat !== "number") return null;
              return {
                type: "Feature" as const,
                geometry: { type: "Point" as const, coordinates: [point.lng, point.lat] },
                properties: p,
              };
            })
            .filter((f): f is FeatureCollection<Point>["features"][number] => Boolean(f)),
        };
        setPoiOverlay(geo);
      }
      if (data.plan) setMapboxCommandPlan(data.plan);
      if (data.context) setMapboxContext(data.context);
    } catch (e) {
      setMapboxError(e instanceof Error ? e.message : "Map command failed");
    } finally {
      setMapboxCommandLoading(false);
    }
  };

  const toggleCapability = (id: string) => {
    setEnabledCapabilities((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const runCapabilityTemplate = async (cap: CapabilityDef) => {
    if (!cap.commandTemplate) return;
    setMapboxCommand(cap.commandTemplate);
    await onRunMapboxCommand();
  };

  const applyCapabilityControlsFromChat = (text: string) => {
    const low = text.toLowerCase();
    for (const cap of MAPBOX_CAPABILITIES) {
      const byId = low.includes(cap.id.replace(/_/g, " "));
      const byLabel = low.includes(cap.label.toLowerCase());
      if (!(byId || byLabel)) continue;
      if (low.includes("enable") || low.includes("activate") || low.includes("turn on")) {
        setEnabledCapabilities((prev) => new Set(prev).add(cap.id));
      }
      if (low.includes("disable") || low.includes("deactivate") || low.includes("turn off")) {
        setEnabledCapabilities((prev) => {
          const next = new Set(prev);
          next.delete(cap.id);
          return next;
        });
      }
    }
  };

  const onRunMatrix = async () => {
    setMatrixLoading(true);
    try {
      const points = [{ lat, lng }];
      if (destination) points.push(destination);
      for (const s of mapboxContext?.searchResults ?? []) {
        if (points.length >= 6) break;
        points.push({ lat: s.point.lat, lng: s.point.lng });
      }
      if (points.length < 2) throw new Error("Need at least center + one destination/search result");
      const res = await fetch("/api/mapbox/matrix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile: "walking", points }),
      });
      const data = (await res.json()) as {
        error?: string;
        cells?: { from: number; to: number; durationS: number | null; distanceM: number | null }[];
      };
      if (!res.ok) throw new Error(data.error ?? "Matrix failed");
      setMatrixRows(data.cells ?? null);
      setMatrixPoints(points);
    } catch (e) {
      setMapboxError(e instanceof Error ? e.message : "Matrix failed");
    } finally {
      setMatrixLoading(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col bg-background md:flex-row">
      <div className="flex min-h-[42vh] w-full flex-col md:min-h-dvh md:flex-1">
        <Tabs value={mapView} onValueChange={(v) => setMapView(v as "mapbox" | "google")} className="flex flex-1 flex-col">
          <TabsList className="mx-3 mt-2 grid w-auto max-w-md shrink-0 grid-cols-2 self-center">
            <TabsTrigger value="mapbox" className="text-xs sm:text-sm">
              Mapbox
            </TabsTrigger>
            <TabsTrigger value="google" className="text-xs sm:text-sm">
              Google Maps
            </TabsTrigger>
          </TabsList>

          <TabsContent value="mapbox" className="relative m-0 mt-0 flex min-h-[38vh] flex-1 flex-col data-[state=inactive]:hidden">
            {!token ? (
              <div className="flex min-h-[38vh] flex-1 items-center justify-center bg-muted p-6 text-center text-sm text-muted-foreground">
                Set <code className="rounded bg-background px-1">NEXT_PUBLIC_MAPBOX_TOKEN</code> in{" "}
                <code className="rounded bg-background px-1">.env.local</code> for the interactive Mapbox map, or use the
                Google Maps tab.
              </div>
            ) : (
              <UrbanMap
                mapboxToken={token}
                latitude={lat}
                longitude={lng}
                mapStyleId={mapboxStyleId}
                routeGeojson={routeOverlay}
                isochroneGeojson={isochroneOverlay}
                poiGeojson={renderedPoiOverlay}
                onLocationChange={setLocation}
              />
            )}
            <div className="pointer-events-none absolute left-3 top-14 max-w-[min(100%-1.5rem,20rem)] rounded-lg border bg-card/95 p-3 text-xs shadow backdrop-blur pointer-events-auto md:top-3">
              <div className="flex items-center gap-2 font-medium text-foreground">
                <MapPin className="size-3.5 text-primary" aria-hidden />
                UrbanBuild — Beirut pilot
              </div>
              <p className="mt-1 text-muted-foreground">
                Click the map to move the study pin. Radius uses OSM features inside the buffer (not legal zoning).
              </p>
            </div>
          </TabsContent>

          <TabsContent value="google" className="m-0 mt-0 flex min-h-[38vh] flex-1 flex-col gap-2 p-3 pt-2 data-[state=inactive]:hidden">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">View</span>
              <Button
                type="button"
                size="sm"
                variant={googleSatellite ? "default" : "outline"}
                onClick={() => setGoogleSatellite(true)}
              >
                Satellite
              </Button>
              <Button
                type="button"
                size="sm"
                variant={!googleSatellite ? "default" : "outline"}
                onClick={() => setGoogleSatellite(false)}
              >
                Map
              </Button>
            </div>
            <div className="relative min-h-0 flex-1 overflow-hidden rounded-lg border bg-muted shadow-inner">
              <GoogleMapsEmbed
                key={`${lat.toFixed(5)}-${lng.toFixed(5)}-${googleSatellite}`}
                lat={lat}
                lng={lng}
                placeLabel={query}
                satellite={googleSatellite}
                className="absolute inset-0 h-full w-full min-h-[280px]"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Embedded Google Maps preview (no API key). Center updates when you search or change coordinates in the
              sidebar.
            </p>
          </TabsContent>
        </Tabs>
      </div>

      <aside className="flex w-full flex-col border-t bg-card md:h-dvh md:w-[min(100%,440px)] md:border-l md:border-t-0">
        <div className="border-b p-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="flex-1 space-y-1">
              <Label htmlFor="search">Search place</Label>
              <Input
                id="search"
                value={query}
                onChange={(e) => {
                  const v = e.target.value;
                  setQuery(v);
                  void onSuggestSearch(v);
                }}
                onKeyDown={(e) => e.key === "Enter" && onGeocode()}
                placeholder="Beirut, Hamra…"
              />
              {searchSuggestions.length ? (
                <div className="mt-1 max-h-36 overflow-y-auto rounded-md border bg-popover text-sm">
                  {searchSuggestions.map((s) => (
                    <button
                      key={s.mapboxId}
                      type="button"
                      className="block w-full border-b px-2 py-1.5 text-left last:border-b-0 hover:bg-accent"
                      onClick={() => void onPickSuggestion(s.mapboxId, s.fullAddress)}
                    >
                      <div className="font-medium">{s.name}</div>
                      <div className="text-xs text-muted-foreground">{s.fullAddress}</div>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="flex items-end gap-2">
              <Button type="button" variant="secondary" disabled={geocodeLoading} onClick={onGeocode}>
                {geocodeLoading ? <Loader2 className="animate-spin" /> : <Search className="size-4" />}
                Go
              </Button>
            </div>
          </div>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <div className="flex-1 space-y-1">
              <Label htmlFor="destination">Destination (for routing)</Label>
              <Input
                id="destination"
                value={destinationQuery}
                onChange={(e) => setDestinationQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && onGeocodeDestination()}
                placeholder="Martyrs' Square Beirut"
              />
            </div>
            <div className="flex items-end">
              <Button type="button" variant="outline" disabled={geocodeLoading} onClick={onGeocodeDestination}>
                Set destination
              </Button>
            </div>
          </div>
          {destination ? (
            <div className="mt-1 font-mono text-xs text-muted-foreground">
              destination: {destination.lat.toFixed(5)}, {destination.lng.toFixed(5)}
            </div>
          ) : null}
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Study radius</span>
              <span>{radiusM} m</span>
            </div>
            <Slider
              value={[radiusM]}
              min={100}
              max={1500}
              step={50}
              onValueChange={(v) => setRadiusM(v[0] ?? 400)}
            />
          </div>
          <div className="mt-2 font-mono text-xs text-muted-foreground">
            {lat.toFixed(5)}, {lng.toFixed(5)}
          </div>
          <Button className="mt-4 w-full" onClick={onAnalyze} disabled={analyzeLoading}>
            {analyzeLoading ? (
              <>
                <Loader2 className="animate-spin" />
                Running AI analysis…
              </>
            ) : (
              <>
                <Sparkles className="size-4" />
                Run AI analysis
              </>
            )}
          </Button>
          {analyzeError ? <p className="mt-2 text-sm text-destructive">{analyzeError}</p> : null}
        </div>

        <div className="flex min-h-0 flex-1 flex-col px-4 pb-4 pt-2">
          <div className="mb-2">
            <div className="mb-2 flex gap-2">
              <Button type="button" variant="outline" onClick={onLoadMapboxContext} disabled={mapboxContextLoading}>
                {mapboxContextLoading ? <Loader2 className="size-4 animate-spin" /> : null}
                Load Mapbox context
              </Button>
              <Button type="button" onClick={onRunMapboxCommand} disabled={mapboxCommandLoading} className="gap-2">
                {mapboxCommandLoading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                Run command
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={onRunMatrix} disabled={matrixLoading}>
                {matrixLoading ? <Loader2 className="size-3 animate-spin" /> : null}
                Run matrix
              </Button>
            </div>
            <Input
              value={mapboxCommand}
              onChange={(e) => setMapboxCommand(e.target.value)}
              placeholder="Tell AI what to show on the map (route, isochrone, POIs, style...)"
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), onRunMapboxCommand())}
            />
            {mapboxError ? <p className="mt-2 text-sm text-destructive">{mapboxError}</p> : null}
          </div>

          <ScrollArea className="mb-2 h-[min(28vh,240px)] rounded-md border md:h-[min(32vh,280px)]">
            <div className="space-y-3 p-3">
              {chatMessages.map((m, i) => (
                <div
                  key={`${i}-${m.content.slice(0, 12)}`}
                  className={m.role === "user" ? "ml-4 rounded-lg bg-primary/10 p-2 text-sm" : "mr-4 rounded-lg bg-muted p-2 text-sm"}
                >
                  {m.content}
                </div>
              ))}
              {chatLoading ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="size-3 animate-spin" /> Thinking…
                </div>
              ) : null}
            </div>
          </ScrollArea>
          <div className="mb-2 flex gap-2">
            <Input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Ask planning + map questions in one chat…"
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), onSendChat())}
            />
            <Button type="button" onClick={onSendChat} disabled={chatLoading}>
              Send
            </Button>
          </div>

          <ScrollArea className="h-[min(50vh,420px)] rounded-md border md:h-[calc(100dvh-400px)]">
            <div className="space-y-4 p-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Capabilities & documentation buttons</CardTitle>
                  <CardDescription>
                    Toggle capabilities, open docs, and run AI templates. Chat can also enable/disable by name.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-2 text-xs">
                    <Badge variant="outline">Enabled: {[...enabledCapabilities].length}</Badge>
                    <Badge variant="secondary">Total: {MAPBOX_CAPABILITIES.length}</Badge>
                  </div>
                  <div className="grid gap-2">
                    {MAPBOX_CAPABILITIES.map((cap) => {
                      const enabled = enabledCapabilities.has(cap.id);
                      return (
                        <div key={cap.id} className="rounded border p-2">
                          <div className="mb-1 flex items-start justify-between gap-2">
                            <div>
                              <div className="text-sm font-medium">{cap.label}</div>
                              <p className="text-xs text-muted-foreground">{cap.description}</p>
                            </div>
                            <Badge variant={enabled ? "default" : "outline"}>{enabled ? "enabled" : "disabled"}</Badge>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button type="button" size="sm" variant="outline" onClick={() => toggleCapability(cap.id)}>
                              {enabled ? "Disable" : "Enable"}
                            </Button>
                            {cap.commandTemplate ? (
                              <Button type="button" size="sm" onClick={() => void runCapabilityTemplate(cap)}>
                                Run
                              </Button>
                            ) : null}
                            {cap.docsUrl ? (
                              <Button asChild type="button" size="sm" variant="secondary">
                                <a href={cap.docsUrl} target="_blank" rel="noreferrer">
                                  Docs
                                </a>
                              </Button>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Metrics</CardTitle>
                  <CardDescription>Current OSM/map-derived indicators.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {metricEntries.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Run analysis to load OSM-derived indicators.</p>
                  ) : (
                    metricEntries.map(([k, v]) => (
                      <div key={k} className="flex justify-between gap-4 text-sm">
                        <span className="text-muted-foreground">{k.replace(/_/g, " ")}</span>
                        <span className="font-mono text-right text-foreground">{String(v)}</span>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">AI control plan</CardTitle>
                  <CardDescription>Actions interpreted from your command.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {!mapboxCommandPlan ? (
                    <p className="text-muted-foreground">Run a command to generate map actions.</p>
                  ) : (
                    <>
                      <p>{mapboxCommandPlan.summary}</p>
                      <ul className="list-inside list-disc text-muted-foreground">
                        {mapboxCommandPlan.actions.map((a, i) => (
                          <li key={`${a.type}-${i}`}>
                            {a.type}: {a.reason}
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Text context for AI decisions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-xs">
                  {mapboxContext ? (
                    <>
                      <pre className="overflow-x-auto whitespace-pre-wrap rounded bg-muted p-2 leading-relaxed">
                        {mapboxContext.textualContext}
                      </pre>
                      <p className="text-muted-foreground">Sources: {mapboxContext.sources.join(" | ")}</p>
                    </>
                  ) : (
                    <p className="text-muted-foreground">Load context to populate this section.</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Accessibility matrix</CardTitle>
                  <CardDescription>Travel time between center, destination, and top search hits.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-xs">
                  {!matrixRows ? (
                    <p className="text-muted-foreground">Run matrix to evaluate comparative accessibility.</p>
                  ) : (
                    <div className="max-h-48 overflow-auto rounded border">
                      <table className="w-full text-left">
                        <thead className="bg-muted/40">
                          <tr>
                            <th className="px-2 py-1">From</th>
                            <th className="px-2 py-1">To</th>
                            <th className="px-2 py-1">Minutes</th>
                            <th className="px-2 py-1">Km</th>
                          </tr>
                        </thead>
                        <tbody>
                          {matrixRows.map((r, i) => (
                            <tr key={`${r.from}-${r.to}-${i}`} className="border-t">
                              <td className="px-2 py-1">{r.from}</td>
                              <td className="px-2 py-1">{r.to}</td>
                              <td className="px-2 py-1">{r.durationS == null ? "-" : (r.durationS / 60).toFixed(1)}</td>
                              <td className="px-2 py-1">{r.distanceM == null ? "-" : (r.distanceM / 1000).toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {matrixPoints.length ? (
                    <p className="text-muted-foreground">Points in order: {matrixPoints.map((_, i) => i).join(", ")}</p>
                  ) : null}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Structured AI analysis</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!analysis ? (
                    <p className="text-sm text-muted-foreground">
                      Structured insights use OpenAI with urban-planning instructions and confidence labels.
                    </p>
                  ) : (
                    <>
                      <div className="text-sm leading-relaxed">{analysis.planningBrief}</div>
                      <Separator />
                      <div className="space-y-2">
                        {analysis.insights.map((ins, i) => (
                          <div key={`${ins.title}-${i}`} className="rounded border p-2 text-sm">
                            <div className="mb-1 flex items-center justify-between gap-2">
                              <span className="font-medium">{ins.title}</span>
                              <Badge variant={confidenceVariant(ins.confidence)}>{ins.confidence}</Badge>
                            </div>
                            <p className="text-muted-foreground">{ins.body}</p>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </ScrollArea>
        </div>
      </aside>
    </div>
  );
}
