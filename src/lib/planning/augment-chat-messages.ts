import type { ChatTurn } from "@/lib/services/created-chat-request";

/** Pass messages through unchanged — do not append visible instruction hints the model may repeat. */
export function augmentChatMessagesForSiteData(messages: ChatTurn[]): ChatTurn[] {
  return messages;
}
