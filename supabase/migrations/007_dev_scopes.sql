-- Dev Studio: one structured technical scope per project, plus an
-- optional linked public GitHub repo (owner/name only — no token is
-- stored, so this only ever reads public repo data).
create table if not exists public.project_dev_scopes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null unique references public.projects (id) on delete cascade,
  created_by uuid not null references public.profiles (id) on delete cascade,
  features jsonb not null default '[]'::jsonb,
  tech_stack jsonb not null default '[]'::jsonb,
  phases jsonb not null default '[]'::jsonb,
  risks jsonb not null default '[]'::jsonb,
  repo_owner text,
  repo_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.project_dev_scopes enable row level security;

create policy "Participants can read dev scopes"
  on public.project_dev_scopes for select
  using (
    exists (
      select 1 from public.projects pr
      where pr.id = project_id
        and (pr.client_id = auth.uid() or public.is_studio())
    )
  );

create policy "Participants can create dev scopes"
  on public.project_dev_scopes for insert
  with check (
    created_by = auth.uid()
    and exists (
      select 1 from public.projects pr
      where pr.id = project_id
        and (pr.client_id = auth.uid() or public.is_studio())
    )
  );

create policy "Participants can update dev scopes"
  on public.project_dev_scopes for update
  using (
    exists (
      select 1 from public.projects pr
      where pr.id = project_id
        and (pr.client_id = auth.uid() or public.is_studio())
    )
  );

drop trigger if exists project_dev_scopes_set_updated_at on public.project_dev_scopes;
create trigger project_dev_scopes_set_updated_at
  before update on public.project_dev_scopes
  for each row execute function public.set_updated_at();
