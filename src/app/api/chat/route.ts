import { CREATED_CHAT_FETCH_MS, jsonError } from "@/lib/api/http";
import { getServerEnv } from "@/env/server";
import { runPlanningChat } from "@/lib/services/openai-planning";
import { z } from "zod";
import { NextResponse } from "next/server";

export const maxDuration = 60;

const chatBodySchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string(),
    }),
  ),
});

/** Best-effort extract assistant text from Created (or similar) JSON responses. */
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

export async function POST(req: Request) {
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

  const createdUrl =
    getServerEnv().CREATED_CHAT_API_URL ?? "https://chat-z.created.app/api/chat";

  try {
    const upstream = await fetch(createdUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed.data),
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
            return NextResponse.json({ reply, source: "created" as const });
          }
        } catch {
          /* fall through */
        }
      }
      if (text.trim()) {
        return NextResponse.json({ reply: text.trim(), source: "created" as const });
      }
    }
  } catch {
    /* fall through to OpenAI */
  }

  try {
    const reply = await runPlanningChat(parsed.data.messages);
    return NextResponse.json({ reply, source: "openai" as const });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Chat failed";
    const status = message.includes("OPENAI_API_KEY") ? 503 : 502;
    return jsonError(message, status);
  }
}
