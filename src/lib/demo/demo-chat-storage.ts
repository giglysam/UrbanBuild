const STORAGE_KEY = "urbanbuild:demo:chat:v1";

export type DemoChatMessage = { role: "user" | "assistant"; content: string };

export function loadDemoChat(): DemoChatMessage[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    return parsed.filter(
      (m): m is DemoChatMessage =>
        m &&
        typeof m === "object" &&
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string",
    );
  } catch {
    return null;
  }
}

export function saveDemoChat(messages: DemoChatMessage[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-80)));
  } catch {
    /* quota */
  }
}

export function clearDemoChat() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}
