# JUMP//CUT — Product Specification
**Version 0.1 — Working Document**

---

## Table of Contents

1. [Vision](#1-vision)
2. [Brand & Design System](#2-brand--design-system)
3. [Core Architecture — The IFE Loop](#3-core-architecture--the-ife-loop)
4. [The Fractal Dopaminergic Ladder](#4-the-fractal-dopaminergic-ladder)
5. [Synthetic Audience Engine](#5-synthetic-audience-engine)
6. [Interface Specification](#6-interface-specification)
7. [Canvas Hierarchy & Feature Spec](#7-canvas-hierarchy--feature-spec)
8. [Asset Pipeline](#8-asset-pipeline)
9. [Collaboration](#9-collaboration)
10. [Technical Stack](#10-technical-stack)
11. [Data Architecture](#11-data-architecture)
12. [Build Plan](#12-build-plan)

---

## 1. Vision

JUMP//CUT is an Integrated Filmmaking Environment (IFE) designed to produce blockbuster-impact films and shows. It replaces the traditional linear development pipeline with a recursive creative loop applied at every level of story structure — from a single character's face to the first ten minutes of a finished cut.

**The core insight:** most creative decisions are made too late, when they are too expensive to change. JUMP//CUT moves audience validation to the moment of generation — before the decision costs anything.

**The primary loop, applied at every level:**

```
Human Input → Generation → Synthetic Audience Feedback → Human Decision
```

This loop runs at six levels of resolution, each nested inside the one above:

| Level | Asset | Primary Signal |
|---|---|---|
| 1 | Character | Identification, trust, distinctiveness |
| 2 | Character + Location | World coherence, aesthetic pull |
| 3 | Character + Location + Scene | Emotional engagement, tension |
| 4 | Scene + Sequence | Narrative momentum, escalation |
| 5 | First 10 Minutes | Hook, intent to continue |
| 6 | Full Episode | Ladder arc, compulsion curve |

Decisions made at lower levels propagate upward as conditioning inputs. A starred face becomes the reference for every scene that character appears in. A locked location visual conditions every subsequent generation in that space. The hierarchy is not just organizational — it is generative.

---

## 2. Brand & Design System

### Identity

- **Name:** JUMP//CUT
- **Logotype:** Geometric sans-serif. The `//` is rendered in red; `JUMP` and `CUT` are white on dark.
- **Tagline (internal):** *Blockbuster by design.*

### Color Palette

| Role | Token | Hex |
|---|---|---|
| Background primary | `--jc-bg` | `#111110` |
| Background surface | `--jc-surface` | `#1A1917` |
| Background raised | `--jc-raised` | `#222220` |
| Border default | `--jc-border` | `rgba(255,255,255,0.08)` |
| Border emphasis | `--jc-border-em` | `rgba(255,255,255,0.16)` |
| Text primary | `--jc-text` | `#F0EDE8` |
| Text secondary | `--jc-text-2` | `rgba(240,237,232,0.55)` |
| Text tertiary | `--jc-text-3` | `rgba(240,237,232,0.30)` |
| **Accent — red** | `--jc-red` | `#CC3300` |
| Accent red hover | `--jc-red-hover` | `#E03820` |
| Accent red muted | `--jc-red-muted` | `rgba(204,51,0,0.15)` |
| Starred / chosen | `--jc-star` | `#CC3300` |
| Success / confirmed | `--jc-confirm` | `#2A6B3C` |
| Warning | `--jc-warn` | `#8A6200` |

### Typography

- **Display / Logo:** Geometric sans (Futura PT or similar). Used for the wordmark and level labels.
- **UI:** Inter or system-ui. Labels, metadata, navigation.
- **Code / Monospace:** JetBrains Mono. Prompt windows, bible output, generation logs.
- **Scale:** 9px (micro labels) → 11px (metadata) → 12px (body) → 13px (UI default) → 15px (names) → 22px (canvas level headings)

### Node Status Colors

| State | Indicator |
|---|---|
| Empty | Dashed border, `--jc-border` |
| Generating | Pulsing `--jc-text-3` border |
| Generated | Solid `--jc-border-em` |
| Audience reacted | `--jc-red-muted` border tint |
| Starred / Chosen | `--jc-red` border + `★` mark |

### Design Principles

- **Dark always.** No light mode.
- **Flat surfaces.** No gradients. Depth through border weight and background shade, not shadow.
- **Red is reserved.** Red means decision made. Stars, active selections, chosen assets. Not decorative.
- **Information density over chrome.** This is a professional tool. Every pixel should carry signal.
- **Spatial consistency.** The canvas metaphor is the product. Every level looks and feels like the same tool.

---

## 3. Core Architecture — The IFE Loop

### The Loop

At every level of the hierarchy, the same loop runs:

```
1. STIMULUS
   Asset created or described at this level.
   Representation varies by level: description → image → animatic → video.

2. PRESENTATION
   Asset shown to each synthetic audience segment independently.
   Segments do not see each other's reactions.

3. REACTION CAPTURE
   Unprimed first response ("what do you feel — don't think, respond").
   Structured probes specific to this level.
   Behavioral prediction ("would you keep watching?").

4. AGGREGATION
   Consensus: where all segments agree → validated signal.
   Divergence: where segments differ → creative decision territory.
   Flags: problems that need to propagate up the hierarchy.

5. HUMAN DECISION
   Creator reviews reactions in the inspector panel.
   Stars an asset (locks it, propagates downstream as conditioning reference).
   Or remixes, regenerates, or discards.
```

### Ladder State

The loop maintains a persistent `ladder_state` object across the hierarchy. This tracks:

- Active promises (what the audience is waiting for, and how strongly)
- Paid costs (what the characters have sacrificed to get here)
- Compulsion history (score at each scene break, trending up = working)
- Variable reward log (which beats over/under delivered)
- Per-segment emotional state (engagement, dropout risk, share intent)

Every evaluation call receives the current ladder state and updates it. This is what makes the fractal ladder testable — you can see at any level whether the micro-ladder is supporting or undermining the macro.

### Asset Representation by Level

Since generative video is not always available, assets are represented in the most capable format available at each level:

| Level | MVP Representation | Full Representation |
|---|---|---|
| Character | Text description + generated still | Character likeness video clip |
| Location | Text + generated still | Environment video clip |
| Scene | Beat sheet + generated still | Seedance multi-shot clip |
| Sequence | Scene summaries + rough assembly | Assembled video (rough cut) |
| First 10 min | Full transcript + pacing metadata | Actual video (Gemini ingestion) |

---

## 4. The Fractal Dopaminergic Ladder

### What the Ladder Is

The dopaminergic ladder is the structural principle that governs blockbuster engagement. It operates at every level of resolution simultaneously — a scene has its own ladder, a sequence has one, an episode has one — and they nest fractally.

The ladder is not about enjoyment. It is about compulsion. The brain releases dopamine in the **anticipation phase**, not just on reward. This means the ladder is a ladder of **promises made and kept at escalating stakes**.

Four mechanisms drive the ladder:

1. **Anticipation** — the gap between what's promised and what's delivered
2. **Surprise within expectation** — genre contract honored, specific form unexpected
3. **Variable reward** — irregular payoff schedule creates compulsion
4. **Escalating cost** — each rung must feel like it cost something irreversible to reach

### Ladder Probe Set

Run at every loop iteration:

| Probe | Question | Extract |
|---|---|---|
| `anticipation_load` | What do you think happens next? How much do you want to find out? | prediction, urgency_score (0–10) |
| `payoff_delta` | What did you expect? What did you get? | expected, received, delta_sentiment |
| `compulsion_score` | If this stopped right now, how urgently would you need to know what comes next? | score (0–10), reason |
| `cost_felt` | What did the character lose or risk to get here? | cost_description, felt_earned (bool) |
| `evangelist_moment` | Is there a specific moment you'd describe to someone to get them to watch? | moment, description, enthusiasm_score |
| `re_entry_desire` | After a break, how long could you wait before continuing? | urgency, max_wait |

### Compulsion Curve

The compulsion score is measured at the end of every unit at every level. Graphed over an episode, the target shape is a **sawtooth that trends upward** — dips at act breaks that recover higher, never plateauing, never collapsing after a peak.

A flat curve = the ladder isn't climbing.
A curve that peaks and collapses = false rung — the payoff wasn't earned.
A curve that trends down in the second half = the back end isn't working.

### Fractal Integrity Check

The most powerful test the system runs: do micro-ladder scores predict macro-ladder performance?

If a scene has a high compulsion score but the sequence it's in has a low one, there is a structural problem — a well-crafted scene is being undermined by its container. The IFE surfaces these as **upstream flags** in the inspector.

---

## 5. Synthetic Audience Engine

### Segment Architecture

Segments operate on two axes:

**Behavioral Role** (what function they serve in the feedback loop):

| Role | Function | Why They Matter |
|---|---|---|
| **Converter** | Doesn't normally watch this genre | Blockbusters are made on crossover. If they don't engage, you have a ceiling. |
| **Evangelist** | Will tell 10 people if something hits | Enthusiasm score matters more than enjoyment score. Measures word-of-mouth potential. |
| **Skeptic** | High resistance, looks for reasons to disengage | Catches false rungs, logic failures, pacing problems. |
| **Genre Native** | Knows the conventions deeply | Validates genre contract. Catches derivative choices. |

**Demographic Profile** (which market segment they represent):

For blockbuster calibration, the highest-value demographic segments are:
- Female 25–40, mainstream viewer (Converter) — drives repeat viewership and word of mouth
- Male 35–50, casual/lapsed viewer (Converter) — theater-going, brings others
- Male 18–35, genre hardcore (Evangelist) — the floor, not the ceiling
- Female 18–28, streaming native (Evangelist) — platform algorithm driver

The behavioral role determines what function the feedback serves. The demographic profile determines which market segment it represents. Both are required.

### Persona Schema

```json
{
  "segment": "converter",
  "demographic": {
    "gender": "female",
    "age_range": "25-40",
    "genre_relationship": "watches 4 films/year, mostly drama and thriller",
    "platform_behavior": "Netflix default, rarely theaters",
    "social_viewing": "watches with partner, discusses after"
  },
  "psychology": {
    "values": ["authenticity", "emotional truth", "character over spectacle"],
    "emotional_defaults": "skepticism before warmth",
    "tolerance_for_ambiguity": 0.4
  },
  "ladder_calibration": {
    "rung_entry_threshold": 0.6,
    "cost_sensitivity": "high — needs emotional cost, not action cost",
    "evangelist_trigger": "character moment, not spectacle"
  }
}
```

### Evaluation Call Structure

Each evaluation call has three layers:

```
LAYER 1 — REACTIVE (unprimed)
Immediate, unfiltered reaction. No analysis. What's the first thing that comes up?

LAYER 2 — STRUCTURED PROBES (level-specific)
Anticipation load, payoff delta, compulsion score, cost felt.
Probe set varies by IFE level.

LAYER 3 — BEHAVIORAL PREDICTION
Would you keep watching?
Would you tell someone about this specific moment?
How long could you wait before continuing?
```

### Async Feedback Model

- Audience reactions are async. The creator does not wait.
- All segments must complete before reactions surface. The delta between segments is the insight — you need all of them to see it.
- On completion: badge on affected node updates; notification in global feed; inspector updates live if that asset is selected.
- Reactions never replace the asset. All generations and all reactions persist on the canvas as creative record.

### Validation

- Maintain a holdout set of real audience data for calibration.
- Target: synthetic reactions align with real audience responses at ≥85% on directional metrics.
- Log systematic gaps. These become training signal for persona refinement.

### The Agreeable Bot Problem

LLMs tend toward positive, socially acceptable responses. This must be actively countered:

- Personas are explicitly prompted for dissent, confusion, boredom, and disengagement.
- The Skeptic persona is tuned with high resistance and low social agreeableness.
- Reaction prompts include: *"Negative reactions are as valuable as positive ones. Be specific, not generic."*
- Validation against real holdout data catches systematic positivity bias and informs persona correction.

---

## 6. Interface Specification

### Layout

Three-column layout, full-screen, always dark.

```
┌──────────────┬─────────────────────────────────┬──────────────┐
│  NODE        │                                 │  INSPECTOR   │
│  BROWSER     │     INFINITE CANVAS             │  ──────────  │
│              │                                 │  CHAT        │
│  Characters  │   [node] [node]                 │              │
│  Locations   │                                 │  Tab 1:      │
│  Scenes      │       [node]  [node]            │  Inspector   │
│  Sequences   │                                 │  Tab 2:      │
│              │                                 │  Chat        │
└──────────────┴─────────────────────────────────┴──────────────┘
```

- **Left column (200px):** Node browser. Hierarchical tree of all objects in the project. Status dots. Click to select and populate inspector. Double-click to navigate canvas to that object.
- **Center (flex):** Infinite canvas. Drag to pan, scroll to zoom. Every object is a summary node. Click → inspector. Double-click → opens that object's sub-canvas.
- **Right column (260px):** Inspector + Chat in two tabs.

### Toolbar

Top bar across full width:

```
[JUMP//CUT]  [Breadcrumb: Project > Elena Vasquez > Face]  [− 100% +]
```

- Logo left
- Breadcrumb center — each crumb is clickable, navigates up the hierarchy
- Zoom controls right

### Breadcrumb Navigation

```
UNTITLED PROJECT › Elena Vasquez › Face
```

Each segment is clickable. Clicking navigates up to that level without losing canvas state at that level.

Escape key navigates up one level. If at top level, Escape deselects.

### Node States (visual)

| State | Visual |
|---|---|
| Empty | Dashed red border, no preview image |
| Generating | Animated border pulse |
| Generated | Solid border, image preview present |
| Audience reacted | Red-muted border tint, reaction badge |
| Starred | Red border, `★` in header, locked |

### Inspector Panel — Tab 1: Inspector

When nothing is selected: empty state prompt.

When a node is selected: shows the object's bible summary, generation count, status.

When a generated image is selected: shows full audience reactions for that image across all segments. Each reaction card shows:
- Segment name + demographic profile
- Trust score, Distinctiveness score
- Would watch (yes/no)
- Character truth note (verbatim from the persona)

When a ladder-enabled asset is selected: additionally shows compulsion score, payoff delta, and any upstream flags.

### Inspector Panel — Tab 2: Chat

Two modes, determined by selection state:

**In-context:** Something is selected on the canvas. System prompt is auto-constructed from the selected object's full data, parent context, and current ladder state. Ask anything about this specific object.

**Project-wide:** Nothing selected. RAG over the full project file — character bibles, all audience reactions, all decisions, original script, ladder state history. Ask anything about the whole project.

Examples of useful project-wide queries:
- *"Which characters have consistently low distinctiveness scores?"*
- *"Where is the ladder stalling in act two?"*
- *"Is there an evangelist moment in the first ten minutes?"*
- *"What does the Skeptic disagree with most across the whole project?"*

---

## 7. Canvas Hierarchy & Feature Spec

### Level 0 — Project Canvas (root)

The primary canvas. Contains:
- One node per character
- One node per location
- One node per scene
- One node per sequence (added as scenes are combined)
- A story summary card (generated from script ingestion)

**Script Ingestion Flow:**

1. Creator pastes or uploads script (FDX, PDF, plain text)
2. System extracts: characters, locations, scenes, plot points
3. For each extracted entity, a node is created on the primary canvas — initially empty except for the generated bible
4. Creator reviews and edits bibles before proceeding

---

### Level 1 — Character Canvas

Accessed by double-clicking a character node.

**Contains:**
- **Character Bible card** (auto-generated, editable): role, archetype, age, essence, wound, desire, fear, notable traits
- **Face card** (empty → generated → starred)
- **Body card** (locked until face is starred)
- **Wardrobe card** (locked until body is starred)

Each sub-card follows the same pattern: double-click to open its own canvas.

---

### Level 1a — Face Generation Canvas

Accessed by double-clicking the Face card inside a character canvas.

**Initial state:** A single large "Generate character likenesses" button in the shape of a camera icon, centered on the canvas. Clicking it opens an editable prompt window.

**Prompt window:**
- Pre-filled with inferred description from character bible
- Shows the source text the inference was drawn from
- Creator edits before generating
- Clicking Generate triggers 4 parallel generations (fal.ai / Flux)

**Post-generation state:**
- 4 image cards appear on the canvas, left to right, in generation order
- The Generate button moves to the end of the row
- Each card shows: generated image, interpretation label, star button
- Audience evaluation jobs fire immediately and asynchronously

**On hover over a generated image:**
- Remix button (opens prompt editor seeded from this image)
- Star button (only one image can be starred; starring locks this as the canonical face)

**On selecting an image:**
- Inspector shows audience reactions for that image across all 4 segments
- Reactions include: instant reaction, trust score, distinctiveness score, character truth note, would watch boolean

**Star mechanic:**
- Only one image can be starred at a time
- Starring is a propagation decision: the starred face becomes the conditioning reference for all subsequent generations involving this character
- Starred image is visually anchored — moves to a persistent position at top of canvas; generation history flows below
- Unstarring requires explicit action and shows a confirmation (downstream conditioning will be affected)

**Remix mechanic:**
- Creates a new generation using the hovered image as seed
- New image is appended to the canvas
- Audience evaluation fires for the new image
- All images remain; nothing is deleted

---

### Level 1b — Body Generation Canvas

Accessed by double-clicking the Body card (requires starred face).

Same pattern as Face canvas. Generates body shots (front, three-quarter left, three-quarter right). Starred face automatically conditions all body generations.

**Slots:**
- Front
- Three-quarter left
- Three-quarter right

---

### Level 1c — Wardrobe Canvas

Accessed by double-clicking the Wardrobe card (requires starred body).

Wardrobe is scene-aware. The canvas shows one row per scene this character appears in:

```
Scene 1 — Hospital (INT, DAY)         [generate outfit] → reactions
Scene 4 — Abandoned Lab (INT, NIGHT)  [generate outfit] → reactions
Scene 12 — Rooftop (EXT, DUSK)        [generate outfit] → reactions
```

Generation prompt includes: character bible, starred face + body references, scene emotional register, scene power dynamics, scene visual tone.

Audience evaluates outfit against: character truth (does this match who this person is?), scene fit (does this belong in this scene?), distinctiveness.

---

### Level 2 — Location Canvas

Accessed by double-clicking a location node.

**Contains:**
- **Location Bible card**: setting, period, summary, tone, meaning in story
- **Visual Generation canvas**: same pattern as face generation — generate, react, star

Location visuals condition all scene generations that take place in this location.

---

### Level 3 — Scene Canvas

Accessed by double-clicking a scene node.

**Contains:**
- **Scene Brief card**: description, characters, location, beat sheet
- **Visual Generation canvas**: generates a scene still or multi-shot clip (Seedance)
  - Conditioned by: starred character faces, starred location visual, wardrobe for this scene
- **Ladder Card**: shows compulsion score for this scene, payoff delta, upstream flags

**Scene brief includes:**
- Entry state (emotional + situational)
- Beat sheet (6–8 beats, each a unit of change)
- Subtext layer (what's said vs. what's meant)
- Exit state (what is now irreversible)
- Ladder position (promise made, promise kept)

---

### Level 4 — Sequence Canvas

Accessed by double-clicking a sequence node (sequences are assembled from scenes).

**Contains:**
- Ordered scene cards (can be reordered by dragging)
- Escalation structure card
- Variable reward map
- Compulsion curve visualization (score graphed across all scenes in sequence)
- Upstream flags from scene level

---

### Level 5 — First 10 Minutes Canvas

Highest-level evaluation before editorial. Contains:
- Full scene breakdown in order
- Pacing metadata (scene lengths, cut rhythm)
- Hook identification
- Ladder entry point
- Compulsion curve for full 10 minutes
- Segment-level dropout risk flags

Video evaluation at this level uses Gemini 2.0 Pro native video ingestion. The synthetic audience can react to actual footage, not just descriptions.

---

## 8. Asset Pipeline

### Storage Model

Assets live once and are referenced everywhere. Never copied; pointer copied.

```
GENERATION (cloud)
  → fal.ai / Seedance API call
  → Output stored in Cloudflare R2
  → URL saved to Supabase (generations table)
  → Canvas node updated via Supabase Realtime

LOCAL SYNC
  → Starred assets: always synced locally
  → Edit-referenced assets: synced on demand
  → Rejected generations: cloud-only (visible on canvas, never needed locally)
  → Audience reaction data: database only (not file assets)

EXPORT
  → All referenced assets pulled to local
  → Relative paths written into export package
  → Project file (.jcp) is the manifest
```

### Project File Format (.jcp)

JSON manifest. Contains no binary assets — only references and metadata.

```json
{
  "project": { "name": "...", "created_at": "..." },
  "characters": {
    "elena": {
      "bible": { ... },
      "face": {
        "generations": [
          {
            "id": "f2",
            "prompt": "...",
            "cloud_url": "https://r2.jumpcut.io/.../f2.jpg",
            "local_path": "assets/characters/elena/face/f2.jpg",
            "local_synced": true,
            "starred": true,
            "audience_reactions": { ... }
          }
        ]
      }
    }
  },
  "locations": { ... },
  "scenes": { ... },
  "ladder_state": { ... },
  "edit": {
    "assembly": { ... },
    "exports": [ ... ]
  }
}
```

### Generation Conditioning

When a scene is generated, the system automatically gathers:
- Starred face reference for each character in the scene
- Starred body reference for each character
- Scene-specific wardrobe reference for each character
- Starred location visual

These are passed as conditioning references to Seedance (multi-modal input: up to 9 images + text prompt).

### NLE Export Package

```
JUMPCUT_EXPORT/
├── project.xml          (Premiere Pro / DaVinci Resolve compatible)
├── project.jcp          (JUMP//CUT project manifest)
├── assets/
│   ├── characters/
│   ├── locations/
│   └── scenes/
└── metadata/
    ├── audience_reactions.json   (imported as timeline markers in NLE)
    ├── ladder_state.json
    └── generation_history.json
```

Audience reaction notes appear as **timeline markers** in the NLE. The editor sees Skeptic flags directly on the clip, not in a separate tool.

### Local Editing (Phase 2+)

A Tauri-based desktop application handles assembly editing. The web app and Tauri app share one source of truth: the `.jcp` project file plus cloud storage. The local `assets/` folder is a cache, not the source.

The edit canvas uses the same double-click navigation paradigm as the web canvas. Going into the edit level activates the local Tauri layer; coming back up returns to web canvas. The seam is invisible to the creator.

---

## 9. Collaboration

### Multiplayer

Real-time collaborative canvas using Liveblocks + Yjs (CRDT). Same paradigm as Figma.

**Features:**
- Live cursors with name labels
- Presence indicators in left sidebar
- Real-time node updates (generation, starring, reactions)
- Conflict-free concurrent edits on different nodes

### Role Permissions

| Role | Access |
|---|---|
| Director | All canvases. Can star, approve, reject. Full authority. |
| Writer | Character bibles, story structure. Read-only on generated visuals. |
| Production Designer | Location and wardrobe canvases. |
| VFX Supervisor | Scene and sequence canvases. |
| Editor | Sequence through edit canvases. |
| Producer | Read-only everywhere. Audience data and analytics access. |

### Notification Model

Figma-style, not email. Reactions arrive and badge the relevant node on every canvas where it appears. Global reaction feed in the right panel. If the relevant canvas is open, reactions appear directly on images.

---

## 10. Technical Stack

### Frontend

| Component | Technology | Reason |
|---|---|---|
| Framework | Next.js 14 + TypeScript | App router, server components, Vercel deployment |
| Canvas | Tldraw | Open-source infinite canvas with custom shapes, Yjs-native |
| Multiplayer | Liveblocks | Tldraw integration, presence, real-time sync |
| CRDT | Yjs | Conflict-free canvas state |
| Styling | Tailwind CSS + CSS custom properties | Design tokens via CSS vars |

### Backend

| Component | Technology | Reason |
|---|---|---|
| Database | Supabase (Postgres) | Project data, bibles, reactions, auth, Realtime |
| Auth | Supabase Auth | Multiplayer identity |
| Background jobs | Inngest | Async audience fan-out, retries, Vercel-native |
| Edge state | Cloudflare Durable Objects | Room state persistence (via Liveblocks) |

### Generation

| Component | Technology | Reason |
|---|---|---|
| Image generation | fal.ai (Flux) | Best quality, fast inference, character consistency |
| Video generation | Seedance 1.0 / 2.0 via API | Multi-shot, multi-reference conditioning, native audio |
| Video evaluation | Gemini 2.0 Pro | Native video ingestion, moment-level timestamped reactions |

### AI / LLM

| Component | Technology | Reason |
|---|---|---|
| Script ingestion & extraction | GPT-4o | Structured output, long context |
| Bible generation | Claude (claude-sonnet-4-20250514) | Nuanced characterization, long-form writing |
| Persona reasoning | Claude (claude-sonnet-4-20250514) | Structured JSON output, stays in character |
| Video perception | Gemini 2.0 Pro | Sees video natively, timestamps reactions |
| Project-wide RAG chat | Claude + vector DB | Synthesizes across full project |

### Storage

| Component | Technology | Reason |
|---|---|---|
| Asset storage | Cloudflare R2 | Cheap egress, fast globally, S3-compatible |
| Vector DB | Pinecone or Weaviate | RAG for project-wide chat |

### Local / Desktop (Phase 2+)

| Component | Technology | Reason |
|---|---|---|
| Desktop shell | Tauri (Rust) | Smaller binary than Electron, better video performance |
| Local NLE | Built on Tauri | Rough cut assembly, scene reordering |
| NLE bridge | XML / EDL export | DaVinci Resolve and Premiere Pro handoff |

---

## 11. Data Architecture

### Core Tables (Supabase)

```sql
projects
  id uuid PK
  name text
  script_text text
  created_by uuid FK users
  created_at timestamptz

characters
  id uuid PK
  project_id uuid FK projects
  name text
  bible jsonb
  status text  -- empty | generated | reacted | starred
  created_at timestamptz

locations
  id uuid PK
  project_id uuid FK projects
  name text
  bible jsonb
  status text
  created_at timestamptz

scenes
  id uuid PK
  project_id uuid FK projects
  name text
  character_ids uuid[]
  location_id uuid FK locations
  description text
  beat_sheet jsonb
  created_at timestamptz

generations
  id uuid PK
  object_id uuid        -- character, location, or scene id
  object_type text      -- character_face | character_body | location | scene | wardrobe
  prompt text
  cloud_url text
  local_path text
  local_synced bool
  starred bool
  conditioning_refs uuid[]   -- generation IDs used as conditioning inputs
  created_at timestamptz

audience_reactions
  id uuid PK
  generation_id uuid FK generations
  segment text           -- converter | evangelist | skeptic | genre_native
  demographic_profile jsonb
  reaction jsonb
  -- reaction shape:
  -- {
  --   instant_reaction: string,
  --   trust_score: int (0-10),
  --   distinctiveness: int (0-10),
  --   character_truth: string,
  --   would_watch: bool,
  --   compulsion_score: int (0-10),
  --   anticipation_load: int (0-10),
  --   cost_felt: string,
  --   evangelist_moment: string | null
  -- }
  created_at timestamptz

ladder_state
  id uuid PK
  project_id uuid FK projects
  state jsonb
  -- {
  --   active_promises: [...],
  --   paid_costs: [...],
  --   compulsion_history: [4, 6, 5, 8, 7],
  --   variable_reward_log: [...],
  --   audience_emotional_state: { converter: {...}, evangelist: {...}, ... }
  -- }
  updated_at timestamptz

canvas_nodes
  id uuid PK
  project_id uuid FK projects
  canvas_level text     -- project | character | location | scene | face | body | wardrobe
  parent_id uuid        -- null for project level
  object_id uuid
  object_type text
  position jsonb        -- { x: float, y: float }
  created_at timestamptz
```

### Audience Evaluation Job (Inngest)

```typescript
// Triggered after any generation
inngest.createFunction(
  { id: 'evaluate-generation' },
  { event: 'generation.created' },
  async ({ event, step }) => {
    const { generationId, objectType, objectId } = event.data

    // Fan out to all segments in parallel
    await Promise.all(
      SEGMENTS.map(segment =>
        step.run(`evaluate-${segment}`, async () => {
          // 1. Build persona system prompt
          const persona = buildPersonaPrompt(segment)

          // 2. Get image description (GPT-4o Vision or pass image directly)
          const imageDesc = await describeImage(generationId)

          // 3. Get object context (bible, ladder state, parent context)
          const context = await buildObjectContext(objectId, objectType)

          // 4. Call Claude with persona + context + probes
          const reaction = await evaluateWithClaude(persona, imageDesc, context, objectType)

          // 5. Save reaction
          await saveReaction(generationId, segment, reaction)

          // 6. Notify via Supabase Realtime
          await notifyClient(generationId, segment)
        })
      )
    )

    // After all segments complete, update ladder state
    await step.run('update-ladder', async () => {
      await updateLadderState(objectId, generationId)
    })
  }
)
```

### RAG Index Structure

```
Project RAG Index
├── script_chunks/         (scene-level chunks of original script)
├── character_bibles/      (full text of each character bible)
├── location_bibles/       (full text of each location bible)
├── audience_reactions/    (all reactions across all generations)
├── decision_log/          (every star, every reject, every flag)
├── ladder_state_history/  (how the ladder has evolved)
└── generation_prompts/    (what was tried and what was chosen)
```

---

## 12. Build Plan

### Overview

Five phases. Each phase produces a shippable artifact. Validation of the synthetic audience signal quality is the priority across all phases — the canvas and UI are infrastructure; the audience engine is the product.

---

### Phase 1 — Core Canvas + Script Ingestion
**Weeks 1–4 | Goal: navigate the IFE, read bibles, see the structure**

**Week 1**
- Next.js 14 + TypeScript project setup
- Supabase project: schema, auth, Realtime
- Script ingestion endpoint (GPT-4o): extract characters, locations, scenes
- Bible generation (Claude): character, location bibles from extracted entities

**Week 2**
- Tldraw custom shapes: Character node, Location node, Scene node
- Project canvas: render nodes at fixed positions
- Node status system: empty / generated / reacted / starred
- Left sidebar: node browser with status dots

**Week 3**
- Inspector panel: node selection → bible details
- Double-click navigation: project → character canvas
- Character canvas: Bible card + Face card + Body card (locked)
- Breadcrumb navigation + Escape key

**Week 4**
- Chat tab: in-context mode (selected object as system context)
- Zoom controls + canvas pan
- Polish: typography, color system, node visual states
- **Milestone:** Full script → structure → navigable canvas

---

### Phase 2 — Image Generation + Audience Engine
**Weeks 5–8 | Goal: generate images, see audience reactions**

**Week 5**
- fal.ai integration: 4 parallel image generations
- Cloudflare R2: store generated images
- Face generation canvas: prompt window, 4-up grid, star mechanic
- Generation prompt construction from character bible

**Week 6**
- Inngest setup: job queue, fan-out pattern
- Claude audience evaluation: persona system prompts for all 4 segments
- Structured probe schema: trust, distinctiveness, character truth, would watch
- Reaction storage in Supabase

**Week 7**
- Supabase Realtime: node badge updates on reaction arrival
- Inspector: audience reaction cards per segment
- Reaction aggregation: consensus + divergence detection
- Upstream flag generation

**Week 8**
- Location generation canvas (same pattern as face)
- Scene generation canvas (character + location conditioning)
- Prompt construction uses starred references from lower levels
- **Milestone:** Full loop working at image level — generate, react, decide

**Validation checkpoint:** Run 10 character images the team has opinions about through the synthetic audience. If the Skeptic is catching real problems, the Converter is surfacing crossover concerns, and the Evangelist is identifying shareable moments — the signal is working. Fix persona prompts before proceeding.

---

### Phase 3 — Multiplayer + Full Hierarchy
**Weeks 9–12 | Goal: collaborate, navigate all six levels**

**Week 9**
- Liveblocks integration with Tldraw
- Real-time cursors, presence indicators
- Role-based permissions
- Notification feed for async reactions

**Week 10**
- Body generation canvas
- Wardrobe canvas (scene-aware, per-scene outfit rows)
- Generation conditioning: starred face + body → wardrobe

**Week 11**
- Sequence canvas: ordered scene cards, drag to reorder
- Scene summary propagation to sequence level
- Compulsion curve visualization (score graphed across scenes)

**Week 12**
- Project-wide RAG chat (Pinecone + Claude)
- RAG index build and update on every project change
- Chat mode switching: in-context vs project-wide
- **Milestone:** Full IFE hierarchy navigable by a team

---

### Phase 4 — Ladder Testing + Analytics
**Weeks 13–16 | Goal: measure the ladder, surface structural problems**

**Week 13**
- Ladder state management: persistent object across hierarchy
- Ladder probe set: compulsion score, anticipation load, payoff delta, cost felt, evangelist moment
- Ladder state passed into every evaluation call

**Week 14**
- Compulsion curve dashboard: score graphed across scenes and sequences
- Upstream flag system: scene-level problems flagged in sequence view
- False rung detection: payoff without earned cost
- Evangelist moment classifier: high-shareable-moment detection

**Week 15**
- Segment delta analytics: where segments agree vs diverge across project
- Dropout risk indicators: per-segment engagement trending down
- Variable reward map: which beats over/under delivered

**Week 16**
- First 10 minutes canvas
- Gemini 2.0 Pro video ingestion for finished footage evaluation
- Moment-level timestamped reactions from Gemini
- **Milestone:** Full ladder measurement working — compulsion curve visible for whole project

---

### Phase 5 — Video Generation + Local Bridge
**Weeks 17–20 | Goal: generate video, hand off to editing**

**Week 17**
- Seedance API integration: scene-level video generation
- Multi-reference conditioning: face + body + wardrobe + location → Seedance
- Video storage and streaming from R2

**Week 18**
- Gemini video perception layer: Gemini sees video, Claude inhabits persona
- Audience evaluation on actual video footage (not descriptions)
- Moment-level reaction timestamps surfaced in inspector

**Week 19**
- NLE export package: XML/EDL for DaVinci and Premiere
- Audience reactions as timeline markers in export
- Asset sync logic: starred + edit-referenced assets pulled locally

**Week 20**
- Tauri desktop app scaffold
- Basic assembly editing canvas (scene ordering, trim)
- Web ↔ Tauri bridge: shared project file, cloud sync
- **Milestone:** End-to-end — script to generated video to NLE handoff

---

### The Proprietary Moat

The stack is reproducible. The moat is not the technology — it is the data that accumulates through use:

1. **Ladder calibration corpus** — content + synthetic reaction + real outcome, accumulated across every project run through the IFE. Over time this corpus trains a blockbuster gap model: what separates stated preference from actual behavior.

2. **Evangelist moment classifier** — pattern recognition for the specific quality of surprise that drives word of mouth, trained on what audiences actually shared vs. what they said they would share.

3. **Persona refinement data** — systematic gaps between synthetic and real audience responses, accumulated per genre, demographic, and cultural context. Each project makes the personas smarter.

Every film run through JUMP//CUT makes the engine more accurate for the next one. That compounding is the asset.

---

*Document generated from product development session.*
*Authors: JUMP//CUT founding team.*
*Version: 0.1 — Working Draft*
