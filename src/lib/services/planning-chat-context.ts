import "server-only";

import type { SiteAnalysis } from "@/lib/types/planning";

export function buildPlanningChatSystemPrompt(context: {
  projectName: string;
  siteSummary?: string;
  latestAnalysis?: SiteAnalysis | null;
}): string {
  const parts = [
    "You are UrbanBuild's urban planning assistant. Be concise and professional.",
    "Never invent official zoning codes or binding regulations; recommend local authority sources.",
    `Project: ${context.projectName}.`,
  ];
  if (context.siteSummary) {
    parts.push(`Site context: ${context.siteSummary}`);
  }
  if (context.latestAnalysis) {
    parts.push(
      `Latest structured analysis (JSON excerpt): ${JSON.stringify({
        insights: context.latestAnalysis.insights.slice(0, 8),
        scenarios: context.latestAnalysis.scenarios,
        planningBrief: context.latestAnalysis.planningBrief?.slice(0, 1200),
      })}`,
    );
  }
  parts.push(
    "Answer follow-ups about briefs, scenarios, and risks using this context when relevant.",
  );
  return parts.join("\n\n");
}
