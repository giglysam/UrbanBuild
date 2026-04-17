import { CREATED_CHAT_FETCH_MS, jsonError } from "@/lib/api/http";
import { getServerEnv } from "@/env/server";
import {
  buildCreatedChatPrompt,
  parseCreatedChatResponse,
} from "@/lib/services/created-chat-request";
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

  const prompt = buildCreatedChatPrompt({ messages: parsed.data.messages });

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
          const parsedCreated = parseCreatedChatResponse(data);
          if (parsedCreated) {
            return NextResponse.json({ reply: parsedCreated.content, source: "created" as const });
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
