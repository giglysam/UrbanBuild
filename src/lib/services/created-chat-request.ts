/**
 * Created upstream: https://chat-z.created.app/api/chat
 * Request: POST JSON `{ "prompt": string }`
 * Response: `{ "success": boolean, "content": string }` (plus legacy shapes supported as fallback).
 */

export type ChatTurn = { role: "user" | "assistant"; content: string };

/** Compose system + multi-turn history into one prompt for APIs that only accept a single string. */
export function buildCreatedChatPrompt(opts: { system?: string; messages: ChatTurn[] }): string {
  const parts: string[] = [];
  const sys = opts.system?.trim();
  if (sys) {
    parts.push(`[System]\n${sys}`);
  }
  const lines = opts.messages.map((m) => {
    const who = m.role === "user" ? "User" : "Assistant";
    return `[${who}]\n${m.content.trim()}`;
  });
  parts.push(`[Conversation]\n${lines.join("\n\n")}`);
  return parts.join("\n\n---\n\n");
}

/** Prefer Created's `{ success, content }`; fall back to older extraction paths. */
export function parseCreatedChatResponse(data: unknown): { content: string } | null {
  if (data == null || typeof data !== "object") return null;
  const o = data as Record<string, unknown>;

  if (o.success === true && typeof o.content === "string") {
    const t = o.content.trim();
    if (t) return { content: t };
  }

  if (o.success === false) return null;

  const legacy = extractReplyLegacy(data);
  if (legacy) return { content: legacy };
  return null;
}

function extractReplyLegacy(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const o = data as Record<string, unknown>;
  if (typeof o.content === "string" && o.content.trim()) return o.content.trim();
  if (typeof o.reply === "string" && o.reply.trim()) return o.reply.trim();
  if (typeof o.message === "string" && o.message.trim()) return o.message.trim();
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
    return extractReplyLegacy(nested);
  }
  return null;
}
