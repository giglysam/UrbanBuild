"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import type { PlannerUserProfile } from "@/lib/types/user-profile";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

export function UserPreferencesForm() {
  const [profile, setProfile] = useState<PlannerUserProfile | null>(null);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/user/profile");
        const data = (await res.json()) as { profile?: PlannerUserProfile | null; error?: string };
        if (!res.ok) throw new Error(data.error ?? "Failed to load");
        setProfile(data.profile ?? null);
        setNotes(data.profile?.notesFromUser?.join("\n") ?? "");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function save() {
    setSaving(true);
    setMessage(null);
    setError(null);
    const noteLines = notes
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plannerProfile: {
            notesFromUser: noteLines.length ? noteLines : undefined,
          },
        }),
      });
      const data = (await res.json()) as { profile?: PlannerUserProfile; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      setProfile(data.profile ?? null);
      setMessage("Preferences saved. The assistant will use these across all projects.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" aria-hidden />
        Loading…
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Your planning profile</CardTitle>
        <CardDescription>
          UrbanBuild learns from project chats (materials, scale, styles you mention). Add notes here anytime — they
          apply to every project conversation.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {profile?.summary ? (
          <div className="rounded-md border bg-muted/40 p-3 text-sm">
            <p className="text-xs font-medium text-muted-foreground">Learned summary</p>
            <p className="mt-1">{profile.summary}</p>
          </div>
        ) : null}
        {(profile?.designTastes?.length ?? 0) > 0 ? (
          <ProfileList label="Design tastes" items={profile!.designTastes!} />
        ) : null}
        {(profile?.materialPreferences?.length ?? 0) > 0 ? (
          <ProfileList label="Materials" items={profile!.materialPreferences!} />
        ) : null}
        {(profile?.avoidances?.length ?? 0) > 0 ? (
          <ProfileList label="Avoid" items={profile!.avoidances!} />
        ) : null}
        <div className="space-y-2">
          <Label htmlFor="user-notes">Your notes (one per line)</Label>
          <textarea
            id="user-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={5}
            className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            placeholder="e.g. Prefer low-rise massing, timber and stone, shaded public plazas"
          />
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
        <Button type="button" onClick={() => void save()} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
          Save preferences
        </Button>
      </CardContent>
    </Card>
  );
}

function ProfileList({ label, items }: { label: string; items: string[] }) {
  return (
    <div className="text-sm">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1">{items.join(" · ")}</p>
    </div>
  );
}
