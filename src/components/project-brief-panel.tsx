"use client";

import { FileText, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

type BriefRow = { id: string; version: number; content: string; created_at: string };

export function ProjectBriefPanel({ projectId }: { projectId: string }) {
  const [loading, setLoading] = useState(false);
  const [genLoading, setGenLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [briefs, setBriefs] = useState<BriefRow[]>([]);
  const [selected, setSelected] = useState<BriefRow | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/planning-brief`);
      const data = (await res.json()) as { briefs?: BriefRow[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to load");
      setBriefs(data.briefs ?? []);
      if (data.briefs?.[0]) setSelected(data.briefs[0]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload when project changes
  }, [projectId]);

  async function generate() {
    setGenLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/planning-brief`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = (await res.json()) as { brief?: BriefRow; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Generation failed");
      await load();
      if (data.brief) {
        setSelected({
          id: data.brief.id,
          version: data.brief.version,
          content: data.brief.content,
          created_at: data.brief.created_at,
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setGenLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Planning brief</CardTitle>
          <CardDescription>Generate a versioned brief from your latest completed analysis.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button type="button" onClick={() => void generate()} disabled={genLoading || loading} className="gap-2">
            {genLoading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <FileText className="size-4" aria-hidden />}
            Generate new version
          </Button>
          {selected ? (
            <Button type="button" variant="outline" asChild>
              <a href={`/api/projects/${projectId}/reports/planning-brief?version=${selected.version}`} target="_blank" rel="noreferrer">
                Download PDF
              </a>
            </Button>
          ) : null}
          {error ? <span className="text-sm text-destructive">{error}</span> : null}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[14rem_1fr]">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-sm">Versions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {briefs.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => setSelected(b)}
                className={`block w-full rounded-md px-2 py-1.5 text-left ${selected?.id === b.id ? "bg-primary/10 font-medium text-primary" : "hover:bg-muted"}`}
              >
                v{b.version}{" "}
                <span className="text-muted-foreground">{new Date(b.created_at).toLocaleDateString()}</span>
              </button>
            ))}
            {!briefs.length && !loading ? <p className="text-muted-foreground">No briefs yet.</p> : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Content</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[min(60vh,520px)] pr-4">
              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{selected?.content ?? "—"}</pre>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
