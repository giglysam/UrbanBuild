"use client";

import { useCallback, useEffect, useRef } from "react";

const NEAR_BOTTOM_PX = 96;

function getRadixScrollViewport(root: HTMLElement | null): HTMLElement | null {
  if (!root) return null;
  return root.querySelector("[data-radix-scroll-area-viewport]") as HTMLElement | null;
}

function isNearBottom(viewport: HTMLElement): boolean {
  return viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight <= NEAR_BOTTOM_PX;
}

type Options = {
  /** True while waiting for or streaming an assistant reply. */
  isLoading?: boolean;
  /** Partial assistant text during streaming (include in deps when added). */
  streamingContent?: string;
};

/**
 * Auto-scrolls a Radix ScrollArea chat to the latest message when the user is near the bottom.
 * Attach scrollRootRef to ScrollArea, messagesEndRef to a trailing anchor inside the message list.
 */
export function useChatAutoScroll(deps: ReadonlyArray<unknown>, options?: Options) {
  const scrollRootRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    if (!stickToBottomRef.current) return;

    const viewport = getRadixScrollViewport(scrollRootRef.current);
    if (viewport) {
      if (behavior === "auto") {
        viewport.scrollTop = viewport.scrollHeight;
      } else {
        viewport.scrollTo({ top: viewport.scrollHeight, behavior });
      }
      return;
    }

    messagesEndRef.current?.scrollIntoView({ behavior, block: "end" });
  }, []);

  const updateStickiness = useCallback(() => {
    const viewport = getRadixScrollViewport(scrollRootRef.current);
    if (!viewport) return;
    stickToBottomRef.current = isNearBottom(viewport);
  }, []);

  /** Call when the user sends a message so the view follows the new turn. */
  const scrollOnSend = useCallback(() => {
    stickToBottomRef.current = true;
    scrollToBottom("smooth");
  }, [scrollToBottom]);

  useEffect(() => {
    const viewport = getRadixScrollViewport(scrollRootRef.current);
    if (!viewport) return;
    viewport.addEventListener("scroll", updateStickiness, { passive: true });
    updateStickiness();
    return () => viewport.removeEventListener("scroll", updateStickiness);
  }, [updateStickiness]);

  useEffect(() => {
    const behavior: ScrollBehavior = options?.isLoading || options?.streamingContent ? "auto" : "smooth";
    scrollToBottom(behavior);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- caller supplies message/loading deps
  }, deps);

  useEffect(() => {
    const content = messagesEndRef.current?.parentElement;
    if (!content) return;

    const ro = new ResizeObserver(() => {
      if (stickToBottomRef.current) {
        scrollToBottom("auto");
      }
    });
    ro.observe(content);
    return () => ro.disconnect();
  }, [scrollToBottom]);

  return { scrollRootRef, messagesEndRef, scrollOnSend };
}
