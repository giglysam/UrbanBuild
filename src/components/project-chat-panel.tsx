"use client";

import { Loader2, Send } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

type Msg = { id?: string; role: string; content: string };

export function ProjectChatPanel({ projectId }: { projectId: string }) {
  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "Ask about walkability, scenarios, or briefs for this project. Responses use your latest saved analysis when available.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void (async () => {
      const res = await fetch(`/api/projects/${projectId}/chat`);
      const data = (await res.json()) as { threads?: { id: string }[] };
      const tid = data.threads?.[0]?.id;
      if (tid) {
        setThreadId(tid);
        const m = await fetch(`/api/projects/${projectId}/chat?threadId=${encodeURIComponent(tid)}`);
        const mj = (await m.json()) as { messages?: { role: string; content: string }[] };
        if (mj.messages?.length) {
          setMessages(mj.messages.filter((x) => x.role === "user" || x.role === "assistant"));
        }
      }
    })();
  }, [projectId]);

  async function send() {
    const trimmed = input.trim();
    if (!trimmed) return;
    const next = [...messages, { role: "user" as const, content: trimmed }];
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
        setMessages([...next, { role: "assistant", content: data.reply }]);
      }
    } catch (e) {
      setMessages([
        ...next,
        { role: "assistant", content: e instanceof Error ? e.message : "Chat failed" },
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
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3">
        <ScrollArea className="min-h-[280px] flex-1 rounded-md border p-3">
          <ul className="space-y-3 text-sm">
            {messages.map((m, i) => (
              <li key={i} className={m.role === "user" ? "ml-8 text-right" : "mr-8"}>
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
