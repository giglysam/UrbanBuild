"use client";

import { ConfidenceBadge } from "@/components/planner/confidence-badge";
import type { LabeledText } from "@/lib/types/analysis";

export function LabeledList({ items }: { items: LabeledText[] }) {
  if (!items?.length) return null;
  return (
    <ul className="space-y-2 text-sm leading-relaxed text-foreground/90">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2">
          <span className="mt-0.5 shrink-0">
            <ConfidenceBadge kind={item.evidence} />
          </span>
          <span>{item.text}</span>
        </li>
      ))}
    </ul>
  );
}
