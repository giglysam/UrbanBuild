import { describe, expect, it } from "vitest";

/** Mirrors NEAR_BOTTOM logic in use-chat-auto-scroll.ts */
function isNearBottom(scrollHeight: number, scrollTop: number, clientHeight: number, threshold = 96) {
  return scrollHeight - scrollTop - clientHeight <= threshold;
}

describe("chat auto-scroll stickiness", () => {
  it("treats viewport as near bottom within threshold", () => {
    expect(isNearBottom(1000, 900, 80)).toBe(true);
    expect(isNearBottom(1000, 800, 80)).toBe(false);
  });
});
