import { NextResponse } from "next/server";

/**
 * Server-side HTTP timeouts for fetch() calls.
 * Note: Vercel Hobby still caps serverless execution at ~10s; Pro allows higher maxDuration.
 */
export const OVERPASS_FETCH_MS = 45_000;
export const CREATED_CHAT_FETCH_MS = 55_000;

/** Consistent JSON error shape for API routes: `{ error: string, details?: unknown }`. */
export function jsonError(message: string, status: number, details?: unknown) {
  if (details !== undefined) {
    return NextResponse.json({ error: message, details }, { status });
  }
  return NextResponse.json({ error: message }, { status });
}
