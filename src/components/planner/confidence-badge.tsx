"use client";

import { Badge } from "@/components/ui/badge";
import type { EvidenceKind } from "@/lib/types/analysis";
import { cn } from "@/lib/utils";

const styles: Record<EvidenceKind, string> = {
  observed: "bg-emerald-950/10 text-emerald-900 border-emerald-900/20",
  inferred: "bg-amber-950/10 text-amber-900 border-amber-900/20",
  speculative: "bg-violet-950/10 text-violet-900 border-violet-900/20",
};

export function ConfidenceBadge({
  kind,
  className,
}: {
  kind: EvidenceKind | "high" | "medium" | "low";
  className?: string;
}) {
  const label =
    kind === "high" || kind === "medium" || kind === "low"
      ? `confidence: ${kind}`
      : kind;
  const variantClass =
    kind === "high" || kind === "medium" || kind === "low"
      ? "bg-muted text-muted-foreground border-border"
      : styles[kind as EvidenceKind];

  return (
    <Badge
      variant="outline"
      className={cn("text-[10px] font-medium uppercase tracking-wide", variantClass, className)}
    >
      {label}
    </Badge>
  );
}
