import "server-only";

import { z } from "zod";

const serverEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  NEXT_PUBLIC_SITE_URL: z.string().url().optional(),
  NEXT_PUBLIC_MAPBOX_TOKEN: z.string().optional(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().optional(),
  OVERPASS_API_URL: z.string().url().optional(),
  CREATED_CHAT_API_URL: z.string().url().optional(),
  /** Max upload bytes for project files (default 15MB). */
  MAX_UPLOAD_BYTES: z.coerce.number().int().positive().optional(),
  /** Feature flag JSON or simple keys — optional. */
  FEATURE_FLAGS: z.string().optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

function readServerEnv(): ServerEnv {
  return serverEnvSchema.parse({
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || undefined,
    NEXT_PUBLIC_MAPBOX_TOKEN: process.env.NEXT_PUBLIC_MAPBOX_TOKEN || undefined,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || undefined,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || undefined,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || undefined,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY || undefined,
    OPENAI_MODEL: process.env.OPENAI_MODEL || undefined,
    OVERPASS_API_URL: process.env.OVERPASS_API_URL || undefined,
    CREATED_CHAT_API_URL: process.env.CREATED_CHAT_API_URL || undefined,
    MAX_UPLOAD_BYTES: process.env.MAX_UPLOAD_BYTES || undefined,
    FEATURE_FLAGS: process.env.FEATURE_FLAGS || undefined,
  });
}

let cached: ServerEnv | null = null;

/** Server-only validated environment. Do not import from client components. */
export function getServerEnv(): ServerEnv {
  if (!cached) {
    cached = readServerEnv();
  }
  return cached;
}

export function isSupabaseConfigured(): boolean {
  const e = getServerEnv();
  return Boolean(e.NEXT_PUBLIC_SUPABASE_URL && e.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
