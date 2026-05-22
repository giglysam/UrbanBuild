# UrbanBuild — architecture

## Overview

UrbanBuild is a Next.js App Router application for **AI pre-feasibility**: marketing and auth routes are public; the authenticated **app** area lists **projects** and opens a workspace with site map, readiness scoring, required-study checklists, planning briefs, scenarios, site-grounded chat, files, and exports.

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

1. Client pins a site (lat/lng, default **400 m** radius), selects a **project type**, and calls `/api/analyze` or project-scoped analyze.
2. Server runs **three batched Overpass queries** (buildings/roads/transit, green/landuse, amenities/shops/offices), classifies into **10 OSM layers** (`src/lib/geo/osm-categories.ts`), then `computeIndicators` and `extractSiteOsmSignals` feed **`StructuredSiteAnalysis`** (`src/lib/types/site-feasibility.ts`).
3. In parallel, **Beirut Urban Lab / BBED 2024** ArcGIS FeatureServer (`services3.arcgis.com/.../BBBED_2024_DataSharing`) and optional **AUB ICIL** MapServer layers are queried for the same study buffer (`src/lib/services/beirut-urban-lab/`).
4. **`runProjectFeasibility`** applies rule-based scoring per project type (verdict 0–100, final recommendation, constraints, canonical missing data and required studies); optional OpenAI pass refines narrative only.
5. Chat and briefs use **`pre-project-readiness.ts`** — seven-section project readiness assessment (not generic urban chat).
6. Optional **`PlanningNarrative`** (insights, modules, scenarios) is generated with the structured object injected into the prompt so outputs stay site-grounded.
7. Results persist in `analysis_runs` (`siteAnalysis` + `planningNarrative` + `beirutUrbanLab`); readiness PDF via `POST /api/feasibility-report`. Standalone BBED fetch: `POST /api/beirut-urban-lab/context`.

## Security

- **RLS** on all user-owned tables scoped to `auth.uid()` (and organization membership where applicable).
- File uploads use **Storage** policies tied to `project_id` and owner; signed upload URLs where used.
- Secrets (`OPENAI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) are server-only via `src/env/server.ts`.

## Production notes

- Vercel **Hobby** serverless timeouts may be too low for Overpass + AI; use **Pro** or async jobs for heavy runs.
- Environment variables are validated at startup on the server; see README for the full list.
