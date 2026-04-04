# UrbanBuild — Beirut Urban Planning MVP

AI-assisted urban analysis for planners and architects. Pilot city: **Beirut**. The app combines OpenStreetMap context, heuristic indicators, and OpenAI-generated insights with explicit confidence labels (observed / inferred / speculative).

## What you need

| Resource | Purpose |
|----------|---------|
| **Node.js 20+** | Local dev |
| **Mapbox access token** | Map GL + optional geocoding (`NEXT_PUBLIC_MAPBOX_TOKEN`) |
| **OpenAI API key** | Site analysis, chat, scenarios, brief (`OPENAI_API_KEY`) |
| **(Optional) Supabase** | Saved studies — not required for the demo |

Public OSM data uses the **Overpass API** and **Nominatim** (no key). Respect rate limits in production.

## Setup

```bash
npm install
cp .env.example .env.local
# Edit .env.local with your keys
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment variables

See `.env.example` for `NEXT_PUBLIC_MAPBOX_TOKEN`, `OPENAI_API_KEY`, and optional Supabase URLs.

## Scripts

- `npm run dev` — development server  
- `npm run build` — production build  
- `npm run lint` — ESLint  

## Architecture (high level)

- **`src/app`** — App Router pages and API routes  
- **`src/components`** — Layout, map, sidebars, UI  
- **`src/lib/geo`** — Turf helpers, indicator computation  
- **`src/lib/services`** — Overpass, geocoding, OpenAI pipelines  
- **`src/lib/types`** — Shared TypeScript types and Zod schemas  

## Product rules

- No fabricated official zoning or municipal regulations.  
- Provisional land-use language when data is OSM/heuristic-only.  
- Every insight can be tagged as observed, inferred, or speculative.

## License

Private / as specified by your organization.
