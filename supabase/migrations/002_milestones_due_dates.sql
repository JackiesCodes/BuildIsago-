-- BuildIsago Client Portal — migration 002
-- Adds due dates, priority, and per-project milestone checklists.
-- Run this once in the Supabase SQL Editor (Project > SQL Editor > New query).
-- Safe to run even though 001 (schema.sql) was already applied — this file
-- only adds new columns/tables and does not touch anything that already
-- exists.

-- ============================================
-- Due dates + priority
-- ============================================
alter table public.projects add column if not exists due_date date;
alter table public.projects add column if not exists priority text not null default 'normal'
  check (priority in ('low', 'normal', 'high', 'urgent'));

-- ============================================
-- Project milestones (per-project checklist, seeded from a
-- service-specific template when the project is created)
-- ============================================
create table if not exists public.project_milestones (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  title text not null,
  position int not null default 0,
  completed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.project_milestones enable row level security;

create policy "Participants can read project milestones"
  on public.project_milestones for select
  using (
    exists (
      select 1 from public.projects pr
      where pr.id = project_id
        and (
          pr.client_id = auth.uid()
          or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'studio')
        )
    )
  );

create policy "Participants can seed project milestones"
  on public.project_milestones for insert
  with check (
    exists (
      select 1 from public.projects pr
      where pr.id = project_id
        and (
          pr.client_id = auth.uid()
          or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'studio')
        )
    )
  );

create policy "Studio can update project milestones"
  on public.project_milestones for update
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'studio'));
