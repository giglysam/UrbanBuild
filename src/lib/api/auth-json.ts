import "server-only";

import { getSessionUser } from "@/lib/auth/session";

import { jsonError } from "./http";

export async function requireUserJson() {
  const user = await getSessionUser();
  if (!user) {
    return { ok: false as const, response: jsonError("Unauthorized", 401) };
  }
  return { ok: true as const, user };
}
