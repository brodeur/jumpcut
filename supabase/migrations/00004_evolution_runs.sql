-- Evolution runs table: tracks autonomous overnight evolution cycles
create table evolution_runs (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,
  object_id uuid not null,
  object_type text not null,
  status text not null default 'running'
    check (status in ('running', 'complete', 'failed', 'cancelled')),
  current_iteration int not null default 0,
  total_iterations int not null default 5,
  -- Track the surviving generation IDs after each selection round
  surviving_ids uuid[] not null default '{}',
  -- Full log of each iteration's results
  iteration_log jsonb not null default '[]',
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_by uuid
);

create index idx_evolution_runs_project on evolution_runs(project_id);
create index idx_evolution_runs_status on evolution_runs(status) where status = 'running';

alter table evolution_runs enable row level security;
create policy "Access project evolution runs"
  on evolution_runs for all
  using (project_id in (select id from projects where created_by = auth.uid()))
  with check (project_id in (select id from projects where created_by = auth.uid()));
