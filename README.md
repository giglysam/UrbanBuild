# UrbanBuild — Beirut Urban Planning MVP

AI-assisted urban analysis for planners and architects. Pilot city: **Beirut**. The app combines OpenStreetMap context, heuristic indicators, and OpenAI-generated insights with explicit confidence labels (observed / inferred / speculative).

## What you need

| Resource | Purpose |
|----------|---------|
| **Node.js 20+** | Local dev |
| **Mapbox access token** | Map GL + optional geocoding (`NEXT_PUBLIC_MAPBOX_TOKEN`) |
| **OpenAI API key** | Site analysis, scenarios, brief (`OPENAI_API_KEY`) |
| **Created chat API** | Planning Q&A in the Chat tab (default: `https://chat-z.created.app/api/chat`; override with `CREATED_CHAT_API_URL`) |
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

## Deploy on Vercel

1. Import the GitHub repo in [Vercel](https://vercel.com/new) (framework: **Next.js** is auto-detected).
2. Add environment variables in the project settings (same names as `.env.example`):
   - **`NEXT_PUBLIC_MAPBOX_TOKEN`** — required for the map (public).
   - **`OPENAI_API_KEY`** — server-only; needed for analysis, scenarios, and planning brief.
   - **`CREATED_CHAT_API_URL`** — optional; defaults to the Created chat endpoint for the Chat tab.
3. **Build:** Vercel runs `npm run build`, which uses **webpack** (`next build --webpack`) so **Mapbox GL** bundles correctly.
4. **Node:** The app targets **Node 20+** (`engines` in `package.json`). Vercel’s default 20.x is fine.
5. **Function duration:** API routes set `maxDuration` up to **60s** for Overpass + AI. On the **Hobby** plan, serverless functions are capped at **10s**, so heavy “Run AI analysis” or slow Overpass calls may time out. Use **Vercel Pro** (or reduce study radius) for reliable production use.

External services (Overpass, Nominatim, Mapbox, OpenAI, Created chat) are called from **serverless routes** only — no extra CORS configuration on Vercel.

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
