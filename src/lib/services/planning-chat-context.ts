import "server-only";

import { ASSISTANT_RESPONSE_STYLE } from "@/lib/planning/assistant-response-style";
import { planningContextToNotes } from "@/lib/planning/planning-context-notes";
import type { PlanningContext, SiteAnalysis } from "@/lib/types/planning";

export function buildPlanningChatSystemPrompt(context: {
  projectName: string;
  siteSummary?: string;
  planningContext?: PlanningContext | null;
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
  const pcNotes = planningContextToNotes(context.planningContext);
  if (pcNotes.length) {
    parts.push(`Planner-supplied context:\n${pcNotes.map((n) => `- ${n}`).join("\n")}`);
  }
  if (context.latestAnalysis) {
    const mod = context.latestAnalysis.modules;
    parts.push(
      `Latest structured analysis (JSON excerpt): ${JSON.stringify({
        insights: context.latestAnalysis.insights.slice(0, 8),
        scenarios: context.latestAnalysis.scenarios,
        planningBrief: context.latestAnalysis.planningBrief?.slice(0, 1200),
        modules: mod
          ? {
              landUse: mod.landUse.summary,
              trafficTransit: mod.trafficTransit.summary,
              greenSpace: mod.greenSpace.summary,
              budget: mod.budget.summary,
              risk: mod.risk.summary,
            }
          : undefined,
      })}`,
    );
  }
  parts.push(
    "Answer follow-ups about briefs, scenarios, module outputs, and risks using this context when relevant.",
  );
  parts.push(ASSISTANT_RESPONSE_STYLE);
  return parts.join("\n\n");
}
