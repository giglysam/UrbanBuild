import { CREATED_CHAT_FETCH_MS, jsonError } from "@/lib/api/http";
import { requireUserJson } from "@/lib/api/auth-json";
import { getServerEnv } from "@/env/server";
import { logError } from "@/lib/logging/logger";
import { buildCreatedChatPrompt, parseCreatedChatResponse } from "@/lib/services/created-chat-request";
import { runPlanningChatWithSystem } from "@/lib/services/openai-planning";
import { loadThreadMessages } from "@/lib/chat/thread-messages";
import { extractProfileDeltaFromExchange } from "@/lib/services/extract-user-profile-from-chat";
import { buildPlanningChatSystemPrompt } from "@/lib/services/planning-chat-context";
import {
  loadPlannerProfile,
  mergePlannerProfile,
  savePlannerProfile,
} from "@/lib/services/user-planner-profile";
import { createClient } from "@/lib/supabase/server";
import { parseAnalysisRunResult } from "@/lib/analysis/parse-analysis-run";
import { augmentChatMessagesForSiteData } from "@/lib/planning/augment-chat-messages";
import { extractChatSiteIntent } from "@/lib/planning/extract-chat-site-intent";
import { mergeAnalysisRunForChat } from "@/lib/planning/merge-analysis-run-for-chat";
import { resolvePlanningChatSiteContext } from "@/lib/planning/resolve-chat-site-context";
import type { PlanningChatSiteContext } from "@/lib/planning/planning-chat-site-context";
import { planningContextSchema } from "@/lib/types/planning";
import { NextResponse } from "next/server";
import { z } from "zod";

export const maxDuration = 60;

const chatBodySchema = z
  .object({
    threadId: z.string().uuid().optional(),
    /** Preferred: send only the new user message; server loads prior turns from the database. */
    message: z.string().min(1).max(16000).optional(),
    messages: z
      .array(
        z.object({
          role: z.enum(["user", "assistant"]),
          content: z.string(),
        }),
      )
      .optional(),
  })
  .refine((b) => Boolean(b.message?.trim()) || (b.messages && b.messages.length > 0), {
    message: "Provide message or messages",
  });

export async function GET(req: Request, ctx: { params: Promise<{ projectId: string }> }) {
  const auth = await requireUserJson();
  if (!auth.ok) return auth.response;
  const { projectId } = await ctx.params;
  const { searchParams } = new URL(req.url);
  const threadId = searchParams.get("threadId");

  const supabase = await createClient();
  const { gate } = await assertOwner(supabase, auth.user.id, projectId);
  if (gate === "not_found") return jsonError("Project not found", 404);
  if (gate === "forbidden") return jsonError("Forbidden", 403);

  if (!threadId) {
    const { data: threads, error } = await supabase
      .from("chat_threads")
      .select("id, title, created_at")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });
    if (error) {
      return jsonError("Failed to load threads", 500);
    }
    return NextResponse.json({ threads: threads ?? [] });
  }

  const { data: messages, error: mErr } = await supabase
    .from("chat_messages")
    .select("id, role, content, created_at, meta")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });

  if (mErr) {
    return jsonError("Failed to load messages", 500);
  }

  return NextResponse.json({ messages: messages ?? [] });
}

async function assertOwner(supabase: Awaited<ReturnType<typeof createClient>>, userId: string, projectId: string) {
  const { data } = await supabase
    .from("projects")
    .select("owner_id, name, planning_context")
    .eq("id", projectId)
    .maybeSingle();
  if (!data) return { gate: "not_found" as const, project: null as null };
  if (data.owner_id !== userId) return { gate: "forbidden" as const, project: null as null };
  const pcParsed = planningContextSchema.safeParse(data.planning_context ?? {});
  return {
    gate: "ok" as const,
    project: { name: String(data.name), planningContext: pcParsed.success ? pcParsed.data : null },
  };
}

