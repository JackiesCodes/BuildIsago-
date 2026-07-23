-- BuildIsago Client Portal — database schema
-- Run this once in the Supabase SQL Editor (Project > SQL Editor > New query).

create extension if not exists pgcrypto;

-- ============================================
-- Profiles (one row per auth user)
-- ============================================
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'client' check (role in ('client', 'studio')),
  full_name text,
  company text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Profiles are viewable by owner or studio"
  on public.profiles for select
  using (
    auth.uid() = id
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'studio')
  );

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create a profile row whenever someone signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================
-- Projects
-- ============================================
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  service_type text not null check (service_type in ('software', 'branding', 'design', 'multiple')),
  description text,
  status text not null default 'intake' check (status in ('intake', 'in_progress', 'review', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.projects enable row level security;

create policy "Clients see own projects, studio sees all"
  on public.projects for select
  using (
    client_id = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'studio')
  );

create policy "Clients can create their own projects"
  on public.projects for insert
  with check (client_id = auth.uid());

create policy "Studio can update any project"
  on public.projects for update
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'studio'));

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists projects_set_updated_at on public.projects;
create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

-- ============================================
-- Messages (per-project thread)
-- ============================================
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

alter table public.messages enable row level security;

create policy "Participants can read project messages"
  on public.messages for select
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

create policy "Participants can send project messages"
  on public.messages for insert
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.projects pr
      where pr.id = project_id
        and (
          pr.client_id = auth.uid()
          or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'studio')
        )
    )
  );

-- ============================================
-- Project files (metadata — bytes live in Storage)
-- ============================================
create table if not exists public.project_files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  uploaded_by uuid not null references public.profiles (id) on delete cascade,
  file_name text not null,
  storage_path text not null,
  created_at timestamptz not null default now()
);

alter table public.project_files enable row level security;

create policy "Participants can read project file records"
  on public.project_files for select
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

create policy "Participants can add project file records"
  on public.project_files for insert
  with check (
    uploaded_by = auth.uid()
    and exists (
      select 1 from public.projects pr
      where pr.id = project_id
        and (
          pr.client_id = auth.uid()
          or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'studio')
        )
    )
  );

-- ============================================
-- Storage bucket for project files
-- ============================================
insert into storage.buckets (id, name, public)
values ('project-files', 'project-files', false)
on conflict (id) do nothing;

-- Files are stored as "<project_id>/<filename>" — the policies below check
-- that the project referenced by the folder name belongs to the caller.
create policy "Participants can read project files in storage"
  on storage.objects for select
  using (
    bucket_id = 'project-files'
    and exists (
      select 1 from public.projects pr
      where pr.id::text = (storage.foldername(name))[1]
        and (
          pr.client_id = auth.uid()
          or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'studio')
        )
    )
  );

create policy "Participants can upload project files to storage"
  on storage.objects for insert
  with check (
    bucket_id = 'project-files'
    and exists (
      select 1 from public.projects pr
      where pr.id::text = (storage.foldername(name))[1]
        and (
          pr.client_id = auth.uid()
          or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'studio')
        )
    )
  );

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

-- ============================================
-- AI-generated first-draft briefs per project
-- ============================================
alter table public.projects add column if not exists ai_draft text;
alter table public.projects add column if not exists ai_draft_generated_at timestamptz;

create or replace function public.set_project_ai_draft(p_project_id uuid, p_draft text)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not exists (
    select 1 from public.projects pr
    where pr.id = p_project_id
      and (
        pr.client_id = auth.uid()
        or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'studio')
      )
  ) then
    raise exception 'not authorized';
  end if;

  update public.projects
  set ai_draft = p_draft, ai_draft_generated_at = now()
  where id = p_project_id;
end;
$$;

grant execute on function public.set_project_ai_draft(uuid, text) to authenticated;
