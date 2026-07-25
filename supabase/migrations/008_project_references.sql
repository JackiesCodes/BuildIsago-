-- Design Studio: reference images (moodboard) per project. Colors are
-- extracted client-side from real pixel data (not AI) and saved here;
-- detected_text is populated on demand via Claude vision. Files live in
-- the existing project-files bucket under "<project_id>/references/..."
-- — its storage policies only check the first path segment (the project
-- id), so no new bucket or storage policy is needed.
create table if not exists public.project_references (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  created_by uuid not null references public.profiles (id) on delete cascade,
  title text not null default 'Reference',
  storage_path text not null,
  source_url text,
  colors jsonb not null default '[]'::jsonb,
  detected_text jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.project_references enable row level security;

create policy "Participants can read references"
  on public.project_references for select
  using (
    exists (
      select 1 from public.projects pr
      where pr.id = project_id
        and (pr.client_id = auth.uid() or public.is_studio())
    )
  );

create policy "Participants can create references"
  on public.project_references for insert
  with check (
    created_by = auth.uid()
    and exists (
      select 1 from public.projects pr
      where pr.id = project_id
        and (pr.client_id = auth.uid() or public.is_studio())
    )
  );

create policy "Participants can update references"
  on public.project_references for update
  using (
    exists (
      select 1 from public.projects pr
      where pr.id = project_id
        and (pr.client_id = auth.uid() or public.is_studio())
    )
  );

create policy "Participants can delete references"
  on public.project_references for delete
  using (
    exists (
      select 1 from public.projects pr
      where pr.id = project_id
        and (pr.client_id = auth.uid() or public.is_studio())
    )
  );

drop trigger if exists project_references_set_updated_at on public.project_references;
create trigger project_references_set_updated_at
  before update on public.project_references
  for each row execute function public.set_updated_at();
