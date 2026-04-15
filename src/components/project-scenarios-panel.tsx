"use client";

import { GitCompare, Loader2, Star } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";

type ScenarioRow = {
  id: string;
  name: string;
  payload: Record<string, unknown>;
  is_preferred: boolean;
};

/** Matches `POST .../scenarios/compare` response `comparison` (persisted `scenario_comparisons` row). */
type SavedComparison = {
  id: string;
  scenario_a_id: string;
  scenario_b_id: string;
  result: Record<string, unknown>;
  created_at: string;
};

export function ProjectScenariosPanel({ projectId }: { projectId: string }) {
  const [scenarios, setScenarios] = useState<ScenarioRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [aId, setAId] = useState("");
  const [bId, setBId] = useState("");
  const [cmpLoading, setCmpLoading] = useState(false);
  const [compareResult, setCompareResult] = useState<SavedComparison | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/scenarios`);
      const data = (await res.json()) as { scenarios?: ScenarioRow[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to load");
      const list = data.scenarios ?? [];
      setScenarios(list);
      if (list[0]) setAId(list[0].id);
      if (list[1]) setBId(list[1].id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  async function compare() {
    if (!aId || !bId || aId === bId) return;
    setCmpLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/scenarios/compare`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenarioAId: aId, scenarioBId: bId }),
      });
      const data = (await res.json()) as { comparison?: SavedComparison; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Compare failed");
      setCompareResult(data.comparison ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Compare failed");
    } finally {
      setCmpLoading(false);
    }
  }

  async function prefer(id: string) {
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/scenarios/${id}/prefer`, { method: "POST" });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Scenarios</CardTitle>
          <CardDescription>Generated when you run analysis. Mark a preferred scenario for reporting.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <ul className="space-y-2">
              {scenarios.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm">
                  <span className="font-medium">
                    {s.name}
                    {s.is_preferred ? (
                      <span className="ml-2 text-amber-600 dark:text-amber-400">(preferred)</span>
                    ) : null}
                  </span>
                  <Button type="button" size="sm" variant="outline" className="gap-1" onClick={() => void prefer(s.id)}>
                    <Star className="size-3.5" aria-hidden />
                    Prefer
                  </Button>
                </li>
              ))}
              {!scenarios.length ? <p className="text-muted-foreground">Run analysis to populate scenarios.</p> : null}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Compare two scenarios</CardTitle>
          <CardDescription>Structured comparison across indicators (LLM-assisted).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Scenario A</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={aId}
                onChange={(e) => setAId(e.target.value)}
              >
                {scenarios.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Scenario B</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={bId}
                onChange={(e) => setBId(e.target.value)}
              >
                {scenarios.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <Button type="button" onClick={() => void compare()} disabled={cmpLoading || !aId || !bId || aId === bId} className="gap-2">
            {cmpLoading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <GitCompare className="size-4" aria-hidden />}
            Compare
          </Button>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {compareResult ? (
            <ScrollArea className="h-[280px] rounded-md border p-3">
              <p className="mb-2 text-xs text-muted-foreground">
                Saved comparison{" "}
                <span className="font-mono text-foreground">{compareResult.id}</span> ·{" "}
                {new Date(compareResult.created_at).toLocaleString()}
              </p>
              <pre className="whitespace-pre-wrap text-xs">{JSON.stringify(compareResult.result, null, 2)}</pre>
            </ScrollArea>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
