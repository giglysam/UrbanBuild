import { CREATED_CHAT_FETCH_MS, jsonError } from "@/lib/api/http";
import { requireUserJson } from "@/lib/api/auth-json";
import { getServerEnv } from "@/env/server";
import { logError } from "@/lib/logging/logger";
import { runPlanningChatWithSystem } from "@/lib/services/openai-planning";
import { buildPlanningChatSystemPrompt } from "@/lib/services/planning-chat-context";
import { createClient } from "@/lib/supabase/server";
import { siteAnalysisSchema } from "@/lib/types/planning";
import { NextResponse } from "next/server";
import { z } from "zod";

export const maxDuration = 60;

const chatBodySchema = z.object({
  threadId: z.string().uuid().optional(),
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string(),
    }),
  ),
});

function extractReplyFromJson(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const o = data as Record<string, unknown>;
  if (typeof o.reply === "string" && o.reply.trim()) return o.reply;
  if (typeof o.message === "string" && o.message.trim()) return o.message;
  const choices = o.choices;
  if (Array.isArray(choices) && choices[0] && typeof choices[0] === "object") {
    const c0 = choices[0] as Record<string, unknown>;
    const msg = c0.message;
    if (msg && typeof msg === "object") {
      const content = (msg as Record<string, unknown>).content;
      if (typeof content === "string") return content;
    }
  }
  const nested = o.data;
  if (nested && typeof nested === "object") {
    return extractReplyFromJson(nested);
  }
  return null;
}

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
  const { data } = await supabase.from("projects").select("owner_id, name").eq("id", projectId).maybeSingle();
  if (!data) return { gate: "not_found" as const, project: null as null };
  if (data.owner_id !== userId) return { gate: "forbidden" as const, project: null as null };
  return { gate: "ok" as const, project: { name: String(data.name) } };
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

  const rawResult = runRows?.[0]?.result as { analysis?: unknown } | undefined;
  const latestAnalysis = rawResult?.analysis
    ? siteAnalysisSchema.safeParse(rawResult.analysis).success
      ? siteAnalysisSchema.parse(rawResult.analysis)
      : null
    : null;

  const system = buildPlanningChatSystemPrompt({
    projectName: project.name,
    siteSummary,
    latestAnalysis,
  });

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

  const lastUser = [...parsed.data.messages].reverse().find((m) => m.role === "user");
  if (lastUser) {
    const { error: userInsErr } = await supabase.from("chat_messages").insert({
      thread_id: threadId,
      role: "user",
      content: lastUser.content,
    });
    if (userInsErr) {
      logError("chat_user_message_insert_failed", { message: userInsErr.message, projectId, threadId });
      return jsonError("Failed to save your message", 500);
    }
  }

  const createdUrl =
    getServerEnv().CREATED_CHAT_API_URL ?? "https://chat-z.created.app/api/chat";

  try {
    const upstream = await fetch(createdUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: parsed.data.messages.map((m) => ({ role: m.role, content: m.content })),
        system,
      }),
      signal: AbortSignal.timeout(CREATED_CHAT_FETCH_MS),
    });

    const contentType = upstream.headers.get("content-type") ?? "";

    if (upstream.ok) {
      const text = await upstream.text();
      if (contentType.includes("application/json")) {
        try {
          const data = JSON.parse(text) as unknown;
          const reply = extractReplyFromJson(data);
          if (reply) {
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
        return NextResponse.json({ reply: replyText, source: "created" as const, threadId });
      }
    }
  } catch {
    /* OpenAI fallback */
  }

  try {
    const reply = await runPlanningChatWithSystem(system, parsed.data.messages);
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
    return NextResponse.json({ reply, source: "openai" as const, threadId });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Chat failed";
    const status = message.includes("OPENAI_API_KEY") ? 503 : 502;
    return jsonError(message, status);
  }
}
