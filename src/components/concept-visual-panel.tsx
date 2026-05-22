"use client";

import { ImageIcon, Loader2, Map, RefreshCw } from "lucide-react";

import type { DesignConcept } from "@/lib/types/planning";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type ConceptOption = { id: string; title: string; hasImage: boolean };

type ConceptVisualPanelProps = {
  concept: DesignConcept | null;
  concepts: ConceptOption[];
  selectedConceptId: string | null;
  onSelectConcept: (id: string) => void;
  imageDataUrl: string | null;
  loading: boolean;
  error: string | null;
  onGenerateImage: () => void;
  onRegenerateImage: () => void;
  onBackToMap: () => void;
  canGenerate: boolean;
};

export function ConceptVisualPanel({
  concept,
  concepts,
  selectedConceptId,
  onSelectConcept,
  imageDataUrl,
  loading,
  error,
  onGenerateImage,
  onRegenerateImage,
  onBackToMap,
  canGenerate,
}: ConceptVisualPanelProps) {
  const toolbar = (
    <div className="flex flex-wrap items-center gap-2 border-b bg-card/95 px-3 py-2 backdrop-blur">
      <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={onBackToMap}>
        <Map className="size-3.5" aria-hidden />
        Map view
      </Button>
      {concepts.length > 1 ? (
        <select
          className="h-8 max-w-[14rem] rounded-md border border-input bg-background px-2 text-xs"
          value={selectedConceptId ?? ""}
          onChange={(e) => onSelectConcept(e.target.value)}
          aria-label="Select design proposal"
        >
          {concepts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
              {c.hasImage ? " ✓" : ""}
            </option>
          ))}
        </select>
      ) : null}
      {concept ? (
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="gap-1.5"
          disabled={!canGenerate || loading}
          onClick={imageDataUrl ? onRegenerateImage : onGenerateImage}
        >
          {loading ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
          ) : imageDataUrl ? (
            <RefreshCw className="size-3.5" aria-hidden />
          ) : (
            <ImageIcon className="size-3.5" aria-hidden />
          )}
          {loading ? "Generating…" : imageDataUrl ? "Regenerate" : "Generate image"}
        </Button>
      ) : null}
    </div>
  );

  if (!concept) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        {toolbar}
        <div className="flex flex-1 flex-col items-center justify-center gap-3 bg-muted/40 p-8 text-center">
          <ImageIcon className="size-10 text-muted-foreground" aria-hidden />
          <p className="max-w-md text-sm text-muted-foreground">
            Run site analysis and generate design concepts, then select a proposal to visualize.
          </p>
        </div>
      </div>
    );
  }

  if (loading && !imageDataUrl) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        {toolbar}
        <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-muted/50 p-8">
          <Loader2 className="size-12 animate-spin text-primary" aria-hidden />
          <div className="text-center">
            <p className="font-medium">Generating visualization</p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              OpenAI is rendering <span className="font-medium text-foreground">{concept.title}</span> in site
              context. This may take 30–90 seconds.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (imageDataUrl) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        {toolbar}
        <div className="relative min-h-0 flex-1 bg-black">
          {loading ? (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/50">
              <Loader2 className="size-10 animate-spin text-white" aria-hidden />
            </div>
          ) : null}
          {/* eslint-disable-next-line @next/next/no-img-element -- server-generated data URL */}
          <img
            src={imageDataUrl}
            alt={`Visualization: ${concept.title}`}
            className="absolute inset-0 size-full object-contain bg-black"
          />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-4 pt-12 text-white">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold">{concept.title}</h2>
              <Badge variant="secondary" className="border-white/20 bg-white/10 text-white">
                {concept.interventionType.replace(/_/g, " ")}
              </Badge>
            </div>
            <p className="mt-1 line-clamp-2 text-sm text-white/85">{concept.designConcept}</p>
          </div>
        </div>
        {error ? <p className="border-t bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {toolbar}
      <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-muted/30 p-8">
        <ImageIcon className="size-10 text-muted-foreground" aria-hidden />
        <div className="max-w-md text-center">
          <h2 className="text-lg font-medium">{concept.title}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{concept.designConcept}</p>
        </div>
        <Button
          type="button"
          size="lg"
          onClick={onGenerateImage}
          disabled={!canGenerate || loading}
          className="gap-2"
        >
          {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <ImageIcon className="size-4" aria-hidden />}
          Visualize proposal
        </Button>
        {error ? <p className="max-w-sm text-center text-sm text-destructive">{error}</p> : null}
        {!canGenerate ? (
          <p className="text-xs text-muted-foreground">Set OPENAI_API_KEY in .env.local (server only).</p>
        ) : null}
      </div>
    </div>
  );
}
