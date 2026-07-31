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

-- SECURITY DEFINER so it bypasses RLS on profiles when checked from inside
-- a profiles policy (or any policy on another table) — querying profiles
-- directly inside its own policy causes "infinite recursion detected in
-- policy for relation 'profiles'".
create or replace function public.is_studio()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'studio'
  );
$$;

grant execute on function public.is_studio() to authenticated;

create policy "Profiles are viewable by owner or studio"
  on public.profiles for select
  using (
    auth.uid() = id
    or public.is_studio()
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
    or public.is_studio()
  );

create policy "Clients can create their own projects"
  on public.projects for insert
  with check (client_id = auth.uid());

create policy "Studio can update any project"
  on public.projects for update
  using (public.is_studio());

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
        and (pr.client_id = auth.uid() or public.is_studio())
    )
  );

create policy "Participants can send project messages"
  on public.messages for insert
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.projects pr
      where pr.id = project_id
        and (pr.client_id = auth.uid() or public.is_studio())
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
        and (pr.client_id = auth.uid() or public.is_studio())
    )
  );

create policy "Participants can add project file records"
  on public.project_files for insert
  with check (
    uploaded_by = auth.uid()
    and exists (
      select 1 from public.projects pr
      where pr.id = project_id
        and (pr.client_id = auth.uid() or public.is_studio())
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
        and (pr.client_id = auth.uid() or public.is_studio())
    )
  );

create policy "Participants can upload project files to storage"
  on storage.objects for insert
  with check (
    bucket_id = 'project-files'
    and exists (
      select 1 from public.projects pr
      where pr.id::text = (storage.foldername(name))[1]
        and (pr.client_id = auth.uid() or public.is_studio())
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
        and (pr.client_id = auth.uid() or public.is_studio())
    )
  );

create policy "Participants can seed project milestones"
  on public.project_milestones for insert
  with check (
    exists (
      select 1 from public.projects pr
      where pr.id = project_id
        and (pr.client_id = auth.uid() or public.is_studio())
    )
  );

create policy "Studio can update project milestones"
  on public.project_milestones for update
  using (public.is_studio());

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
      and (pr.client_id = auth.uid() or public.is_studio())
  ) then
    raise exception 'not authorized';
  end if;

  update public.projects
  set ai_draft = p_draft, ai_draft_generated_at = now()
  where id = p_project_id;
end;
$$;

grant execute on function public.set_project_ai_draft(uuid, text) to authenticated;

-- ============================================
-- Design Studio: canvas documents (social posts, slides, flyers)
-- ============================================
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

-- ============================================
-- Brand Studio: one brand kit per project, plus a token-based public
-- "Brand Guidelines" page that doesn't require login
-- ============================================
create table if not exists public.project_brand_kits (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null unique references public.projects (id) on delete cascade,
  created_by uuid not null references public.profiles (id) on delete cascade,
  colors jsonb not null default '[]'::jsonb,
  heading_font text not null default 'Space Grotesk',
  body_font text not null default 'Inter',
  tagline text,
  voice_tone text,
  share_token uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.project_brand_kits enable row level security;

create policy "Participants can read brand kits"
  on public.project_brand_kits for select
  using (
    exists (
      select 1 from public.projects pr
      where pr.id = project_id
        and (pr.client_id = auth.uid() or public.is_studio())
    )
  );

create policy "Participants can create brand kits"
  on public.project_brand_kits for insert
  with check (
    created_by = auth.uid()
    and exists (
      select 1 from public.projects pr
      where pr.id = project_id
        and (pr.client_id = auth.uid() or public.is_studio())
    )
  );

create policy "Participants can update brand kits"
  on public.project_brand_kits for update
  using (
    exists (
      select 1 from public.projects pr
      where pr.id = project_id
        and (pr.client_id = auth.uid() or public.is_studio())
    )
  );

drop trigger if exists project_brand_kits_set_updated_at on public.project_brand_kits;
create trigger project_brand_kits_set_updated_at
  before update on public.project_brand_kits
  for each row execute function public.set_updated_at();

create or replace function public.get_public_brand_kit(p_token uuid)
returns table (
  project_title text,
  colors jsonb,
  heading_font text,
  body_font text,
  tagline text,
  voice_tone text,
  updated_at timestamptz
)
language sql
security definer set search_path = public
stable
as $$
  select pr.title, bk.colors, bk.heading_font, bk.body_font, bk.tagline, bk.voice_tone, bk.updated_at
  from public.project_brand_kits bk
  join public.projects pr on pr.id = bk.project_id
  where bk.share_token = p_token;
$$;

grant execute on function public.get_public_brand_kit(uuid) to anon, authenticated;

-- ============================================
-- Dev Studio: one structured technical scope per project, plus an
-- optional linked public GitHub repo (owner/name only — no token
-- stored, so this only ever reads public repo data)
-- ============================================
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

-- ============================================
-- Design Studio: reference images (moodboard) per project. Colors are
-- extracted client-side from real pixel data (not AI); detected_text is
-- populated on demand via Claude vision. Files live in the existing
-- project-files bucket under "<project_id>/references/..." — its
-- storage policies only check the first path segment (the project id),
-- so no new bucket or storage policy is needed.
-- ============================================
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

-- ============================================
-- Invoices & payments: studio-issued invoices per project, paid via
-- Stripe Checkout. Everything except the "mark paid" write goes through
-- normal RLS as the signed-in studio user. The Stripe webhook has no user
-- session at all, so it authenticates as the Supabase secret key instead
-- (see lib/supabase/admin.js) and is the only thing trusted to flip an
-- invoice to 'paid'.
-- ============================================
create sequence if not exists public.invoice_number_seq start 1;

create or replace function public.next_invoice_number()
returns text
language sql
security definer set search_path = public
as $$
  select 'INV-' || lpad(nextval('public.invoice_number_seq')::text, 4, '0');
$$;

grant execute on function public.next_invoice_number() to authenticated;

create table if not exists public.project_invoices (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  created_by uuid not null references public.profiles (id) on delete cascade,
  invoice_number text not null unique,
  status text not null default 'draft' check (status in ('draft', 'sent', 'paid', 'void')),
  currency text not null default 'usd',
  line_items jsonb not null default '[]'::jsonb,
  tax_rate numeric not null default 0,
  notes text,
  due_date date,
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  sent_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.project_invoices enable row level security;

create index if not exists project_invoices_project_id_idx on public.project_invoices (project_id);

-- Drafts are internal — a client can't read one until the studio sends it.
create policy "Participants can read non-draft invoices, studio reads all"
  on public.project_invoices for select
  using (
    public.is_studio()
    or (
      status <> 'draft'
      and exists (
        select 1 from public.projects pr
        where pr.id = project_id and pr.client_id = auth.uid()
      )
    )
  );

create policy "Studio can create invoices"
  on public.project_invoices for insert
  with check (public.is_studio() and created_by = auth.uid());

create policy "Studio can update invoices"
  on public.project_invoices for update
  using (public.is_studio());

create policy "Studio can delete draft invoices"
  on public.project_invoices for delete
  using (public.is_studio() and status = 'draft');

drop trigger if exists project_invoices_set_updated_at on public.project_invoices;
create trigger project_invoices_set_updated_at
  before update on public.project_invoices
  for each row execute function public.set_updated_at();
