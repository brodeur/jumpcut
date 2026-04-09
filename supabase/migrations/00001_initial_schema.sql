-- JUMP//CUT Initial Schema
-- Matches JUMPCUT_SPEC.md §11

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ============================================================
-- Projects
-- ============================================================
create table projects (
  id uuid primary key default uuid_generate_v4(),
  name text not null default 'Untitled Project',
  script_text text,
  created_by uuid not null,
  created_at timestamptz not null default now()
);

-- ============================================================
-- Characters
-- ============================================================
create table characters (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  name text not null,
  bible jsonb,
  status text not null default 'empty'
    check (status in ('empty', 'generating', 'generated', 'reacted', 'starred')),
  created_at timestamptz not null default now()
);

create index idx_characters_project on characters(project_id);

-- ============================================================
-- Locations
-- ============================================================
create table locations (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  name text not null,
  bible jsonb,
  status text not null default 'empty'
    check (status in ('empty', 'generating', 'generated', 'reacted', 'starred')),
  created_at timestamptz not null default now()
);

create index idx_locations_project on locations(project_id);

-- ============================================================
-- Scenes
-- ============================================================
create table scenes (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  name text not null,
  character_ids uuid[] not null default '{}',
  location_id uuid references locations(id) on delete set null,
  description text,
  beat_sheet jsonb,
  created_at timestamptz not null default now()
);

create index idx_scenes_project on scenes(project_id);

-- ============================================================
-- Generations (polymorphic — object_id points to character, location, or scene)
-- ============================================================
create table generations (
  id uuid primary key default uuid_generate_v4(),
  object_id uuid not null,
  object_type text not null
    check (object_type in ('character_face', 'character_body', 'location', 'scene', 'wardrobe')),
  prompt text not null,
  cloud_url text,
  local_path text,
  local_synced boolean not null default false,
  starred boolean not null default false,
  conditioning_refs uuid[] not null default '{}',
  created_at timestamptz not null default now()
);

create index idx_generations_object on generations(object_id, object_type);
create index idx_generations_starred on generations(object_id, object_type) where starred = true;

-- ============================================================
-- Audience Reactions
-- ============================================================
create table audience_reactions (
  id uuid primary key default uuid_generate_v4(),
  generation_id uuid not null references generations(id) on delete cascade,
  segment text not null
    check (segment in ('converter', 'evangelist', 'skeptic', 'genre_native')),
  demographic_profile jsonb not null default '{}',
  reaction jsonb not null default '{}',
  created_at timestamptz not null default now(),
  unique (generation_id, segment)
);

create index idx_reactions_generation on audience_reactions(generation_id);

-- ============================================================
-- Ladder State (one per project, updated on every evaluation)
-- ============================================================
create table ladder_state (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  state jsonb not null default '{
    "active_promises": [],
    "paid_costs": [],
    "compulsion_history": [],
    "variable_reward_log": [],
    "audience_emotional_state": {}
  }',
  updated_at timestamptz not null default now(),
  unique (project_id)
);

-- ============================================================
-- Canvas Nodes (visual positions on the infinite canvas)
-- ============================================================
create table canvas_nodes (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  canvas_level text not null
    check (canvas_level in ('project', 'character', 'location', 'scene', 'face', 'body', 'wardrobe', 'sequence', 'first_10')),
  parent_id uuid references canvas_nodes(id) on delete cascade,
  object_id uuid not null,
  object_type text not null,
  position jsonb not null default '{"x": 0, "y": 0}',
  created_at timestamptz not null default now()
);

create index idx_canvas_nodes_project_level on canvas_nodes(project_id, canvas_level);
create index idx_canvas_nodes_parent on canvas_nodes(parent_id);

-- ============================================================
-- Enable Realtime on tables that need live updates
-- ============================================================
alter publication supabase_realtime add table generations;
alter publication supabase_realtime add table audience_reactions;
alter publication supabase_realtime add table canvas_nodes;

-- ============================================================
-- Row Level Security (basic — creator owns their projects)
-- ============================================================
alter table projects enable row level security;
alter table characters enable row level security;
alter table locations enable row level security;
alter table scenes enable row level security;
alter table generations enable row level security;
alter table audience_reactions enable row level security;
alter table ladder_state enable row level security;
alter table canvas_nodes enable row level security;

-- Policy: users can CRUD their own project data
create policy "Users manage own projects"
  on projects for all
  using (auth.uid() = created_by)
  with check (auth.uid() = created_by);

-- Policy: project members can access project children
-- (simplified — uses project ownership; role-based access comes in Phase 3)
create policy "Access project characters"
  on characters for all
  using (project_id in (select id from projects where created_by = auth.uid()))
  with check (project_id in (select id from projects where created_by = auth.uid()));

create policy "Access project locations"
  on locations for all
  using (project_id in (select id from projects where created_by = auth.uid()))
  with check (project_id in (select id from projects where created_by = auth.uid()));

create policy "Access project scenes"
  on scenes for all
  using (project_id in (select id from projects where created_by = auth.uid()))
  with check (project_id in (select id from projects where created_by = auth.uid()));

create policy "Access project generations"
  on generations for all
  using (
    object_id in (select id from characters where project_id in (select id from projects where created_by = auth.uid()))
    or object_id in (select id from locations where project_id in (select id from projects where created_by = auth.uid()))
    or object_id in (select id from scenes where project_id in (select id from projects where created_by = auth.uid()))
  );

create policy "Access project reactions"
  on audience_reactions for all
  using (generation_id in (select id from generations where
    object_id in (select id from characters where project_id in (select id from projects where created_by = auth.uid()))
    or object_id in (select id from locations where project_id in (select id from projects where created_by = auth.uid()))
    or object_id in (select id from scenes where project_id in (select id from projects where created_by = auth.uid()))
  ));

create policy "Access project ladder state"
  on ladder_state for all
  using (project_id in (select id from projects where created_by = auth.uid()))
  with check (project_id in (select id from projects where created_by = auth.uid()));

create policy "Access project canvas nodes"
  on canvas_nodes for all
  using (project_id in (select id from projects where created_by = auth.uid()))
  with check (project_id in (select id from projects where created_by = auth.uid()));
