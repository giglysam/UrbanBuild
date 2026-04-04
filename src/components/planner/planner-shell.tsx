"use client";

import { BeirutMap, type LayerVisibility } from "@/components/planner/beirut-map";
import { ConfidenceBadge } from "@/components/planner/confidence-badge";
import { LabeledList } from "@/components/planner/labeled-list";
import { UrbanMetricsChart } from "@/components/planner/urban-metrics-chart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { BEIRUT_DEFAULT_VIEW, BEIRUT_SAMPLES } from "@/lib/data/beirut-samples";
import { planningBriefToMarkdown } from "@/lib/export/brief-markdown";
import type {
  FullAnalysis,
  LabeledText,
  PlanningBrief,
  SiteContext,
} from "@/lib/types/analysis";
import type { FeatureCollection } from "geojson";
import { Download, Loader2, MapPin, Search, Sparkles } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

type GeocodeHit = { lat: number; lng: number; displayName: string };

export function PlannerShell({ mapToken }: { mapToken: string | null }) {
  const [lat, setLat] = useState(BEIRUT_DEFAULT_VIEW.lat);
  const [lng, setLng] = useState(BEIRUT_DEFAULT_VIEW.lng);
  const [zoom] = useState(13.2);
  const [radiusM, setRadiusM] = useState(500);
  const [label, setLabel] = useState<string>("");
  const [siteNotes, setSiteNotes] = useState("");
  const [searchQ, setSearchQ] = useState("");
  const [searchHits, setSearchHits] = useState<GeocodeHit[]>([]);
  const [layers, setLayers] = useState<LayerVisibility>({
    roads: true,
    buildings: true,
    poi: true,
    green: true,
    coast: true,
    transit: true,
  });

  const [context, setContext] = useState<SiteContext | null>(null);
  const [geojson, setGeojson] = useState<FeatureCollection | null>(null);
  const [analysis, setAnalysis] = useState<FullAnalysis | null>(null);
  const [brief, setBrief] = useState<PlanningBrief | null>(null);
  const [briefOpen, setBriefOpen] = useState(false);

  const [ctxLoading, setCtxLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [briefLoading, setBriefLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [chatInput, setChatInput] = useState("");
  const [chatLog, setChatLog] = useState<
    { role: "user" | "assistant"; content: string; notes?: string[] }[]
  >([]);

  const fetchContext = useCallback(async () => {
    setCtxLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/context", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lat,
          lng,
          radiusM,
          label: label || undefined,
          siteNotes: siteNotes || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Context failed");
      setContext(data.context);
      setGeojson(data.geojson);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Context failed");
    } finally {
      setCtxLoading(false);
    }
  }, [lat, lng, radiusM, label, siteNotes]);

  const runAnalysis = useCallback(async () => {
    setAiLoading(true);
    setError(null);
    setAnalysis(null);
    setBrief(null);
    try {
      const res = await fetch("/api/analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lat,
          lng,
          radiusM,
          label: label || undefined,
          siteNotes: siteNotes || undefined,
        }),
      });
      const data = await res.json();
      if (res.status === 503) {
        setContext(data.context);
        setGeojson(data.geojson);
        setError(data.error ?? "AI unavailable");
        return;
      }
      if (!res.ok) throw new Error(data.error ?? "Analysis failed");
      setContext(data.context);
      setGeojson(data.geojson);
      setAnalysis(data.analysis);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setAiLoading(false);
    }
  }, [lat, lng, radiusM, label, siteNotes]);

  const runBrief = useCallback(async () => {
    if (!context || !analysis) return;
    setBriefLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context, analysis }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Brief failed");
      setBrief(data.brief);
      setBriefOpen(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Brief failed");
    } finally {
      setBriefLoading(false);
    }
  }, [context, analysis]);

  const search = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch(
        `/api/geocode?q=${encodeURIComponent(searchQ)}`,
      );
      const data = await res.json();
      setSearchHits(data.results ?? []);
    } catch {
      setSearchHits([]);
    }
  }, [searchQ]);

  const pickHit = (h: GeocodeHit) => {
    setLat(h.lat);
    setLng(h.lng);
    setLabel(h.displayName.split(",")[0]?.trim() ?? "");
    setSearchHits([]);
  };

  const sendChat = async () => {
    if (!context || !chatInput.trim()) return;
    const q = chatInput.trim();
    setChatInput("");
    setChatLog((c) => [...c, { role: "user", content: q }]);
    try {
      const prior = analysis?.site_summary;
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          context,
          question: q,
          priorSummary: prior,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Chat failed");
      setChatLog((c) => [
        ...c,
        {
          role: "assistant",
          content: data.answer,
          notes: data.evidence_notes,
        },
      ]);
    } catch (e) {
      setChatLog((c) => [
        ...c,
        {
          role: "assistant",
          content: e instanceof Error ? e.message : "Chat failed",
        },
      ]);
    }
  };

  const mdExport = useMemo(() => {
    if (!context || !brief) return "";
    return planningBriefToMarkdown(context, brief, analysis ?? undefined);
  }, [context, brief, analysis]);

  const downloadMd = () => {
    if (!mdExport) return;
    const blob = new Blob([mdExport], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `urbanbuild-brief-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleLayer = (k: keyof LayerVisibility) => {
    setLayers((L) => ({ ...L, [k]: !L[k] }));
  };

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-border px-4">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold tracking-tight">UrbanBuild</span>
            <Badge variant="secondary" className="font-normal">
              Beirut MVP
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!context || !analysis || briefLoading}
              onClick={runBrief}
            >
              {briefLoading ? (
                <Loader2 className="mr-1 size-3.5 animate-spin" />
              ) : (
                <Sparkles className="mr-1 size-3.5" />
              )}
              Planning brief
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={!mdExport}
              onClick={downloadMd}
            >
              <Download className="mr-1 size-3.5" />
              Export MD
            </Button>
          </div>
        </header>

        <div className="flex min-h-0 flex-1">
          <aside className="flex w-[300px] shrink-0 flex-col border-r border-border bg-card/40">
            <ScrollArea className="h-full">
              <div className="space-y-4 p-4">
                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Demo locations
                  </p>
                  <div className="flex flex-col gap-1.5">
                    {BEIRUT_SAMPLES.map((s) => (
                      <Button
                        key={s.id}
                        variant="outline"
                        size="sm"
                        className="h-auto justify-start py-2 text-left font-normal"
                        onClick={() => {
                          setLat(s.lat);
                          setLng(s.lng);
                          setRadiusM(s.defaultRadiusM);
                          setLabel(s.name);
                        }}
                      >
                        <span className="block text-xs font-medium">{s.name}</span>
                        <span className="block text-[10px] text-muted-foreground">
                          {s.description}
                        </span>
                      </Button>
                    ))}
                  </div>
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label className="text-xs">Search (address / place)</Label>
                  <div className="flex gap-1">
                    <Input
                      value={searchQ}
                      onChange={(e) => setSearchQ(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && search()}
                      placeholder="e.g. Hamra Street"
                      className="h-8 text-xs"
                    />
                    <Button size="icon" variant="secondary" className="h-8 w-8 shrink-0" onClick={search}>
                      <Search className="size-3.5" />
                    </Button>
                  </div>
                  {searchHits.length > 0 ? (
                    <ul className="max-h-36 space-y-1 overflow-auto rounded-md border border-border bg-background p-1 text-xs">
                      {searchHits.map((h, i) => (
                        <li key={i}>
                          <button
                            type="button"
                            className="w-full rounded px-2 py-1.5 text-left hover:bg-muted"
                            onClick={() => pickHit(h)}
                          >
                            {h.displayName}
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
                <Separator />
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <Label>Study radius</Label>
                    <span className="text-muted-foreground">{radiusM} m</span>
                  </div>
                  <Slider
                    value={[radiusM]}
                    min={200}
                    max={2000}
                    step={50}
                    onValueChange={(v) =>
                      setRadiusM(Array.isArray(v) ? (v[0] ?? 500) : v)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Site label</Label>
                  <Input
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder="Optional project label"
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Site notes</Label>
                  <Textarea
                    value={siteNotes}
                    onChange={(e) => setSiteNotes(e.target.value)}
                    placeholder="Constraints, program, heritage flags…"
                    rows={3}
                    className="text-xs"
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Map layers (OSM context)
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {(
                      [
                        ["roads", "Roads"],
                        ["buildings", "Buildings"],
                        ["poi", "POI"],
                        ["green", "Green"],
                        ["coast", "Coast"],
                        ["transit", "Transit"],
                      ] as const
                    ).map(([k, name]) => (
                      <Button
                        key={k}
                        size="sm"
                        variant={layers[k] ? "default" : "outline"}
                        className="h-7 text-[10px]"
                        onClick={() => toggleLayer(k)}
                      >
                        {name}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={ctxLoading}
                    onClick={fetchContext}
                  >
                    {ctxLoading ? (
                      <Loader2 className="mr-2 size-3.5 animate-spin" />
                    ) : (
                      <MapPin className="mr-2 size-3.5" />
                    )}
                    Refresh OSM context
                  </Button>
                  <Button size="sm" disabled={aiLoading} onClick={runAnalysis}>
                    {aiLoading ? (
                      <Loader2 className="mr-2 size-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="mr-2 size-3.5" />
                    )}
                    Run AI analysis
                  </Button>
                </div>
                {error ? (
                  <p className="rounded-md border border-destructive/30 bg-destructive/5 p-2 text-xs text-destructive">
                    {error}
                  </p>
                ) : null}
                <p className="text-[10px] leading-relaxed text-muted-foreground">
                  Coordinates: {lat.toFixed(5)}, {lng.toFixed(5)}. Click the map to drop the pin.
                </p>
              </div>
            </ScrollArea>
          </aside>

          <main className="relative min-w-0 flex-1">
            <BeirutMap
              token={mapToken}
              lat={lat}
              lng={lng}
              zoom={zoom}
              radiusM={radiusM}
              geojson={geojson}
              layers={layers}
              onSelectLngLat={(lo, la) => {
                setLng(lo);
                setLat(la);
              }}
            />
          </main>

          <aside className="flex w-[380px] shrink-0 flex-col border-l border-border bg-card/30">
            <ScrollArea className="h-full">
              <div className="space-y-4 p-4">
                {context ? (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Site indicators</CardTitle>
                      <CardDescription className="text-xs">
                        OSM-derived proxies within {context.radiusM} m
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 text-xs">
                      <div className="grid grid-cols-2 gap-2">
                        <Metric label="Buildings" value={context.indicators.buildingCount} />
                        <Metric label="Road length" value={`${(context.indicators.roadLengthM / 1000).toFixed(2)} km`} />
                        <Metric label="Schools" value={context.indicators.schoolCount} />
                        <Metric label="Health" value={context.indicators.hospitalCount} />
                        <Metric label="Parks / leisure" value={context.indicators.parkLeisureCount} />
                        <Metric label="Transit nodes" value={context.indicators.transitStopCount} />
                        <Metric
                          label="Coast distance"
                          value={
                            context.indicators.coastlineDistanceM != null
                              ? `${context.indicators.coastlineDistanceM} m`
                              : "n/a"
                          }
                        />
                        <Metric label="Intersections (proxy)" value={context.indicators.intersectionProxy} />
                      </div>
                      <UrbanMetricsChart data={context.indicators} />
                      <ul className="space-y-1 text-[10px] text-muted-foreground">
                        {context.indicators.dataNotes.map((n, i) => (
                          <li key={i}>• {n}</li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">No context yet</CardTitle>
                      <CardDescription className="text-xs">
                        Choose a location and run &quot;Refresh OSM context&quot; or &quot;Run AI analysis&quot;.
                      </CardDescription>
                    </CardHeader>
                  </Card>
                )}

                <Tabs defaultValue="analysis">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="analysis" className="text-xs">
                      Analysis
                    </TabsTrigger>
                    <TabsTrigger value="scenarios" className="text-xs">
                      Scenarios
                    </TabsTrigger>
                    <TabsTrigger value="chat" className="text-xs">
                      Chat
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="analysis" className="mt-3 space-y-3">
                    {analysis ? (
                      <>
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Site summary</CardTitle>
                          </CardHeader>
                          <CardContent className="text-sm leading-relaxed text-foreground/90">
                            {analysis.site_summary}
                          </CardContent>
                        </Card>
                        <Section title="Urban grain / block pattern" items={analysis.urban_grain} />
                        <Section title="Accessibility / connectivity" items={analysis.accessibility_connectivity} />
                        <Section title="Nearby amenities" items={analysis.nearby_amenities} />
                        <Section title="Walkability proxy" items={analysis.walkability_proxy} />
                        <Section title="Land-use guess" items={analysis.land_use_guess} />
                        <Section title="Environmental exposure" items={analysis.environmental_exposure} />
                        <Section title="Opportunities" items={analysis.opportunities} />
                        <Section title="Risks" items={analysis.risks} />
                        <Section title="Recommendations" items={analysis.recommendations} />
                        <Section title="What to investigate next" items={analysis.next_studies} />
                      </>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Run AI analysis to populate structured insights. Without an API key, use Refresh OSM context for metrics only.
                      </p>
                    )}
                  </TabsContent>
                  <TabsContent value="scenarios" className="mt-3 space-y-3">
                    {analysis?.scenarios?.length ? (
                      analysis.scenarios.map((s, i) => (
                        <Card key={i}>
                          <CardHeader className="pb-2">
                            <div className="flex items-start justify-between gap-2">
                              <CardTitle className="text-sm">{s.title}</CardTitle>
                              <ConfidenceBadge kind={s.confidence} />
                            </div>
                            <CardDescription className="text-xs leading-relaxed">
                              {s.rationale}
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-2 text-xs">
                            <div>
                              <p className="mb-1 font-medium text-muted-foreground">Interventions</p>
                              <ul className="list-inside list-disc space-y-0.5">
                                {s.interventions.map((x, j) => (
                                  <li key={j}>{x}</li>
                                ))}
                              </ul>
                            </div>
                            <div>
                              <p className="mb-1 font-medium text-muted-foreground">Tradeoffs</p>
                              <ul className="list-inside list-disc space-y-0.5">
                                {s.tradeoffs.map((x, j) => (
                                  <li key={j}>{x}</li>
                                ))}
                              </ul>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Scenarios appear after AI analysis.
                      </p>
                    )}
                  </TabsContent>
                  <TabsContent value="chat" className="mt-3 space-y-2">
                    <div className="rounded-md border border-border bg-background p-2">
                      <div className="max-h-52 space-y-2 overflow-auto text-xs">
                        {chatLog.length === 0 ? (
                          <p className="text-muted-foreground">
                            Ask planning questions grounded in the current site context.
                          </p>
                        ) : (
                          chatLog.map((m, i) => (
                            <div
                              key={i}
                              className={
                                m.role === "user"
                                  ? "ml-4 rounded-md bg-muted/80 p-2"
                                  : "mr-4 rounded-md border border-border p-2"
                              }
                            >
                              <p className="whitespace-pre-wrap">{m.content}</p>
                              {m.notes?.length ? (
                                <ul className="mt-1 space-y-0.5 text-[10px] text-muted-foreground">
                                  {m.notes.map((n, j) => (
                                    <li key={j}>• {n}</li>
                                  ))}
                                </ul>
                              ) : null}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                    <Textarea
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="e.g. What mobility issues should we anticipate?"
                      rows={2}
                      className="text-xs"
                      disabled={!context}
                    />
                    <Button size="sm" disabled={!context} onClick={sendChat}>
                      Send
                    </Button>
                  </TabsContent>
                </Tabs>
              </div>
            </ScrollArea>
          </aside>
        </div>

        <Dialog open={briefOpen} onOpenChange={setBriefOpen}>
          <DialogContent className="max-h-[85vh] max-w-lg overflow-hidden sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Planning brief</DialogTitle>
            </DialogHeader>
            {brief ? (
              <ScrollArea className="max-h-[65vh] pr-3">
                <div className="space-y-3 text-sm">
                  <p className="font-medium">{brief.site_identification}</p>
                  <p className="text-muted-foreground">{brief.context_summary}</p>
                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide">Key indicators</p>
                    <ul className="list-inside list-disc text-xs">
                      {brief.key_indicators.map((k, i) => (
                        <li key={i}>{k}</li>
                      ))}
                    </ul>
                  </div>
                  <BriefBlock title="Constraints" items={brief.main_constraints} />
                  <BriefBlock title="Opportunities" items={brief.main_opportunities} />
                  <BriefBlock title="Strategic directions" items={brief.strategic_directions} />
                  <BriefBlock title="Next studies" items={brief.recommended_next_studies} />
                  <p className="text-xs text-muted-foreground">{brief.disclaimer}</p>
                </div>
              </ScrollArea>
            ) : null}
            <Button size="sm" variant="secondary" disabled={!mdExport} onClick={downloadMd}>
              Download markdown
            </Button>
          </DialogContent>
        </Dialog>
      </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border border-border/60 bg-muted/20 px-2 py-1.5">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="font-medium tabular-nums">{value}</p>
    </div>
  );
}

function Section({
  title,
  items,
}: {
  title: string;
  items: LabeledText[];
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <LabeledList items={items} />
      </CardContent>
    </Card>
  );
}

function BriefBlock({
  title,
  items,
}: {
  title: string;
  items: LabeledText[];
}) {
  return (
    <div>
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide">{title}</p>
      <LabeledList items={items} />
    </div>
  );
}
