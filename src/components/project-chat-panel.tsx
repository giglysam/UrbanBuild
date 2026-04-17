"use client";

import { Loader2, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

type Msg = {
  /** Server message id when loaded from API */
  id?: string;
  /** Stable key for optimistic / local-only rows */
  clientId?: string;
  role: string;
  content: string;
};

function newClientId(): string {
  return crypto.randomUUID();
}

export function ProjectChatPanel({ projectId }: { projectId: string }) {
  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([
    {
      clientId: `welcome-${projectId}`,
      role: "assistant",
      content:
        "Ask about walkability, scenarios, or briefs for this project. Responses use your latest saved analysis when available.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  /** True after the user sends (or edits) locally; blocks initial history from overwriting in-flight UI. */
  const localEditsRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    localEditsRef.current = false;
    void (async () => {
      setLoadError(null);
      try {
        const res = await fetch(`/api/projects/${projectId}/chat`);
        const text = await res.text();
        let data: { threads?: { id: string }[]; error?: string };
        try {
          data = (text ? JSON.parse(text) : {}) as { threads?: { id: string }[]; error?: string };
        } catch {
          throw new Error(res.ok ? "Invalid response from server" : `Request failed (${res.status})`);
        }
        if (!res.ok) {
          throw new Error(typeof data.error === "string" ? data.error : `Failed to load chat (${res.status})`);
        }
        const tid = data.threads?.[0]?.id;
        if (!tid) return;

        const m = await fetch(`/api/projects/${projectId}/chat?threadId=${encodeURIComponent(tid)}`);
        const mText = await m.text();
        let mj: { messages?: { id?: string; role: string; content: string }[]; error?: string };
        try {
          mj = (mText ? JSON.parse(mText) : {}) as typeof mj;
        } catch {
          throw new Error(m.ok ? "Invalid messages response" : `Failed to load messages (${m.status})`);
        }
        if (!m.ok) {
          throw new Error(typeof mj.error === "string" ? mj.error : `Failed to load messages (${m.status})`);
        }
        if (cancelled) return;
        setThreadId(tid);
        if (localEditsRef.current) {
          return;
        }
        if (mj.messages?.length) {
          setMessages(
            mj.messages
              .filter((x) => x.role === "user" || x.role === "assistant")
              .map((x, idx) => ({
                id: x.id,
                clientId: x.id ? undefined : `loaded-${tid}-${idx}`,
                role: x.role,
                content: x.content,
              })),
          );
        }
      } catch (e) {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : "Failed to load chat");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  async function send() {
    const trimmed = input.trim();
    if (!trimmed) return;
    localEditsRef.current = true;
    const next = [...messages, { role: "user" as const, content: trimmed, clientId: newClientId() }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          threadId: threadId ?? undefined,
          messages: [...next.filter((m) => m.role === "user" || m.role === "assistant")].map((m) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          })),
        }),
      });
      const data = (await res.json()) as { reply?: string; threadId?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Chat failed");
      if (data.threadId) setThreadId(data.threadId);
      if (typeof data.reply === "string") {
        setMessages([...next, { role: "assistant", content: data.reply, clientId: newClientId() }]);
      }
    } catch (e) {
      setMessages([
        ...next,
        {
          role: "assistant",
          content: e instanceof Error ? e.message : "Chat failed",
          clientId: newClientId(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="flex max-h-[min(80vh,720px)] flex-col">
      <CardHeader>
        <CardTitle className="text-base">Planning assistant</CardTitle>
        <CardDescription>Project-aware chat with persisted history.</CardDescription>
        {loadError ? (
          <p className="text-sm text-destructive" role="alert">
            {loadError}
          </p>
        ) : null}
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3">
        <ScrollArea className="min-h-[280px] flex-1 rounded-md border p-3">
          <ul className="space-y-3 text-sm">
            {messages.map((m) => (
              <li
                key={m.id ?? m.clientId}
                className={m.role === "user" ? "ml-8 text-right" : "mr-8"}
              >
                <span className="inline-block rounded-lg bg-muted px-3 py-2 text-left">{m.content}</span>
              </li>
            ))}
          </ul>
        </ScrollArea>
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a follow-up…"
            onKeyDown={(e) => {
              if (e.key === "Enter") void send();
            }}
          />
          <Button type="button" onClick={() => void send()} disabled={loading}>
            {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Send className="size-4" aria-hidden />}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
