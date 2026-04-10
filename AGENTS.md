# AGENTS.md

This file provides guidance to AI coding agents when working with code in this repository.

## What This Is

JUMP//CUT is an Integrated Filmmaking Environment (IFE) — a web app where filmmakers create projects (from scripts or from scratch), generate visual assets via AI, and evolve those assets through a 10-agent synthetic evaluation swarm combined with neural brain-response prediction. The system implements Synthetic Character Evolution: characters are not designed once but iteratively evolved through generation, selection pressure, mutation, and survival.

The core loop: **Human Input → Generation → 10-Agent Evaluation + Neural Scoring → Human Decision → Adaptation → Next Generation**

See `JUMPCUT_SPEC.md` for the full product specification.

## Development Commands

```bash
npm run dev             # Start dev server (default localhost:3000)
PORT=4000 npm run dev   # Start on port 4000 (keeps 3000 free)
npm run build           # Production build (Vercel)
npm run lint            # ESLint
npx tsc --noEmit        # Type check — catches errors Vercel build will fail on
```

Database migrations are in `supabase/migrations/`. Apply via Supabase dashboard SQL editor.

TRIBE v2 neural service deployment:
```bash
export PATH="$HOME/Library/Python/3.9/bin:$PATH"
modal deploy services/tribe/app.py
```

## Environment Variables

Required in `.env` (and Vercel dashboard for production):
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase publishable key
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role key (server-only, bypasses RLS)
- `OPENAI_API_KEY` — GPT-4o for script extraction
- `ANTHROPIC_API_KEY` — Claude Sonnet for bible generation, evaluation swarm, adaptation, chat
- `FAL_API_KEY` — fal.ai for Nano Banana 2 image generation and editing
- `TRIBE_API_URL` — Modal endpoint for TRIBE v2 neural evaluation
- `NEXT_PUBLIC_TLDRAW_LICENSE_KEY` — Tldraw license (auto-detected by SDK)

## Tech Stack

- **Framework:** Next.js 14, TypeScript, App Router (catch-all route `[[...path]]`)
- **Canvas:** Tldraw v4 (`@tldraw/tldraw`) with 5 custom ShapeUtil classes, `hideUi` mode
- **Styling:** Tailwind CSS + CSS custom properties (`--jc-*` design tokens)
- **Database:** Supabase (Postgres) with RLS, Realtime enabled on key tables
- **Image generation:** fal.ai Nano Banana 2 — text-to-image (`fal-ai/nano-banana-2`) and image editing with references (`fal-ai/nano-banana-2/edit`)
- **LLMs:** OpenAI GPT-4o (extraction), Anthropic Claude Sonnet (bibles, 10-agent eval, adaptation, chat, chemistry)
- **Neural evaluation:** Meta TRIBE v2 via Modal (GPU serverless, fire-and-forget)
- **Icons:** Lucide React

## Code Architecture

### Source Layout

