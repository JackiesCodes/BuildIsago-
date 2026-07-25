-- Design Studio: canvas documents (social posts, slides, flyers) per project.
create table if not exists public.project_designs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  created_by uuid not null references public.profiles (id) on delete cascade,
  title text not null default 'Untitled design',
  format text not null default 'custom',
  width int not null,
  height int not null,
  canvas_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.project_designs enable row level security;

create policy "Participants can read project designs"
  on public.project_designs for select
  using (
    exists (
      select 1 from public.projects pr
      where pr.id = project_id
        and (pr.client_id = auth.uid() or public.is_studio())
    )
  );

create policy "Participants can create project designs"
  on public.project_designs for insert
  with check (
    created_by = auth.uid()
    and exists (
      select 1 from public.projects pr
      where pr.id = project_id
        and (pr.client_id = auth.uid() or public.is_studio())
    )
  );

create policy "Participants can update project designs"
  on public.project_designs for update
  using (
    exists (
      select 1 from public.projects pr
      where pr.id = project_id
        and (pr.client_id = auth.uid() or public.is_studio())
    )
  );

create policy "Participants can delete project designs"
  on public.project_designs for delete
  using (
    exists (
      select 1 from public.projects pr
      where pr.id = project_id
        and (pr.client_id = auth.uid() or public.is_studio())
    )
  );

drop trigger if exists project_designs_set_updated_at on public.project_designs;
create trigger project_designs_set_updated_at
  before update on public.project_designs
  for each row execute function public.set_updated_at();
