import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

const MAX_CONTEXT_MESSAGES = 48;

export type ChatTurn = { role: "user" | "assistant"; content: string };

export async function loadThreadMessages(
  supabase: SupabaseClient,
  threadId: string,
): Promise<ChatTurn[]> {
  const { data, error } = await supabase
    .from("chat_messages")
    .select("role, content")
    .eq("thread_id", threadId)
    .in("role", ["user", "assistant"])
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);

  const turns: ChatTurn[] = [];
  for (const row of data ?? []) {
    if (row.role === "user" || row.role === "assistant") {
      turns.push({ role: row.role, content: String(row.content) });
    }
  }
  return turns.slice(-MAX_CONTEXT_MESSAGES);
}