```
src/
├── app/
│   ├── [[...path]]/page.tsx          # Main page — catch-all route, event listeners, generation state
│   ├── layout.tsx                    # Root layout (dark theme, Inter font)
│   ├── globals.css                   # Design tokens (--jc-* custom properties)
│   └── api/
│       ├── ingest/route.ts           # POST: script/empty → GPT-4o extraction → Claude bibles → Supabase
│       ├── generate/route.ts         # POST: text-to-image or image-edit → Nano Banana 2 → Supabase
│       ├── evaluate/route.ts         # POST: 10-agent swarm (2 batches of 5) + TRIBE neural (fire-and-forget)
│       ├── adapt/route.ts            # POST: reads scores → suggests targeted visual mutations
│       ├── evolve/route.ts           # POST: autonomous evolution loop (runs in background)
│       ├── star/route.ts             # POST: toggle star + false negative detection + bible repair
│       ├── chat/route.ts             # POST: streaming Claude chat (in-context or project-wide)
│       ├── chemistry/route.ts        # POST: pairwise character chemistry scoring
│       ├── entities/route.ts         # POST: create character/location/scene manually
│       └── projects/
│           ├── route.ts              # GET: list projects
│           └── [id]/route.ts         # GET: full project data (entities + generations + reactions)
├── components/
│   ├── canvas/
│   │   ├── canvas-panel.tsx          # Wrapper with dynamic import (no SSR for tldraw)
│   │   ├── tldraw-canvas.tsx         # Main canvas: shape lifecycle, level switching, double-click, selection
│   │   └── shapes/
│   │       ├── types.ts              # Shape type constants (5 types) + prop interfaces
│   │       ├── shape-utils.tsx       # All ShapeUtil classes: Character, Location, Scene, Card, GenImage
│   │       └── node-component.tsx    # Shared renderer for entity nodes (Lucide icons, status borders)
│   ├── sidebar/node-browser.tsx      # Left panel: collapsible entity tree
│   ├── inspector/inspector-panel.tsx # Right panel: score card, agent details, neural, chat
│   ├── toolbar.tsx                   # Top bar: logo, breadcrumb, + New button, project dropdown
│   ├── script-dialog.tsx             # Modal: From Script / Empty Project creation
│   ├── generate-dialog.tsx           # Modal: edit prompt + reference image preview → fire-and-forget generation
│   ├── new-entity-dialog.tsx         # Modal: create Character/Location/Scene with optional bible gen
│   └── providers/canvas-provider.tsx # React context: navigation state + URL sync via pushState
├── lib/
│   ├── types.ts                      # TypeScript types matching Supabase schema
│   ├── ai/
│   │   ├── extract-script.ts         # GPT-4o chunked extraction with merge/dedup
│   │   ├── generate-bible.ts         # Claude bible generation (character + location)
│   │   └── eval-agents.ts            # 10 expert agent definitions + computeScoreCard()
│   ├── hooks/use-project.ts          # Client hook: fetches project + generations + reactions
│   ├── store/canvas-store.ts         # React context type for canvas navigation
│   └── supabase/
│       ├── client.ts                 # Browser Supabase client
│       └── server.ts                 # Server Supabase client (SSR-safe cookies)
└── services/
    └── tribe/app.py                  # Modal-deployed TRIBE v2 neural evaluation service (Python, GPU)
```

### Data Flow

1. **Project creation:** Script dialog → `POST /api/ingest` (script mode: GPT-4o extracts → Claude generates bibles; empty mode: creates blank project) → project ID stored in `localStorage`
2. **Manual entity creation:** + New button → `POST /api/entities` → optional Claude bible generation → canvas node created
3. **Canvas rendering:** `useProject` hook fetches all data → `TldrawCanvas` creates shapes from entities + canvas_nodes + generations + reactions
4. **Navigation:** Double-click node → `drillDown()` → URL updates via `pushState` → canvas clears and renders sub-level. Back/forward via `popstate`. Paste-a-URL resolves on mount.
5. **Generation:** Double-click Generate card → `GenerateDialog` (shows reference image thumbnails if conditioning) → dispatches `jc-generate-start` (placeholders) → closes → `POST /api/generate` → dispatches `jc-generate-complete` → canvas re-renders with images
6. **Evaluation:** Each generation triggers `POST /api/evaluate` → 10 agents in 2 batches of 5 → score card computed → TRIBE neural fires independently → results polled at 10s/25s/45s
7. **Evolution:** Click "↻ Evolve" → placeholders appear instantly → `POST /api/adapt` → mutation suggestions → `POST /api/generate` with adapted prompt → evaluate → cycle continues
8. **Autonomous mode:** `POST /api/evolve` → runs Generate→Evaluate→Score→Adapt→Select loop N iterations in background → progress in `evolution_runs` table
9. **Starring:** Click ☆ Star → `POST /api/star` → if scored below population average, triggers false negative detection → Claude Bible Repair Agent suggests updates → dialog shown

### Image Generation + Conditioning Chain

The `/api/generate` route uses two fal.ai endpoints depending on context:
- **Text-to-image** (`fal-ai/nano-banana-2`): Used for faces and locations (no reference images needed)
- **Image editing** (`fal-ai/nano-banana-2/edit`): Used when reference images are available — accepts `image_urls` array (up to 14 refs) for visual consistency

The conditioning chain passes actual images through generation:

