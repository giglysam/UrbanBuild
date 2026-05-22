import "server-only";

import {
  ASSISTANT_ANTI_LEAK_RULE,
  CHAT_RESPONSE_SECTIONS,
  INTERNAL_CHAT_RULES,
} from "@/lib/planning/chat-site-answer-rules";
import {
  IMMEDIATE_COORDINATES_PROJECT_RULES,
  PRODUCT_IDENTITY,
} from "@/lib/planning/pre-project-readiness";
import {
  formatPlanningChatSiteContext,
  type PlanningChatSiteContext,
} from "@/lib/planning/planning-chat-site-context";
import { planningContextToNotes } from "@/lib/planning/planning-context-notes";
import type { PlanningContext, PlanningNarrative } from "@/lib/types/planning";
import type { StructuredSiteAnalysis } from "@/lib/types/site-feasibility";
import type { PlannerUserProfile } from "@/lib/types/user-profile";
import { formatPlannerProfileForPrompt } from "@/lib/planning/planner-profile-merge";

function buildChatSystemCore(siteBlock?: string): string {
  const parts = [
    PRODUCT_IDENTITY,
    ASSISTANT_ANTI_LEAK_RULE,
    INTERNAL_CHAT_RULES,
    IMMEDIATE_COORDINATES_PROJECT_RULES,
    CHAT_RESPONSE_SECTIONS,
  ];
  if (siteBlock) parts.push(siteBlock);
  return parts.join("\n\n");
}

/** System prompt for demo / stateless chat (no project DB). */
export function buildStatelessPlanningChatSystemPrompt(opts?: {
  placeLabel?: string;
  siteContext?: PlanningChatSiteContext | null;
}): string {
  if (opts?.siteContext) {
    return buildChatSystemCore(formatPlanningChatSiteContext(opts.siteContext));
  }
  const place = opts?.placeLabel?.trim();
  if (place) {
    return buildChatSystemCore(`Place label only: ${place}. Ask for coordinates if the user requests feasibility without a pin.`);
  }
  return buildChatSystemCore(
    "No site metrics attached. If the user gives coordinates and a project in their message, use the provided site data block when present.",
  );
}

export function buildPlanningChatSystemPrompt(context: {
  projectName: string;
  siteSummary?: string;
  siteLat?: number;
  siteLng?: number;
  siteRadiusM?: number;
  placeLabel?: string;
  projectType?: PlanningChatSiteContext["projectType"];
  customProjectDescription?: string;
  planningContext?: PlanningContext | null;
  siteAnalysis?: StructuredSiteAnalysis | null;
  latestAnalysis?: PlanningNarrative | null;
  userProfile?: PlannerUserProfile | null;
}): string {
  const parts = [
    PRODUCT_IDENTITY,
    ASSISTANT_ANTI_LEAK_RULE,
    INTERNAL_CHAT_RULES,
    IMMEDIATE_COORDINATES_PROJECT_RULES,
    CHAT_RESPONSE_SECTIONS,
    `Project: ${context.projectName}.`,
    "Use saved chat history; continue threads coherently.",
  ];

  const profileBlock = formatPlannerProfileForPrompt(context.userProfile);
  if (profileBlock) {
    parts.push(`User preferences:\n${profileBlock}`);
  }

  if (context.siteLat != null && context.siteLng != null) {
    parts.push(
      formatPlanningChatSiteContext({
        lat: context.siteLat,
        lng: context.siteLng,
        radiusM: context.siteRadiusM,
        placeLabel: context.placeLabel,
        projectType: context.projectType ?? context.siteAnalysis?.projectFeasibility?.projectType,
        customProjectDescription:
          context.customProjectDescription ??
          context.siteAnalysis?.projectFeasibility?.customProjectDescription,
        siteAnalysis: context.siteAnalysis ?? undefined,
        analysis: context.siteAnalysis ? undefined : (context.latestAnalysis ?? undefined),
        indicators: context.siteAnalysis ? undefined : context.latestAnalysis?.indicators,
      }),
    );
  } else if (context.siteSummary) {
    parts.push(`Site: ${context.siteSummary}`);
  }

  const pcNotes = planningContextToNotes(context.planningContext);
  if (pcNotes.length) {
    parts.push(pcNotes.map((n) => `- ${n}`).join("\n"));
  }

  return parts.join("\n\n");
}
