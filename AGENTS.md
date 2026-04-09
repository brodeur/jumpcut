# AGENTS.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## What This Is

JUMP//CUT is an Integrated Filmmaking Environment (IFE) — a web app where filmmakers paste a script, the system extracts structure (characters, locations, scenes), generates visual assets via AI, and runs those assets through a synthetic audience engine that provides segment-level feedback before anything is produced for real.

The core loop at every level: **Human Input → Generation → Synthetic Audience Feedback → Human Decision**

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
- **Canvas:** Tldraw (custom shapes for character/location/scene nodes), Yjs CRDT
- **Multiplayer:** Liveblocks (Tldraw integration, presence, real-time sync)
- **Styling:** Tailwind CSS + CSS custom properties for design tokens
- **Database:** Supabase (Postgres) — project data, bibles, reactions, auth, Realtime
- **Auth:** Supabase Auth
- **Background jobs:** Inngest (async audience fan-out, retries, Vercel-native)
- **Image generation:** fal.ai (Flux)
- **Video generation:** Seedance API
- **LLMs:** GPT-4o (script extraction), Claude Sonnet (bible generation, persona reasoning), Gemini 2.0 Pro (native video evaluation)
- **Asset storage:** Cloudflare R2
- **Vector DB:** Pinecone or Weaviate (project-wide RAG chat)
- **Desktop (Phase 2+):** Tauri (Rust)

## Architecture

### Canvas Hierarchy (6 levels, fractal)

The entire app is an infinite canvas with drill-down navigation. Double-click any node to enter its sub-canvas. Escape navigates up. Every level follows the same generate → react → star pattern.

- **Level 0 — Project Canvas:** Top-level nodes for characters, locations, scenes, sequences
- **Level 1 — Character Canvas:** Bible card → Face card → Body card (locked until face starred) → Wardrobe card (locked until body starred)
- **Level 1a/1b/1c — Face / Body / Wardrobe generation canvases:** Generate 4 variants, audience reacts async, user stars one. Starred asset becomes conditioning reference for all downstream generation.
- **Level 2 — Location Canvas:** Bible + visual generation (same star pattern)
- **Level 3 — Scene Canvas:** Brief + visual generation conditioned by starred characters + location + wardrobe
- **Level 4 — Sequence Canvas:** Ordered scenes, compulsion curve visualization
- **Level 5 — First 10 Minutes Canvas:** Full evaluation via Gemini video ingestion

### Star Mechanic (critical concept)

Starring an asset is a **propagation decision**, not just a favorite. A starred face becomes the conditioning reference for every subsequent generation involving that character. Unstarring requires confirmation because it affects downstream conditioning. Only one asset can be starred per slot.

### Synthetic Audience Engine

Four behavioral segments evaluate every generated asset independently and async:
- **Converter** — doesn't normally watch this genre (tests crossover appeal)
- **Evangelist** — measures word-of-mouth potential
- **Skeptic** — high resistance, catches problems (tuned against LLM agreeableness)
- **Genre Native** — validates genre conventions

Each evaluation has 3 layers: reactive (unprimed), structured probes (trust, distinctiveness, compulsion score, etc.), and behavioral prediction (would keep watching, would share).

Reactions are processed via **Inngest** fan-out: one generation triggers 4 parallel persona evaluations via Claude, results saved to Supabase, clients notified via Supabase Realtime.

### Ladder State

A persistent `ladder_state` object tracks narrative engagement metrics across the hierarchy: active promises, paid costs, compulsion history, variable reward log, per-segment emotional state. Every evaluation call receives and updates this state. The compulsion curve should be a sawtooth trending upward.

### Asset Pipeline

- Assets stored once in Cloudflare R2, referenced everywhere by URL
- Project file format is `.jcp` (JSON manifest, no binary assets)
- Starred assets sync locally; rejected generations stay cloud-only
- NLE export produces XML/EDL compatible with DaVinci Resolve and Premiere Pro, with audience reactions as timeline markers

## Data Model (Supabase)

Core tables: `projects`, `characters`, `locations`, `scenes`, `generations`, `audience_reactions`, `ladder_state`, `canvas_nodes`. See `JUMPCUT_SPEC.md` §11 for full schema.

Key relationships:
- `generations.object_id` → polymorphic FK to character/location/scene
- `generations.object_type` — one of: `character_face`, `character_body`, `location`, `scene`, `wardrobe`
- `generations.conditioning_refs` — array of generation IDs used as inputs (starred assets)
- `audience_reactions.segment` — one of: `converter`, `evangelist`, `skeptic`, `genre_native`
- `audience_reactions.reaction` — JSONB with scores (0-10) for trust, distinctiveness, compulsion, anticipation, plus text fields

## UI Layout

Three-column, always dark, no light mode:
- **Left (200px):** Node browser — hierarchical tree with status dots
- **Center (flex):** Infinite canvas (Tldraw) — pan/zoom, click to inspect, double-click to drill down
- **Right (260px):** Inspector (tab 1: selected node details + audience reactions) + Chat (tab 2: in-context or project-wide RAG)

Toolbar: logo left, breadcrumb center (clickable hierarchy), zoom controls right.

## Design System

- **Dark always.** Background `#111110`, surface `#1A1917`, raised `#222220`
- **Red is reserved** for decisions made: stars, active selections, chosen assets. Accent red `#CC3300`. Never decorative.
- **Flat surfaces.** No gradients, no shadows. Depth via border weight and background shade.
- **Typography:** Inter/system-ui for UI, JetBrains Mono for prompts/logs, geometric sans for display
- **Node states:** empty (dashed border) → generating (pulsing) → generated (solid) → audience reacted (red-muted tint) → starred (red border + ★)

Design tokens are CSS custom properties prefixed `--jc-*`. See `JUMPCUT_SPEC.md` §2 for the full token table.

## Build Phases

The spec defines 5 phases (see `JUMPCUT_SPEC.md` §12):
1. **Core Canvas + Script Ingestion** (weeks 1-4)
2. **Image Generation + Audience Engine** (weeks 5-8)
3. **Multiplayer + Full Hierarchy** (weeks 9-12)
4. **Ladder Testing + Analytics** (weeks 13-16)
5. **Video Generation + Local Bridge** (weeks 17-20)

## Key Patterns

- **Every canvas level follows the same UX pattern:** generate variants → async audience reaction → star one → starred asset conditions downstream
- **Audience reactions are always async.** All 4 segments must complete before surfacing. The delta between segments is the insight.
- **Generations are append-only.** Nothing is deleted from the canvas. All generations and reactions persist as creative record.
- **Conditioning flows downward:** starred face → body generation → wardrobe generation → scene generation. Breaking a star affects everything below it.
- **Inngest for all async work:** audience evaluation fan-out, generation jobs, ladder state updates
- **Supabase Realtime** for pushing reaction completions and node status updates to the client