export async function POST(req: Request, ctx: { params: Promise<{ projectId: string }> }) {
  const auth = await requireUserJson();
  if (!auth.ok) return auth.response;
  const { projectId } = await ctx.params;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }
  const parsed = chatBodySchema.safeParse(json);
  if (!parsed.success) {
    return jsonError("Invalid request body", 400, parsed.error.flatten());
  }

  const supabase = await createClient();
  const { gate, project } = await assertOwner(supabase, auth.user.id, projectId);
  if (gate === "not_found") return jsonError("Project not found", 404);
  if (gate === "forbidden") return jsonError("Forbidden", 403);
  if (!project) return jsonError("Project not found", 404);

  const { data: site } = await supabase.from("project_sites").select("*").eq("project_id", projectId).maybeSingle();
  const siteSummary =
    site?.center_lat != null && site?.center_lng != null
      ? `Center ${site.center_lat.toFixed(5)}, ${site.center_lng.toFixed(5)}; radius ${site.radius_m ?? 400}m.`
      : undefined;

  const { data: runRows } = await supabase
    .from("analysis_runs")
    .select("result")
    .eq("project_id", projectId)
    .eq("status", "completed")
    .order("created_at", { ascending: false })
    .limit(1);

  const rawResult = runRows?.[0]?.result;
  const parsedRun = parseAnalysisRunResult(rawResult);
  const latestAnalysis = parsedRun?.planningNarrative ?? null;
  const runExtra = rawResult as { beirutUrbanLab?: unknown; bufferMetrics?: unknown } | undefined;
  const siteAnalysis =
    parsedRun && site?.center_lat != null && site?.center_lng != null
      ? mergeAnalysisRunForChat(
          parsedRun,
          {
            beirutUrbanLab: parsedRun.beirutUrbanLab,
            bufferMetrics: parsedRun.bufferMetrics,
          },
          {
            lat: site.center_lat,
            lng: site.center_lng,
            radiusM: site.radius_m ?? undefined,
            placeLabel: site.label ?? undefined,
          },
        )
      : parsedRun?.siteAnalysis ?? null;

  const userProfile = await loadPlannerProfile(supabase, auth.user.id);

  let threadId = parsed.data.threadId ?? null;

  if (threadId) {
    const { data: th } = await supabase.from("chat_threads").select("id").eq("id", threadId).eq("project_id", projectId).maybeSingle();
    if (!th) {
      threadId = null;
    }
  }

  if (!threadId) {
    const { data: created, error: tErr } = await supabase
      .from("chat_threads")
      .insert({ project_id: projectId, title: "Planning chat" })
      .select("id")
      .single();
    if (tErr || !created) {
      return jsonError("Failed to create chat thread", 500);
    }
    threadId = created.id as string;
  }

  const incomingUserText =
    parsed.data.message?.trim() ??
    [...(parsed.data.messages ?? [])].reverse().find((m) => m.role === "user")?.content.trim() ??
    "";

  if (!incomingUserText) {
    return jsonError("Empty user message", 400);
  }

  let conversation = await loadThreadMessages(supabase, threadId);
  const last = conversation[conversation.length - 1];
  if (!(last?.role === "user" && last.content === incomingUserText)) {
    const { error: userInsErr } = await supabase.from("chat_messages").insert({
      thread_id: threadId,
      role: "user",
      content: incomingUserText,
    });
    if (userInsErr) {
      logError("chat_user_message_insert_failed", { message: userInsErr.message, projectId, threadId });
      return jsonError("Failed to save your message", 500);
    }
    conversation = [...conversation, { role: "user", content: incomingUserText }];
  }

  const extracted = extractChatSiteIntent(incomingUserText);
  const baseCtx: PlanningChatSiteContext | undefined =
    extracted.lat != null && extracted.lng != null
      ? {
          lat: extracted.lat,
          lng: extracted.lng,
          radiusM: extracted.radiusM,
          placeLabel: extracted.placeLabel,
          projectType: extracted.projectType,
          customProjectDescription: extracted.customProjectDescription,
        }
      : site?.center_lat != null && site?.center_lng != null
        ? {
            lat: site.center_lat,
            lng: site.center_lng,
            radiusM: site.radius_m ?? undefined,
            placeLabel: extracted.placeLabel ?? site.label ?? undefined,
            projectType: extracted.projectType ?? siteAnalysis?.projectFeasibility?.projectType,
            customProjectDescription: extracted.customProjectDescription,
            siteAnalysis: siteAnalysis ?? undefined,
            bufferMetrics: parsedRun?.bufferMetrics ?? undefined,
            beirutUrbanLab: parsedRun?.beirutUrbanLab ?? undefined,
            indicators: parsedRun?.indicators,
          }
        : undefined;

  const { context: resolvedCtx } = await resolvePlanningChatSiteContext(baseCtx, incomingUserText);
  const chatSiteAnalysis = resolvedCtx?.siteAnalysis ?? siteAnalysis;
  const chatProjectType =
    extracted.projectType ??
    resolvedCtx?.projectType ??
    chatSiteAnalysis?.projectFeasibility?.projectType;

  const system = buildPlanningChatSystemPrompt({
    projectName: project.name,
    siteSummary,
    siteLat: resolvedCtx?.lat ?? site?.center_lat ?? undefined,
    siteLng: resolvedCtx?.lng ?? site?.center_lng ?? undefined,
    siteRadiusM: resolvedCtx?.radiusM ?? site?.radius_m ?? undefined,
    placeLabel: resolvedCtx?.placeLabel ?? site?.label ?? undefined,
    projectType: chatProjectType,
    customProjectDescription:
      resolvedCtx?.customProjectDescription ?? extracted.customProjectDescription,
    planningContext: project.planningContext,
    siteAnalysis: chatSiteAnalysis,
    latestAnalysis: chatSiteAnalysis ? null : latestAnalysis,
    userProfile,
  });

  const createdUrl =
    getServerEnv().CREATED_CHAT_API_URL ?? "https://chat-z.created.app/api/chat";

  const messagesForModel = augmentChatMessagesForSiteData(conversation);

  const prompt = buildCreatedChatPrompt({
    system,
    messages: messagesForModel,
  });

  try {
    const upstream = await fetch(createdUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
      signal: AbortSignal.timeout(CREATED_CHAT_FETCH_MS),
    });

    const contentType = upstream.headers.get("content-type") ?? "";

    if (upstream.ok) {
      const text = await upstream.text();
      if (contentType.includes("application/json")) {
        try {
          const data = JSON.parse(text) as unknown;
          const createdReply = parseCreatedChatResponse(data);
          if (createdReply) {
            const reply = createdReply.content;
            const { error: asstErr } = await supabase.from("chat_messages").insert({
              thread_id: threadId,
              role: "assistant",
              content: reply,
              meta: { source: "created" },
            });
            if (asstErr) {
              logError("chat_assistant_message_insert_failed", { message: asstErr.message, projectId, threadId });
              return jsonError("Reply received but failed to save", 502);
            }
            void persistProfileLearning(supabase, auth.user.id, incomingUserText, reply);
            return NextResponse.json({ reply, source: "created" as const, threadId });
          }
        } catch {
          /* fall through */
        }
      }
      if (text.trim()) {
        const replyText = text.trim();
        const { error: asstErr } = await supabase.from("chat_messages").insert({
          thread_id: threadId,
          role: "assistant",
          content: replyText,
          meta: { source: "created" },
        });
        if (asstErr) {
          logError("chat_assistant_message_insert_failed", { message: asstErr.message, projectId, threadId });
          return jsonError("Reply received but failed to save", 502);
        }
        void persistProfileLearning(supabase, auth.user.id, incomingUserText, replyText);
        return NextResponse.json({ reply: replyText, source: "created" as const, threadId });
      }
    }
  } catch {
    /* OpenAI fallback */
  }

  try {
    const reply = await runPlanningChatWithSystem(system, messagesForModel);
    const { error: asstErr } = await supabase.from("chat_messages").insert({
      thread_id: threadId,
      role: "assistant",
      content: reply,
      meta: { source: "openai" },
    });
    if (asstErr) {
      logError("chat_assistant_message_insert_failed", { message: asstErr.message, projectId, threadId });
      return jsonError("Reply received but failed to save", 502);
    }
    void persistProfileLearning(supabase, auth.user.id, incomingUserText, reply);
    return NextResponse.json({ reply, source: "openai" as const, threadId });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Chat failed";
    const status = message.includes("OPENAI_API_KEY") ? 503 : 502;
    return jsonError(message, status);
  }
}

async function persistProfileLearning(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  userMessage: string,
  assistantReply: string,
) {
  try {
    const delta = await extractProfileDeltaFromExchange(userMessage, assistantReply);
    if (!delta) return;
    const current = await loadPlannerProfile(supabase, userId);
    const merged = mergePlannerProfile(current, delta);
    await savePlannerProfile(supabase, userId, merged);
  } catch (e) {
    logError("profile_learning_failed", {
      message: e instanceof Error ? e.message : "unknown",
      userId,
    });
  }
}
