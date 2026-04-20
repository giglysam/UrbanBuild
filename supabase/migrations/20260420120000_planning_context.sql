-- Optional planner-supplied context (density, zoning notes, budget, risk flags, time series).

alter table public.projects
  add column if not exists planning_context jsonb not null default '{}'::jsonb;

comment on column public.projects.planning_context is
  'User-entered planning inputs: population, zoning, budget line items, risk flags, optional time series.';
