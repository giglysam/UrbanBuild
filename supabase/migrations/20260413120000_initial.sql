-- UrbanBuild initial schema: profiles, projects, sites, files, analysis, briefs, scenarios, chat, billing placeholder.
-- Apply with Supabase CLI: `supabase db push` or paste into SQL editor.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  role text not null default 'individual' check (role in ('individual', 'member', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Organizations (teams — schema-ready; minimal policies)
-- ---------------------------------------------------------------------------

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table public.organization_members (
  org_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member',
  primary key (org_id, user_id)
);

-- ---------------------------------------------------------------------------
-- Projects
-- ---------------------------------------------------------------------------

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.organizations (id) on delete set null,
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger projects_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

create index projects_owner_idx on public.projects (owner_id);

-- ---------------------------------------------------------------------------
-- Site / study area
-- ---------------------------------------------------------------------------

create table public.project_sites (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  label text,
  center_lat double precision,
  center_lng double precision,
  radius_m integer not null default 400,
  boundary_geojson jsonb,
  updated_at timestamptz not null default now(),
  unique (project_id)
);

create trigger project_sites_updated_at
  before update on public.project_sites
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- File metadata (blobs in Storage bucket `project-files`)
-- ---------------------------------------------------------------------------

create table public.project_files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  storage_path text not null,
  filename text not null,
  mime_type text,
  size_bytes bigint,
  uploaded_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index project_files_project_idx on public.project_files (project_id);

-- ---------------------------------------------------------------------------
-- Analysis runs
-- ---------------------------------------------------------------------------

create table public.analysis_runs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  status text not null default 'completed' check (status in ('pending', 'running', 'completed', 'failed')),
  input jsonb not null default '{}'::jsonb,
  result jsonb,
  error text,
  overpass_remark text,
  created_at timestamptz not null default now()
);

create index analysis_runs_project_idx on public.analysis_runs (project_id);

-- ---------------------------------------------------------------------------
-- Planning brief versions
-- ---------------------------------------------------------------------------

create table public.planning_briefs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  version int not null,
  content text not null,
  analysis_run_id uuid references public.analysis_runs (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (project_id, version)
);

-- ---------------------------------------------------------------------------
-- Scenarios
-- ---------------------------------------------------------------------------

create table public.scenarios (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  analysis_run_id uuid references public.analysis_runs (id) on delete set null,
  name text not null,
  payload jsonb not null,
  is_preferred boolean not null default false,
  created_at timestamptz not null default now()
);

create index scenarios_project_idx on public.scenarios (project_id);

create table public.scenario_comparisons (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  scenario_a_id uuid not null references public.scenarios (id) on delete cascade,
  scenario_b_id uuid not null references public.scenarios (id) on delete cascade,
  result jsonb,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Chat
-- ---------------------------------------------------------------------------

create table public.chat_threads (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  title text,
  created_at timestamptz not null default now()
);

create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.chat_threads (id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  meta jsonb,
  created_at timestamptz not null default now()
);

create index chat_messages_thread_idx on public.chat_messages (thread_id);

-- ---------------------------------------------------------------------------
-- Preferences & billing placeholder
-- ---------------------------------------------------------------------------

create table public.user_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  prefs jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table public.billing_accounts (
  user_id uuid primary key references auth.users (id) on delete cascade,
  stripe_customer_id text,
  metadata jsonb default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Auth: create profile row for new users
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.projects enable row level security;
alter table public.project_sites enable row level security;
alter table public.project_files enable row level security;
alter table public.analysis_runs enable row level security;
alter table public.planning_briefs enable row level security;
alter table public.scenarios enable row level security;
alter table public.scenario_comparisons enable row level security;
alter table public.chat_threads enable row level security;
alter table public.chat_messages enable row level security;
alter table public.user_preferences enable row level security;
alter table public.billing_accounts enable row level security;

create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

create policy "orgs_select_member" on public.organizations for select using (
  exists (
    select 1 from public.organization_members m
    where m.org_id = organizations.id and m.user_id = auth.uid()
  )
);

create policy "org_members_select_own" on public.organization_members for select using (user_id = auth.uid());

create policy "projects_owner_all" on public.projects for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create policy "project_sites_via_owner" on public.project_sites for all using (
  exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid())
) with check (
  exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid())
);

create policy "project_files_via_owner" on public.project_files for all using (
  exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid())
) with check (
  exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid())
);

create policy "analysis_runs_via_owner" on public.analysis_runs for all using (
  exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid())
) with check (
  exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid())
);

create policy "planning_briefs_via_owner" on public.planning_briefs for all using (
  exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid())
) with check (
  exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid())
);

create policy "scenarios_via_owner" on public.scenarios for all using (
  exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid())
) with check (
  exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid())
);

create policy "scenario_comparisons_via_owner" on public.scenario_comparisons for all using (
  exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid())
) with check (
  exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid())
);

create policy "chat_threads_via_owner" on public.chat_threads for all using (
  exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid())
) with check (
  exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid())
);

create policy "chat_messages_via_owner" on public.chat_messages for all using (
  exists (
    select 1 from public.chat_threads t
    join public.projects p on p.id = t.project_id
    where t.id = thread_id and p.owner_id = auth.uid()
  )
) with check (
  exists (
    select 1 from public.chat_threads t
    join public.projects p on p.id = t.project_id
    where t.id = thread_id and p.owner_id = auth.uid()
  )
);

create policy "user_prefs_own" on public.user_preferences for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "billing_own" on public.billing_accounts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Storage: private bucket for project uploads
-- Path convention: {user_id}/{project_id}/{file_id}_{filename}
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'project-files',
  'project-files',
  false,
  15728640,
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ]::text[]
)
on conflict (id) do nothing;

create policy "storage_project_files_select"
  on storage.objects for select
  using (
    bucket_id = 'project-files'
    and split_part(name, '/', 1) = auth.uid()::text
  );

create policy "storage_project_files_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'project-files'
    and split_part(name, '/', 1) = auth.uid()::text
  );

create policy "storage_project_files_update"
  on storage.objects for update
  using (
    bucket_id = 'project-files'
    and split_part(name, '/', 1) = auth.uid()::text
  );

create policy "storage_project_files_delete"
  on storage.objects for delete
  using (
    bucket_id = 'project-files'
    and split_part(name, '/', 1) = auth.uid()::text
  );
