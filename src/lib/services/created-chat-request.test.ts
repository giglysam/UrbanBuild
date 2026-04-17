import { describe, expect, it } from "vitest";
import { buildCreatedChatPrompt, parseCreatedChatResponse } from "./created-chat-request";

describe("buildCreatedChatPrompt", () => {
  it("includes system and labeled turns", () => {
    const p = buildCreatedChatPrompt({
      system: "Be helpful.",
      messages: [
        { role: "user", content: "Hi" },
        { role: "assistant", content: "Hello." },
      ],
    });
    expect(p).toContain("[System]");
    expect(p).toContain("Be helpful.");
    expect(p).toContain("[User]");
    expect(p).toContain("Hi");
    expect(p).toContain("[Assistant]");
    expect(p).toContain("Hello.");
  });
});

describe("parseCreatedChatResponse", () => {
  it("reads success + content", () => {
    expect(parseCreatedChatResponse({ success: true, content: " OK " })).toEqual({ content: "OK" });
  });

  it("returns null when success is false", () => {
    expect(parseCreatedChatResponse({ success: false, content: "err" })).toBeNull();
  });

  it("falls back to legacy content", () => {
    expect(parseCreatedChatResponse({ content: "legacy" })).toEqual({ content: "legacy" });
  });
});
