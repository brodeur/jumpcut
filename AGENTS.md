# AGENTS.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## What This Is

JUMP//CUT is an Integrated Filmmaking Environment (IFE) — a web app where filmmakers paste a script, the system extracts structure (characters, locations, scenes), generates visual assets via AI, and runs those assets through a synthetic audience engine that provides segment-level feedback before anything is produced for real.

The core loop at every level: **Human Input → Generation → Synthetic Audience Feedback → Human Decision**

See `JUMPCUT_SPEC.md` for the full product specification.

## Development Commands

```bash
npm run dev      # Start dev server (localhost:3000)
npm run build    # Production build
npm run lint     # ESLint
```

Required env vars in `.env`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `FAL_API_KEY`.

Database migrations are in `supabase/migrations/`. Apply them via the Supabase dashboard SQL editor or `supabase db push`.

## Tech Stack

- **Framework:** Next.js 14, TypeScript, App Router
- **Canvas:** Tldraw v4 (`@tldraw/tldraw`) with custom shape utils, `hideUi` mode
- **Styling:** Tailwind CSS + CSS custom properties (`--jc-*` design tokens)
- **Database:** Supabase (Postgres) — project data, bibles, reactions, auth, Realtime
- **Image generation:** fal.ai Flux (`@fal-ai/client`)
- **LLMs:** OpenAI GPT-4o (script extraction), Anthropic Claude Sonnet (bible generation, persona reasoning, chat)
- **Auth:** Supabase Auth (email/password, simplified for now)

Not yet integrated (planned for later phases): Liveblocks/Yjs multiplayer, Inngest background jobs, Cloudflare R2 storage, Seedance video generation, Gemini video evaluation, Pinecone/Weaviate RAG.

## Code Architecture

### Source Layout

```
src/
├── app/                          # Next.js App Router
│   ├── page.tsx                  # Main page — orchestrates all panels, dialogs, project state
│   ├── layout.tsx                # Root layout (dark theme, Inter font)
│   └── api/
│       ├── ingest/route.ts       # POST: script text → GPT-4o extraction → Claude bibles → Supabase
│       ├── generate/route.ts     # POST: prompt → fal.ai Flux (4 images) → generations table
│       ├── evaluate/route.ts     # POST: generationId → 4 parallel Claude persona evaluations
│       ├── star/route.ts         # POST: toggle starred, ensures one-per-slot
│       ├── chat/route.ts         # POST: streaming Claude chat (in-context or project-wide)
│       └── projects/
│           ├── route.ts          # GET: list projects (most recent first)
│           └── [id]/route.ts     # GET: full project data (entities + canvas nodes)
├── components/
│   ├── canvas/
│   │   ├── canvas-panel.tsx      # Wrapper with dynamic import (no SSR for tldraw)
│   │   ├── tldraw-canvas.tsx     # Main canvas: shape creation, level switching, double-click handling
│   │   └── shapes/
│   │       ├── types.ts          # Shape type constants + prop interfaces
│   │       ├── shape-utils.tsx   # All ShapeUtil classes (Character, Location, Scene, Card, GenImage)
│   │       └── node-component.tsx # Shared visual renderer for entity nodes
│   ├── sidebar/node-browser.tsx  # Left panel: hierarchical tree with status dots
│   ├── inspector/inspector-panel.tsx # Right panel: bible display + streaming chat
│   ├── toolbar.tsx               # Top bar: logo, breadcrumb, zoom controls
│   ├── script-dialog.tsx         # Modal: paste script → ingest
│   ├── generate-dialog.tsx       # Modal: edit prompt → generate 4 variants + trigger evaluation
│   └── providers/canvas-provider.tsx # React context for canvas navigation state
├── lib/
│   ├── types.ts                  # TypeScript types matching the Supabase schema
│   ├── ai/
│   │   ├── extract-script.ts     # GPT-4o structured extraction (characters, locations, scenes)
│   │   └── generate-bible.ts     # Claude bible generation (character + location)
│   ├── hooks/use-project.ts      # Client hook: fetch project data from API
│   ├── store/canvas-store.ts     # React context + types for canvas navigation (level, breadcrumb, selection)
│   └── supabase/
│       ├── client.ts             # Browser Supabase client
│       └── server.ts             # Server Supabase client (SSR-safe cookies)
```

### Data Flow

1. **Script ingestion:** `page.tsx` → `ScriptDialog` → `POST /api/ingest` → GPT-4o extracts entities → Claude generates bibles → all saved to Supabase → project ID stored in `localStorage`
2. **Canvas rendering:** `page.tsx` fetches project via `useProject` hook → passes data to `CanvasPanel` → `TldrawCanvas` creates tldraw shapes from entities + canvas_nodes positions
3. **Navigation:** Double-click a node → `drillDown()` updates `CanvasContext` → `TldrawCanvas` clears shapes and renders sub-canvas (e.g., character → Bible/Face/Body/Wardrobe cards)
4. **Generation:** Double-click Face card → `GenerateDialog` → `POST /api/generate` (fal.ai) → `POST /api/evaluate` fires 4 Claude evaluations async
5. **Inspector:** Click any shape → `selectNode()` → `InspectorPanel` looks up entity by ID → renders bible fields or reaction data