```
Face (text-to-image, 1:1)
  ↓ starred face URL passed as reference
Body (image-edit, 1:1) — "full body portrait of this person"
  ↓ starred body URL passed as reference
Wardrobe (image-edit, 1:1) — "this person in full wardrobe"
  ↓ starred character bodies/faces collected
Scene (image-edit, 16:9) — characters + location combined
  ↑ starred location URL also passed as reference
Location (text-to-image, 16:9) — standalone
```

Reference image collection happens in `handleOpenGenerate` (page.tsx):
- `character_body`: finds starred `character_face` generation for same character
- `wardrobe`: finds starred `character_body` generation for same character
- `scene`: collects starred body (or face fallback) for each `scene.character_ids` + starred location visual for `scene.location_id`

The `GenerateDialog` shows reference image thumbnails so the user sees what's being conditioned on.

### Aspect Ratios

- **Characters** (face, body, wardrobe): 1:1 — portrait cards (220×280 on canvas)
- **Locations and scenes**: 16:9 — cinematic establishing shots (320×240 on canvas)

Configured in `/api/generate/route.ts` based on `objectType`. Canvas card dimensions adapt in `renderGenerationCanvas` (tldraw-canvas.tsx).

### Canvas Navigation Levels

The canvas uses a hierarchical drill-down model. `CanvasLevel` types:

- `project` — top level, shows all character/location/scene nodes
- `character` → sub-canvas with Bible, Face, Body, Wardrobe cards
- `location` → sub-canvas with Bible, Visual cards
- `location_visual` → generation canvas for location images
- `scene` → sub-canvas with Brief, Visual cards
- `scene_visual` → generation canvas for scene images
- `face` / `body` / `wardrobe` → generation canvases for character assets

Body is locked until a face is starred. Wardrobe is locked until a body is starred.

### Evaluation Swarm (10 Agents)

Defined in `src/lib/ai/eval-agents.ts`. Two vectors:

**Character Bible Match (5 agents):**
1. Narrative Function — story role legibility
2. Thematic Alignment — visual theme reinforcement
3. Psychological Continuity — internal state matches bible
4. Backstory Integrity — lived history readable from appearance
5. Transformation Signal — evidence of change over time

**Synthetic Audience (5 agents):**
6. Prestige Viewer — Chernobyl/Dark audience credibility
7. General Audience — immediate understandability
8. Memorability — will be remembered a week later
9. Emotional Response — triggers intended feeling
10. Archetype Alignment — fits or evolves the archetype

Aggregated into 5-dimension score card: Bible Match, Audience, Memorability, Archetype, Overall.

### Tldraw Integration (critical patterns)

- Tldraw loaded via `next/dynamic` with `ssr: false`
- 5 custom shape types: `jc-character`, `jc-location`, `jc-scene`, `jc-card`, `jc-gen-image`
- Default double-click text creation disabled via `options={{ createTextOnCanvasDoubleClick: false }}` AND overriding `selectIdleState.handleDoubleClickOnCanvas`
- Double-click on shapes handled via `editor.on("event", ...)` with debounce guard
- All callback functions stored in `useRef` to avoid stale closures in tldraw event handlers
- Canvas level changes: `clearCanvas()` (uses `editor.run()` for atomic deselect+delete) → render appropriate shapes
- Generation canvas re-renders via signature-based change detection (IDs + URLs + reaction count), not just array length
- `editorReady` state flag ensures shapes aren't created before tldraw mounts
- License key auto-detected from `NEXT_PUBLIC_TLDRAW_LICENSE_KEY` env var

### Event-Based Communication

The app uses `window.dispatchEvent`/`addEventListener` for cross-component communication to avoid stale closure issues with tldraw:
- `jc-generate-start` — placeholders created, dialog closes
- `jc-generate-complete` — real images arrive, replace placeholders
- `jc-evolve` — triggers adapt → generate → evaluate cycle (placeholders shown instantly before adapt call)
- `jc-drill` — URL resolution dispatches navigation events on mount

## Data Model (Supabase)

Core tables: `projects`, `characters`, `locations`, `scenes`, `generations`, `audience_reactions`, `ladder_state`, `canvas_nodes`, `evolution_runs`.

Migrations: `00001_initial_schema.sql`, `00002_add_neural_segment.sql`, `00003_expanded_eval_segments.sql`, `00004_evolution_runs.sql`.

