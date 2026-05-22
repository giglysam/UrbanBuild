"use client";

import { Loader2, Save, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import type { DesignConceptsBundle, PlanningNarrative } from "@/lib/types/planning";
import type { StructuredSiteAnalysis } from "@/lib/types/site-feasibility";
import type { DemoChatMessage } from "@/lib/demo/demo-chat-storage";
import { SupabaseFeatureFallback } from "@/components/supabase-setup-notice";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isSupabaseConfigured } from "@/lib/supabase/client";

type SaveWorkspaceButtonProps = {
  isLoggedIn: boolean;
  site: { label: string; centerLat: number; centerLng: number; radiusM: number };
  indicators: Record<string, number | string> | null;
  siteAnalysis: StructuredSiteAnalysis | null;
  planningNarrative: PlanningNarrative | null;
  designBundle: DesignConceptsBundle | null;
  chatMessages: DemoChatMessage[];
};

export function SaveWorkspaceButton({
  isLoggedIn,
  site,
  indicators,
  siteAnalysis,
  planningNarrative,
  designBundle,
  chatMessages,
}: SaveWorkspaceButtonProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(site.label || "My study");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedProjectId, setSavedProjectId] = useState<string | null>(null);

  async function save() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/projects/save-workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmed,
          site: {
            label: site.label,
            centerLat: site.centerLat,
            centerLng: site.centerLng,
            radiusM: site.radiusM,
          },
          indicators: indicators ?? undefined,
          siteAnalysis: siteAnalysis ?? undefined,
          analysis: planningNarrative ?? undefined,
          designBundle: designBundle ?? undefined,
          chatMessages: chatMessages.filter((m) => m.role === "user" || m.role === "assistant"),
        }),
      });
      const data = (await res.json()) as { projectId?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      setSavedProjectId(data.projectId ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (!isSupabaseConfigured()) {
    return <SupabaseFeatureFallback compact />;
  }

  if (!isLoggedIn) {
    return (
      <Button asChild variant="outline" size="sm" className="gap-1.5">
        <Link href="/login?next=/demo">
          <Save className="size-3.5" aria-hidden />
          Sign in to save project
        </Link>
      </Button>
    );
  }

  return (
    <div className="relative">
      <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => setOpen((o) => !o)}>
        <Save className="size-3.5" aria-hidden />
        Save project
      </Button>
      {open ? (
        <Card className="absolute right-0 top-full z-50 mt-2 w-[min(100vw-2rem,20rem)] shadow-lg">
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <CardTitle className="text-sm">Save workspace</CardTitle>
                <CardDescription className="text-xs">
                  Site, analysis, concepts, and chat history.
                </CardDescription>
              </div>
              <Button type="button" variant="ghost" size="icon" className="size-7 shrink-0" onClick={() => setOpen(false)}>
                <X className="size-4" aria-hidden />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {savedProjectId ? (
              <Button asChild size="sm" className="w-full">
                <Link href={`/projects/${savedProjectId}/chat`}>Open saved project</Link>
              </Button>
            ) : (
              <>
                <div className="space-y-1">
                  <Label htmlFor="project-name" className="text-xs">
                    Project name
                  </Label>
                  <Input id="project-name" value={name} onChange={(e) => setName(e.target.value)} className="h-8" />
                </div>
                {error ? <p className="text-xs text-destructive">{error}</p> : null}
                <Button type="button" size="sm" className="w-full gap-2" onClick={() => void save()} disabled={saving}>
                  {saving ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : null}
                  Save
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