### Tldraw Integration (important patterns)

- Tldraw is loaded via `next/dynamic` with `ssr: false` — it cannot render server-side
- Custom shapes are defined as `ShapeUtil` classes in `shapes/shape-utils.tsx`, registered via the `shapeUtils` prop
- Default double-click text creation is disabled via `options={{ createTextOnCanvasDoubleClick: false }}` and overriding `selectIdleState.handleDoubleClickOnCanvas`
- Double-click on shapes is handled via `editor.on("event", ...)` filtering for `type === "click" && name === "double_click" && target === "shape"`
- Callback refs (`useRef`) are used to avoid stale closures in the tldraw event handlers
- Canvas level changes trigger `clearCanvas()` → re-render appropriate shapes

### Canvas Navigation State

`CanvasContext` (in `canvas-store.ts`) manages:
- `currentLevel` — which canvas level is displayed (`project`, `character`, `location`, etc.)
- `breadcrumb` — stack of `{ label, level, objectId }` for the toolbar breadcrumb
- `selectedNodeId` — currently selected entity ID (drives the inspector)
- `drillDown(level, objectId, label)` — push to breadcrumb, swap canvas
- `navigateUp()` — pop breadcrumb, swap canvas back
- `navigateTo(index)` — jump to a specific breadcrumb position

## Data Model (Supabase)

Core tables: `projects`, `characters`, `locations`, `scenes`, `generations`, `audience_reactions`, `ladder_state`, `canvas_nodes`. Full schema in `supabase/migrations/00001_initial_schema.sql`.

Key relationships:
- `generations.object_id` → polymorphic FK to character/location/scene
- `generations.object_type` — one of: `character_face`, `character_body`, `location`, `scene`, `wardrobe`
- `generations.conditioning_refs` — array of generation IDs used as inputs (starred assets)
- `audience_reactions.segment` — one of: `converter`, `evangelist`, `skeptic`, `genre_native`
- `audience_reactions.reaction` — JSONB with scores (0-10) for trust, distinctiveness, compulsion, anticipation, plus text fields
- Only one generation can be `starred = true` per `object_id + object_type` combination

All tables have RLS enabled. Current policies use simple project ownership (`created_by = auth.uid()`). Role-based access (Director, Writer, etc.) is planned for Phase 3.

## Design System

- **Dark always.** Background `#111110`, surface `#1A1917`, raised `#222220`
- **Red is reserved** for decisions made: stars, active selections, chosen assets. Accent red `#CC3300`. Never decorative.
- **Flat surfaces.** No gradients, no shadows. Depth via border weight and background shade.
- **Typography:** Inter/system-ui for UI, JetBrains Mono for prompts/logs, geometric sans for display. Scale defined in `tailwind.config.ts` (micro 9px → heading 22px).
- **Node states:** empty (dashed border) → generating (pulsing) → generated (solid) → audience reacted (red-muted tint) → starred (red border + ★)
- All design tokens are CSS custom properties prefixed `--jc-*`, defined in `globals.css` and mapped to Tailwind classes via `tailwind.config.ts` (e.g., `bg-jc-surface`, `text-jc-red`).

## Key Patterns

- **Every canvas level follows the same UX pattern:** generate variants → async audience reaction → star one → starred asset conditions downstream
- **Audience reactions are always async.** All 4 segments must complete before surfacing. The delta between segments is the insight.
- **Generations are append-only.** Nothing is deleted from the canvas. All generations and reactions persist as creative record.
- **Conditioning flows downward:** starred face → body generation → wardrobe generation → scene generation. Breaking a star affects everything below it.
- **All API routes use the Supabase service role key** (`SUPABASE_SERVICE_ROLE_KEY`) for server-side operations, bypassing RLS. Client-side uses the anon key.
- **Project persistence:** The active project ID is stored in `localStorage` (`jc_project_id`) so the app survives page reloads.

## Build Phases

The spec defines 5 phases (see `JUMPCUT_SPEC.md` §12):
1. **Core Canvas + Script Ingestion** — ✅ Complete
2. **Image Generation + Audience Engine** — In progress (generation API + evaluation API built, face canvas UX wired)
3. **Multiplayer + Full Hierarchy** (Liveblocks, body/wardrobe canvases, RAG chat)
4. **Ladder Testing + Analytics** (compulsion curves, upstream flags)
5. **Video Generation + Local Bridge** (Seedance, Gemini, Tauri)
