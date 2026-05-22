# UrbanBuild

Production-oriented **AI pre-feasibility** workspace for engineers, architects, planners, and developers: pin a site, run OSM/BBED site intelligence, score preliminary project readiness (0–100), list missing official data and required studies, and chat with a site-grounded assistant—not a generic city planning bot. Built with **Next.js 16** (App Router), **Supabase** (Auth, Postgres, Storage), **Mapbox**, and **OpenAI**.

## Product overview

- **Marketing & demo**: `/` landing, `/demo` standalone map + readiness analysis (no account).
- **Auth**: email/password via Supabase (`/login`, `/signup`, `/forgot-password`, `/auth/callback`).
- **Workspace**: `/dashboard`, projects under `/projects/[id]` with tabs (Overview, Site, Analysis, Planning brief, Scenarios, Chat, Files, Reports, Settings).
- **Pre-feasibility output**: seven-section readiness assessment (site conditions, regulatory gaps, scope, utilities, risks, missing data/studies, final recommendation) grounded on pinned coordinates, study radius, OSM/Overpass, and Beirut Urban Lab / BBED when available.
- **Trust & safety**: separates known open data from missing official zoning, parcels, utilities, and approvals; never implies legal permit feasibility.

## Architecture

- **`src/app/(marketing)`** — public landing (`/`).
- **`src/app/(auth)`** — auth pages.
- **`src/app/(app)`** — authenticated shell (sidebar, `force-dynamic`).
- **`src/app/api/`** — JSON APIs (legacy `/api/analyze`, `/api/chat`, `/api/site-data`, plus **`/api/projects/...`**).
- **`src/lib/geo`**, **`src/lib/services/overpass.ts`** — OSM fetch and indicators.
- **`src/lib/analysis/`** — analysis pipeline, planning brief generation, scenario comparison.
- **`src/lib/services/openai-planning.ts`** — OpenAI Responses API (structured outputs).
- **`src/env/`** — Zod-validated environment (server vs client).
- **`supabase/migrations/`** — Postgres schema + RLS + Storage bucket policies.
- **`docs/architecture.md`** — folder map and data flow.

See **[docs/architecture.md](docs/architecture.md)** for detail.

## Data model (high level)

Managed in Supabase: `profiles`, `organizations` / `organization_members` (teams-ready), `projects`, `project_sites` (center, radius, optional polygon GeoJSON), `project_files`, `analysis_runs`, `planning_briefs` (versioned), `scenarios`, `scenario_comparisons`, `chat_threads`, `chat_messages`, `user_preferences`, `billing_accounts` (placeholder). Storage bucket **`project-files`** with path `{user_id}/{project_id}/...`.

## Main API endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/geocode?q=` | Forward geocode (Mapbox / Nominatim) |
| POST | `/api/mapbox/context` | Build Mapbox data bundle + textual context for AI |
| POST | `/api/mapbox/command` | AI/heuristic command plan + execute map overlays |
| GET | `/api/mapbox/search/suggest?q=` | Search Box autocomplete suggestions |
| GET | `/api/mapbox/search/retrieve?mapboxId=` | Search Box retrieve selected place |
| POST | `/api/mapbox/matrix` | Travel-time/distance matrix between points |
| POST | `/api/site-data` | OSM indicators only (no AI) |
| POST | `/api/analyze` | Legacy anonymous analysis (no persistence) |
| POST | `/api/chat` | Stateless chat (Created + OpenAI fallback) |
| POST | `/api/design/concepts` | Generate 2–4 site-grounded design concepts after analysis |
| POST | `/api/generate-image` | OpenAI Images — site-specific concept visualization (base64 data URL) |
| POST | `/api/design/concept-image` | Alias of `/api/generate-image` |
| GET/POST | `/api/projects` | List / create projects |
| GET/PATCH/DELETE | `/api/projects/[id]` | Project CRUD |
| PATCH | `/api/projects/[id]/site` | Site center, radius, boundary |
| POST | `/api/projects/[id]/analyze` | Run analysis + persist `analysis_runs` + `scenarios` |
| GET/POST | `/api/projects/[id]/planning-brief` | List / generate brief versions |
| GET | `/api/projects/[id]/scenarios` | List scenarios |
| POST | `/api/projects/[id]/scenarios/compare` | Compare two scenarios (LLM) |
| POST | `/api/projects/[id]/scenarios/[sid]/prefer` | Mark preferred scenario |
| GET/POST | `/api/projects/[id]/files` | List / register uploaded file metadata |
| DELETE | `/api/projects/[id]/files/[fid]` | Remove file + storage object |
| GET/POST | `/api/projects/[id]/chat` | List threads/messages or send project-aware chat (server loads full thread history) |
| GET/PATCH | `/api/user/profile` | Planner profile — learned tastes + your notes |
| POST | `/api/projects/save-workspace` | Save demo workspace as a new project (site, analysis, concepts, chat) |
| GET | `/api/projects/[id]/export` | JSON snapshot download |
| GET | `/api/projects/[id]/reports/planning-brief` | Planning brief PDF |
| GET | `/api/projects/[id]/reports/mapbox-static` | Static map PNG centered on saved site |

