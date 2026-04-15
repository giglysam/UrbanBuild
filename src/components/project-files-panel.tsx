"use client";

import { Trash2, Upload } from "lucide-react";
import { useEffect, useState } from "react";

import { getClientEnv } from "@/env/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";

type FileRow = {
  id: string;
  filename: string;
  mime_type: string | null;
  size_bytes: number | null;
  storage_path: string;
  created_at: string;
};

export function ProjectFilesPanel({ projectId }: { projectId: string }) {
  const [files, setFiles] = useState<FileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/files`);
      const data = (await res.json()) as { files?: FileRow[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to list");
      setFiles(data.files ?? []);
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

  async function onUpload(fileList: FileList | null) {
    if (!fileList?.[0]) return;
    const file = fileList[0];
    setUploading(true);
    setError(null);
    try {
      const env = getClientEnv();
      if (!env.NEXT_PUBLIC_SUPABASE_URL) {
        throw new Error("Supabase not configured");
      }
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");

      const id = crypto.randomUUID();
      const safeName = file.name.replace(/[^\w.\-]+/g, "_");
      const path = `${user.id}/${projectId}/${id}_${safeName}`;

      const { error: upErr } = await supabase.storage.from("project-files").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });
      if (upErr) throw new Error(upErr.message);

      const res = await fetch(`/api/projects/${projectId}/files`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storagePath: path,
          filename: file.name,
          mimeType: file.type || undefined,
          sizeBytes: file.size,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Register failed");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function remove(id: string) {
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/files/${id}`, { method: "DELETE" });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Delete failed");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Project files</CardTitle>
        <CardDescription>PDF, DOCX, images, and text. Stored in your private Supabase bucket.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="outline" className="relative gap-2" disabled={uploading} asChild>
            <label>
              <Upload className="size-4" aria-hidden />
              {uploading ? "Uploading…" : "Upload"}
              <input
                type="file"
                className="absolute inset-0 cursor-pointer opacity-0"
                onChange={(e) => void onUpload(e.target.files)}
              />
            </label>
          </Button>
          {error ? <span className="text-sm text-destructive">{error}</span> : null}
        </div>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {files.map((f) => (
              <li key={f.id} className="flex items-center justify-between gap-2 rounded-md border px-3 py-2">
                <div>
                  <div className="font-medium">{f.filename}</div>
                  <div className="text-xs text-muted-foreground">
                    {f.mime_type ?? "—"} · {f.size_bytes != null ? `${f.size_bytes} B` : "—"}
                  </div>
                </div>
                <Button type="button" size="icon" variant="ghost" onClick={() => void remove(f.id)} aria-label="Remove file">
                  <Trash2 className="size-4" />
                </Button>
              </li>
            ))}
            {!files.length ? <p className="text-muted-foreground">No files yet.</p> : null}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
