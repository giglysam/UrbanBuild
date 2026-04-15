# UrbanBuild — architecture

## Overview

UrbanBuild is a Next.js App Router application: marketing and auth routes are public; the authenticated **app** area lists **projects** and opens a **project workspace** with site map, OSM-backed analysis, planning briefs, scenarios, chat, files, and exports.

External services: **Supabase** (Postgres, Auth, Storage), **Mapbox** (map + optional geocoding), **Overpass** (OpenStreetMap), **OpenAI** (structured analysis and chat fallback), optional **Created** chat upstream.

## Directory layout

| Path | Role |
|------|------|
| `src/app/(marketing)/` | Landing and public marketing pages |
| `src/app/(auth)/` | Login, signup, password reset |
| `src/app/(app)/` | Authenticated dashboard and project workspace |
| `src/app/api/` | Route handlers (JSON APIs) |
| `src/components/` | React UI; `ui/` for primitives |
| `src/env/` | Zod-validated environment (`client.ts` vs `server.ts`) |
| `src/lib/analysis/` | Orchestration: site study → indicators → LLM → persistence |
| `src/lib/api/` | Shared `jsonError` and HTTP helpers |
| `src/lib/auth/` | Session helpers, route protection utilities |
| `src/lib/db/` | Supabase types and repository-style accessors |
| `src/lib/geo/` | Turf, indicator computation, OSM types |
| `src/lib/reports/` | PDF / export builders |
| `src/lib/services/` | Overpass, geocode, OpenAI planning, chat |
| `src/lib/supabase/` | Browser and server Supabase clients |
| `supabase/migrations/` | SQL schema and RLS |

## Data flow (analysis)

1. Client sends study parameters (center, radius, optional polygon) to analysis API or project-scoped analysis route.
2. Server fetches Overpass data, runs `computeIndicators`, optionally merges polygon context.
3. OpenAI returns structured `SiteAnalysis` (Zod-validated).
4. Results persist in `analysis_runs` and drive UI; planning briefs and scenarios can be versioned in dedicated tables.

## Security

- **RLS** on all user-owned tables scoped to `auth.uid()` (and organization membership where applicable).
- File uploads use **Storage** policies tied to `project_id` and owner; signed upload URLs where used.
- Secrets (`OPENAI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) are server-only via `src/env/server.ts`.

## Production notes

- Vercel **Hobby** serverless timeouts may be too low for Overpass + AI; use **Pro** or async jobs for heavy runs.
- Environment variables are validated at startup on the server; see README for the full list.
