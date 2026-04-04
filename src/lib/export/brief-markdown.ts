import type { FullAnalysis, PlanningBrief, SiteContext } from "@/lib/types/analysis";

function labeledSection(
  title: string,
  items: { text: string; evidence: string }[],
) {
  if (!items?.length) return "";
  const lines = items.map(
    (i) => `- (${i.evidence}) ${i.text}`,
  );
  return `## ${title}\n\n${lines.join("\n")}\n\n`;
}

export function planningBriefToMarkdown(
  ctx: SiteContext,
  brief: PlanningBrief,
  analysis?: FullAnalysis,
) {
  const parts: string[] = [];
  parts.push(`# Planning brief — UrbanBuild (Beirut MVP)\n`);
  parts.push(`**Generated:** ${new Date().toISOString()}\n`);
  parts.push(
    `**Site:** ${brief.site_identification}\n**Coordinates:** ${ctx.lat.toFixed(5)}, ${ctx.lng.toFixed(5)} · **Radius:** ${ctx.radiusM} m\n\n`,
  );
  parts.push(`## Context summary\n\n${brief.context_summary}\n\n`);
  if (brief.key_indicators?.length) {
    parts.push(
      `## Key indicators\n\n${brief.key_indicators.map((k) => `- ${k}`).join("\n")}\n\n`,
    );
  }
  parts.push(labeledSection("Main constraints", brief.main_constraints));
  parts.push(labeledSection("Main opportunities", brief.main_opportunities));
  parts.push(
    labeledSection("Strategic directions", brief.strategic_directions),
  );
  parts.push(
    labeledSection(
      "Recommended next studies",
      brief.recommended_next_studies,
    ),
  );
  parts.push(`## Disclaimer\n\n${brief.disclaimer}\n\n`);
  if (analysis) {
    parts.push(`---\n\n## Appendix: scenario titles\n\n`);
    for (const s of analysis.scenarios) {
      parts.push(`- **${s.title}** (${s.confidence})\n`);
    }
  }
  return parts.join("");
}