Key relationships:
- `generations.object_id` → polymorphic FK to character/location/scene
- `generations.object_type` — `character_face`, `character_body`, `location`, `scene`, `wardrobe`
- `generations.conditioning_refs` — array of parent generation IDs (lineage tracking)
- `audience_reactions.segment` — one of 10 agent IDs + `score_card` + `neural` + 4 legacy
- `audience_reactions.reaction` — JSONB: new format has `score`, `rationale`, `key_observation`; score_card has `bible_match`, `audience`, `memorability`, `archetype`, `overall`

## Important Rules

### AI Client Initialization
All AI clients (OpenAI, Anthropic) MUST be lazy-initialized, not at module level. Vercel's build runs route handlers to collect page data — module-level `new OpenAI()` or `new Anthropic()` will crash the build if env vars aren't set.
```typescript
// WRONG: const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
// RIGHT: const getOpenAI = () => new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
```

### Supabase Fetch Caching
Next.js aggressively caches `fetch` calls including Supabase's internal HTTP requests. All API routes that read from Supabase MUST use:
```typescript
export const dynamic = "force-dynamic";
// AND in createClient:
{ global: { fetch: (url, init) => fetch(url, { ...init, cache: "no-store" }) } }
```
Without this, queries return stale data (generations and reactions won't appear).

### Casting Direction Constraints
The Claude casting director in `/api/generate` MUST NOT change explicitly stated physical traits (ethnicity, race, gender, age). It may only vary interpretation within those bounds (expression, energy, grooming, hairstyle, posture). Casting directions are only generated for `character_face` and `character_body` types.

### Generations Are Append-Only
Nothing is ever deleted from the canvas. All generations and all reactions persist as creative record. The `starred` flag is the selection mechanism.

### Conditioning Flows Downward via Image References
Starred face → passed as `image_urls` to body generation → starred body passed to wardrobe → starred characters + location passed to scene. The `/api/generate` route automatically switches to `fal-ai/nano-banana-2/edit` when `imageUrls` is non-empty. Breaking a star affects visual consistency of everything downstream.

### Supabase `.in()` Limitations
Supabase `.in()` queries can be unreliable with many UUIDs via PostgREST. Prefer fetching broader datasets and filtering in JavaScript when dealing with large ID lists.

## Design System

- **Dark always.** Background `#111110`, surface `#1A1917`, raised `#222220`
- **Red is reserved** for decisions made: stars, active selections, chosen assets. Accent red `#CC3300`. Never decorative.
- **Flat surfaces.** No gradients, no shadows. Depth via border weight and background shade.
- **Typography:** Inter/system-ui for UI, JetBrains Mono for prompts/logs. Scale: micro 9px → heading 22px.
- **Node states:** empty (dashed) → generating (pulsing) → generated (solid) → reacted (red-muted) → starred (red border + ★)
- **Score card on canvas:** BIBLE/AUDN/MEMO/ARCH badges with green eye (pass) or red eye-off (fail) + OVERALL score overlay
- **Neural card:** Purple theme (`rgba(88, 28, 135, 0.15)`) with brain emoji
- All design tokens are CSS custom properties prefixed `--jc-*` in `globals.css`, mapped to Tailwind via `tailwind.config.ts`.

## Build Status

### Complete
- Phase 1: Core Canvas + Script Ingestion ✅
- Phase 2: Image Generation + Audience Engine ✅
- Synthetic Character Evolution: 10-agent swarm, adaptation, autonomous evolution, false negative detection, ensemble chemistry ✅
- Empty project creation + manual entity creation ✅
- URL routing with back/forward + paste-a-URL ✅
- TRIBE v2 neural evaluation via Modal ✅
- Location and scene generation canvases with 16:9 aspect ratio ✅
- Image conditioning chain: face→body→wardrobe→scene via Nano Banana 2 edit endpoint ✅

### Not Yet Built
- Multiplayer (Liveblocks/Yjs)
- RAG chat (vector search across project)
- Ladder state management + compulsion curves
- Seedance video generation
- Bible editor (inline editing in inspector)
- Morning review UI for evolution runs
- Gemini video evaluation
