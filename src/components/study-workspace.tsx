"use client";

import { getClientEnv } from "@/env/client";
import { Loader2, MapPin, Search, Sparkles } from "lucide-react";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { SiteAnalysis } from "@/lib/types/planning";
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
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && onGeocode()}
                placeholder="Beirut, Hamra…"
              />
            </div>
            <div className="flex items-end gap-2">
              <Button type="button" variant="secondary" disabled={geocodeLoading} onClick={onGeocode}>
                {geocodeLoading ? <Loader2 className="animate-spin" /> : <Search className="size-4" />}
                Go
              </Button>
            </div>
          </div>
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

        <Tabs defaultValue="metrics" className="flex min-h-0 flex-1 flex-col px-4 pb-4 pt-2">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="metrics">Metrics</TabsTrigger>
            <TabsTrigger value="ai">AI</TabsTrigger>
            <TabsTrigger value="chat">Chat</TabsTrigger>
          </TabsList>

          <TabsContent value="metrics" className="mt-2 flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden">
            <ScrollArea className="h-[min(50vh,420px)] rounded-md border md:h-[calc(100dvh-320px)]">
              <div className="space-y-2 p-3">
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
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="ai" className="mt-2 flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden">
            <ScrollArea className="h-[min(50vh,420px)] rounded-md border md:h-[calc(100dvh-320px)]">
              <div className="space-y-4 p-3">
                {!analysis ? (
                  <p className="text-sm text-muted-foreground">
                    Structured insights use OpenAI with urban-planning instructions and confidence labels.
                  </p>
                ) : (
                  <>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">Planning brief</CardTitle>
                        <CardDescription>Executive summary — verify against local sources.</CardDescription>
                      </CardHeader>
                      <CardContent className="text-sm leading-relaxed">{analysis.planningBrief}</CardContent>
                    </Card>

                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Insights</h4>
                      {analysis.insights.map((ins, i) => (
                        <Card key={`${ins.title}-${i}`}>
                          <CardHeader className="pb-2">
                            <div className="flex items-start justify-between gap-2">
                              <CardTitle className="text-sm">{ins.title}</CardTitle>
                              <Badge variant={confidenceVariant(ins.confidence)}>{ins.confidence}</Badge>
                            </div>
                          </CardHeader>
                          <CardContent className="text-sm text-muted-foreground">{ins.body}</CardContent>
                        </Card>
                      ))}
                    </div>

                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Scenarios</h4>
                      {analysis.scenarios.map((sc, i) => (
                        <Card key={`${sc.name}-${i}`}>
                          <CardHeader className="pb-2">
                            <div className="flex items-start justify-between gap-2">
                              <CardTitle className="text-sm">{sc.name}</CardTitle>
                              <Badge variant={confidenceVariant(sc.confidence)}>{sc.confidence}</Badge>
                            </div>
                            <CardDescription>{sc.summary}</CardDescription>
                          </CardHeader>
                          <CardContent>
                            <ul className="list-inside list-disc text-sm text-muted-foreground">
                              {sc.tradeoffs.map((t) => (
                                <li key={t}>{t}</li>
                              ))}
                            </ul>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    <Separator />

                    <div>
                      <h4 className="mb-2 text-sm font-medium">Disclaimers</h4>
                      <ul className="list-inside list-disc space-y-1 text-xs text-muted-foreground">
                        {analysis.disclaimers.map((d) => (
                          <li key={d}>{d}</li>
                        ))}
                      </ul>
                    </div>
                  </>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="chat" className="mt-2 flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden">
            <ScrollArea className="mb-2 h-[min(28vh,240px)] rounded-md border md:h-[min(32vh,280px)]">
              <div className="space-y-3 p-3">
                {chatMessages.map((m, i) => (
                  <div
                    key={`${i}-${m.content.slice(0, 12)}`}
                    className={
                      m.role === "user"
                        ? "ml-4 rounded-lg bg-primary/10 p-2 text-sm"
                        : "mr-4 rounded-lg bg-muted p-2 text-sm"
                    }
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
            <div className="flex gap-2">
              <Input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask a planning question…"
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), onSendChat())}
              />
              <Button type="button" onClick={onSendChat} disabled={chatLoading}>
                Send
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </aside>
    </div>
  );
}
