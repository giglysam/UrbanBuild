import { getServerEnv } from "@/env/server";

type LogLevel = "info" | "warn" | "error" | "debug";

function basePayload(level: LogLevel, message: string, extra?: Record<string, unknown>) {
  return {
    ts: new Date().toISOString(),
    level,
    message,
    env: getServerEnv().NODE_ENV,
    ...extra,
  };
}

/** Structured JSON logs for Vercel / log drains. */
export function logInfo(message: string, extra?: Record<string, unknown>) {
  console.log(JSON.stringify(basePayload("info", message, extra)));
}

export function logWarn(message: string, extra?: Record<string, unknown>) {
  console.warn(JSON.stringify(basePayload("warn", message, extra)));
}

export function logError(message: string, extra?: Record<string, unknown>) {
  console.error(JSON.stringify(basePayload("error", message, extra)));
}