## How AI analysis works

1. Load site parameters from `project_sites` (center, radius; polygon noted for future disk queries).
2. **Overpass** fetches OSM features; **indicators** computed in `lib/geo`.
3. **OpenAI** returns a **Zod-validated** `SiteAnalysis` (insights, scenarios, planning brief string, disclaimers).
4. Results stored in **`analysis_runs`**; scenarios copied to **`scenarios`** for comparison and preference.

Planning brief **versions** use a dedicated generator in `lib/analysis/generate-planning-brief.ts` and persist markdown in **`planning_briefs`**.

## Mapbox data + AI map control

- The demo workspace now supports **Mapbox command execution**: user text commands are translated into actionable map operations (`show_route`, `show_isochrone`, `show_pois`, `set_style`, etc.).
- APIs wired for this flow:
  - `POST /api/mapbox/context` gathers route/isochrone/POI data and compiles **textual context** for AI reasoning.
  - `POST /api/mapbox/command` builds a command plan (OpenAI when available, heuristic fallback), executes Mapbox actions, and returns overlays + refreshed text context.
- Data sources are explicit in responses: Geocoding, Directions, Isochrone, and Tilequery.
- The textual context is designed to be fed to planning/chat prompts so model choices are traceable to map data, not generic assumptions.

## Setup

```bash
npm install
cp .env.example .env.local
# Fill keys — at minimum Supabase + Mapbox + OpenAI for full product
npm run dev
```

### Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Run SQL in **`supabase/migrations/20260413120000_initial.sql`** (SQL editor or `supabase db push`).
3. Enable Auth email provider; set **Site URL** and **Redirect URLs** to include `http://localhost:3000/auth/callback` and your production URL.
4. Copy **Project URL** and **anon** key into `.env.local`; optional **service role** for server-side admin tooling only.

### Environment variables

See **[.env.example](.env.example)**. Required for the full app:

**Security:** Keep real keys only in **`.env.local`** on your machine. That file is in **`.gitignore`** and must not be committed. If a Mapbox or OpenAI key was shared in chat, issues, or screenshots, rotate it in the provider dashboard and update `.env.local`.

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_MAPBOX_TOKEN`
- `OPENAI_API_KEY`

Optional: `OPENAI_MODEL`, `OVERPASS_API_URL`, `CREATED_CHAT_API_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `MAX_UPLOAD_BYTES`, `NEXT_PUBLIC_SITE_URL`.

## Development

| Command | Description |
|---------|-------------|
| `npm run dev` | Next.js dev server |
| `npm run build` | Production build (webpack; Mapbox-compatible) |
| `npm run start` | Start production server |
| `npm run lint` | ESLint |
| `npm test` | Vitest unit tests |

## Deployment (e.g. Vercel)

1. Set all required env vars in the project settings.
2. Framework: **Next.js**; build: `npm run build`.
3. **Function duration**: heavy routes set `maxDuration = 60` where needed; **Vercel Hobby** has a low cap — use **Pro** or async jobs for reliable Overpass + LLM in production.
4. **Middleware**: Next.js 16 may show a deprecation notice for `middleware.ts` in favor of the new “proxy” convention — plan a follow-up when upgrading.

## How analysis behaves at a high level

- **Geospatial**: Overpass query built in `lib/services/overpass.ts`; timeouts in `lib/api/http.ts`.
- **LLM**: `lib/services/openai-planning.ts` uses the Responses API with structured outputs; chat can use **Created** upstream then **OpenAI** with a project-specific system prompt from `lib/services/planning-chat-context.ts`.

## Known limitations

- Official zoning and municipal law are **not** inferred from OSM alone; users must consult local authorities.
- **Middleware** naming may change in a future Next.js release (see build warning).
- **Rate limiting** is stubbed in `lib/api/rate-limit.ts` (in-memory); swap for Redis/Upstash at scale.
- **DOCX** export is not implemented; PDF brief export is available.

## Roadmap (ideas)

- Background jobs for long analyses (Inngest / queue).
- Team/org UI on top of existing `organizations` tables.
- Richer map: polygon-driven Overpass queries.
- DOCX export and branded report templates.

## License

Private / as specified by your organization.
