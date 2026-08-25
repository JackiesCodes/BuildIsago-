-- BuildIsago Client Portal — database schema
-- Run this once in the Supabase SQL Editor (Project > SQL Editor > New query).

create extension if not exists pgcrypto;

-- ============================================
-- Profiles (one row per auth user)
-- ============================================
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  -- 'talent' is legacy: join_marketplace_as_talent() used to write it here
  -- and no longer does (migration 020), but existing databases still hold
  -- rows with it, so the constraint keeps accepting it. Nothing reads it —
  -- talent membership is the public.talent row, and the app's only role
  -- test is for 'studio'.
  role text not null default 'client' check (role in ('client', 'studio', 'talent')),
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

-- ============================================
-- Approvals: studio asks a client to sign off on something (a direction,
-- a brief, a scope, optionally a specific design) and the client approves
-- or requests changes with feedback. Mirrors the invoices draft/sent
-- lifecycle: drafts are studio-only and invisible to the client until sent.
--
-- The client's decision doesn't go through a normal RLS update (unlike the
-- studio's own edits) — it's a plain authenticated action, not a webhook,
-- so it goes through the decide_approval() SECURITY DEFINER function
-- instead, which only touches the decision fields and only while the
-- approval is still 'pending'. This mirrors the existing
-- set_project_ai_draft() function rather than opening up a broad column
-- for client-side row updates.
-- ============================================
create table if not exists public.project_approvals (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  created_by uuid not null references public.profiles (id) on delete cascade,
  title text not null default 'Approval request',
  description text,
  design_id uuid references public.project_designs (id) on delete set null,
  status text not null default 'draft' check (status in ('draft', 'pending', 'approved', 'changes_requested')),
  decided_by uuid references public.profiles (id) on delete set null,
  feedback text,
  sent_at timestamptz,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.project_approvals enable row level security;

create index if not exists project_approvals_project_id_idx on public.project_approvals (project_id);

-- Drafts are internal — a client can't read one until the studio sends it.
create policy "Participants can read non-draft approvals, studio reads all"
  on public.project_approvals for select
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

create policy "Studio can create approvals"
  on public.project_approvals for insert
  with check (public.is_studio() and created_by = auth.uid());

create policy "Studio can update approvals"
  on public.project_approvals for update
  using (public.is_studio());

create policy "Studio can delete draft approvals"
  on public.project_approvals for delete
  using (public.is_studio() and status = 'draft');

drop trigger if exists project_approvals_set_updated_at on public.project_approvals;
create trigger project_approvals_set_updated_at
  before update on public.project_approvals
  for each row execute function public.set_updated_at();

create or replace function public.decide_approval(p_approval_id uuid, p_decision text, p_feedback text default null)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_project_id uuid;
  v_client_id uuid;
begin
  if p_decision not in ('approved', 'changes_requested') then
    raise exception 'invalid decision';
  end if;

  select a.project_id, pr.client_id into v_project_id, v_client_id
  from public.project_approvals a
  join public.projects pr on pr.id = a.project_id
  where a.id = p_approval_id and a.status = 'pending';

  if v_project_id is null then
    raise exception 'approval not found or not pending';
  end if;

  if v_client_id <> auth.uid() and not public.is_studio() then
    raise exception 'not authorized';
  end if;

  update public.project_approvals
  set status = p_decision, decided_by = auth.uid(), decided_at = now(), feedback = p_feedback
  where id = p_approval_id;
end;
$$;

grant execute on function public.decide_approval(uuid, text, text) to authenticated;

-- ============================================
-- Digital Products storefront: a public catalog (UI kits, templates,
-- design systems) that isn't tied to any client project. Anyone can
-- browse without an account; buying (or claiming a free one) requires
-- signing in, and downloading requires a completed purchase.
--
-- Unlike every other public-read feature so far (get_public_brand_kit),
-- there's no per-row secret token here — "public" really does mean
-- anyone. Rather than opening RLS on the products table itself to anon,
-- this keeps the table studio-only (mirrors every other table in this
-- schema) and exposes only a safe, explicit column list — never
-- file_path, the private storage path — through two SECURITY DEFINER
-- functions.
-- ============================================
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles (id) on delete cascade,
  title text not null default 'New Product',
  slug text not null unique,
  description text,
  category text not null default 'ui_kit'
    check (category in ('ui_kit', 'website_template', 'brand_template', 'design_system')),
  price numeric not null default 0 check (price >= 0),
  currency text not null default 'usd',
  preview_image_path text,
  file_path text,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.products enable row level security;

create policy "Studio manages products"
  on public.products for select using (public.is_studio());
create policy "Studio can create products"
  on public.products for insert with check (public.is_studio() and created_by = auth.uid());
create policy "Studio can update products"
  on public.products for update using (public.is_studio());
create policy "Studio can delete products"
  on public.products for delete using (public.is_studio());

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

create or replace function public.list_published_products()
returns table (
  id uuid, title text, slug text, description text, category text,
  price numeric, currency text, preview_image_path text, created_at timestamptz
)
language sql
security definer set search_path = public
stable
as $$
  select id, title, slug, description, category, price, currency, preview_image_path, created_at
  from public.products
  where status = 'published'
  order by created_at desc;
$$;

grant execute on function public.list_published_products() to anon, authenticated;

create or replace function public.get_published_product(p_slug text)
returns table (
  id uuid, title text, slug text, description text, category text,
  price numeric, currency text, preview_image_path text, created_at timestamptz
)
language sql
security definer set search_path = public
stable
as $$
  select id, title, slug, description, category, price, currency, preview_image_path, created_at
  from public.products
  where slug = p_slug and status = 'published'
  limit 1;
$$;

grant execute on function public.get_published_product(text) to anon, authenticated;

-- ============================================
-- Purchases: only ever written by the buyer's own claim_free_product()
-- call or the Stripe webhook (via the admin client) — never a normal
-- insert/update from the app, so there's no policy for either here.
-- ============================================
create table if not exists public.product_purchases (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  buyer_id uuid not null references public.profiles (id) on delete cascade,
  amount_paid numeric not null default 0,
  currency text not null default 'usd',
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  status text not null default 'paid' check (status in ('paid', 'refunded')),
  created_at timestamptz not null default now(),
  unique (product_id, buyer_id)
);

alter table public.product_purchases enable row level security;

create policy "Buyers read their own purchases, studio reads all"
  on public.product_purchases for select
  using (buyer_id = auth.uid() or public.is_studio());

create policy "Studio can update purchases"
  on public.product_purchases for update using (public.is_studio());

create or replace function public.claim_free_product(p_product_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_price numeric;
  v_currency text;
begin
  select price, currency into v_price, v_currency
  from public.products
  where id = p_product_id and status = 'published';

  if v_price is null then
    raise exception 'product not found';
  end if;
  if v_price <> 0 then
    raise exception 'this product is not free';
  end if;

  insert into public.product_purchases (product_id, buyer_id, amount_paid, currency, status)
  values (p_product_id, auth.uid(), 0, v_currency, 'paid')
  on conflict (product_id, buyer_id) do nothing;
end;
$$;

grant execute on function public.claim_free_product(uuid) to authenticated;

-- A buyer's own session can read their product_purchases rows directly
-- (RLS allows it), but products RLS is studio-only, so a normal embedded
-- join (product_purchases -> products) would come back with every
-- product field null for a non-studio buyer. This returns just the safe
-- display columns instead of opening up products RLS more broadly.
create or replace function public.get_my_purchases()
returns table (
  purchase_id uuid, amount_paid numeric, currency text, purchased_at timestamptz,
  product_id uuid, product_title text, product_slug text, product_category text
)
language sql
security definer set search_path = public
stable
as $$
  select pp.id, pp.amount_paid, pp.currency, pp.created_at,
         p.id, p.title, p.slug, p.category
  from public.product_purchases pp
  join public.products p on p.id = pp.product_id
  where pp.buyer_id = auth.uid() and pp.status = 'paid'
  order by pp.created_at desc;
$$;

grant execute on function public.get_my_purchases() to authenticated;

-- ============================================
-- Storage: a public bucket for storefront preview images, and a private
-- one for the actual downloadable files, gated on a matching paid row in
-- product_purchases the same way project-files is gated on project
-- membership.
-- ============================================
insert into storage.buckets (id, name, public)
values ('product-previews', 'product-previews', true)
on conflict (id) do nothing;

create policy "Anyone can view product preview images"
  on storage.objects for select
  using (bucket_id = 'product-previews');

create policy "Studio can manage product preview images"
  on storage.objects for insert
  with check (bucket_id = 'product-previews' and public.is_studio());

create policy "Studio can replace product preview images"
  on storage.objects for update
  using (bucket_id = 'product-previews' and public.is_studio());

insert into storage.buckets (id, name, public)
values ('product-files', 'product-files', false)
on conflict (id) do nothing;

create policy "Studio can manage product files"
  on storage.objects for insert
  with check (bucket_id = 'product-files' and public.is_studio());

create policy "Studio can replace product files"
  on storage.objects for update
  using (bucket_id = 'product-files' and public.is_studio());

-- Files are stored as "<product_id>/<filename>" — the policy below checks
-- that the product referenced by the folder name has a paid purchase row
-- for the caller.
create policy "Buyers can download purchased product files"
  on storage.objects for select
  using (
    bucket_id = 'product-files'
    and (
      public.is_studio()
      or exists (
        select 1 from public.product_purchases pp
        where pp.product_id::text = (storage.foldername(name))[1]
          and pp.buyer_id = auth.uid()
          and pp.status = 'paid'
      )
    )
  );


-- ============================================
-- Retainers: recurring billing on a project — "Design Support," "Brand
-- Management," a monthly "Startup Growth Package," anything billed on a
-- schedule rather than once. Same draft/sent lifecycle as invoices, but
-- backed by a Stripe Subscription instead of a one-time Checkout.
--
-- Status is kept in sync by the Stripe webhook (customer.subscription.*
-- events), same trust model as invoices: the webhook runs with the admin
-- client, no user session. The one exception is cancellation, which a
-- client can also request — that still has to actually call Stripe's API
-- first (only a server action holding STRIPE_SECRET_KEY can do that), so
-- request_cancel_retainer() only persists the "it's canceled" status
-- afterward. It never talks to Stripe itself.
-- ============================================
create table if not exists public.project_retainers (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  created_by uuid not null references public.profiles (id) on delete cascade,
  title text not null default 'Retainer',
  description text,
  amount numeric not null default 0 check (amount >= 0),
  currency text not null default 'usd',
  interval text not null default 'month' check (interval in ('month', 'year')),
  status text not null default 'draft'
    check (status in ('draft', 'pending', 'active', 'past_due', 'canceled')),
  stripe_subscription_id text,
  stripe_customer_id text,
  stripe_checkout_session_id text,
  current_period_end timestamptz,
  sent_at timestamptz,
  canceled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.project_retainers enable row level security;

create index if not exists project_retainers_project_id_idx on public.project_retainers (project_id);
create index if not exists project_retainers_stripe_subscription_id_idx on public.project_retainers (stripe_subscription_id);

-- Drafts are internal — a client can't see one until the studio sends it.
create policy "Participants can read non-draft retainers, studio reads all"
  on public.project_retainers for select
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

create policy "Studio can create retainers"
  on public.project_retainers for insert
  with check (public.is_studio() and created_by = auth.uid());

create policy "Studio can update retainers"
  on public.project_retainers for update using (public.is_studio());

create policy "Studio can delete draft retainers"
  on public.project_retainers for delete using (public.is_studio() and status = 'draft');

drop trigger if exists project_retainers_set_updated_at on public.project_retainers;
create trigger project_retainers_set_updated_at
  before update on public.project_retainers
  for each row execute function public.set_updated_at();

create or replace function public.request_cancel_retainer(p_retainer_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_project_id uuid;
  v_client_id uuid;
  v_status text;
begin
  select r.project_id, r.status, pr.client_id into v_project_id, v_status, v_client_id
  from public.project_retainers r
  join public.projects pr on pr.id = r.project_id
  where r.id = p_retainer_id;

  if v_project_id is null then
    raise exception 'retainer not found';
  end if;
  if v_client_id <> auth.uid() and not public.is_studio() then
    raise exception 'not authorized';
  end if;
  if v_status not in ('pending', 'active', 'past_due') then
    raise exception 'this retainer cannot be canceled';
  end if;

  update public.project_retainers
  set status = 'canceled', canceled_at = now()
  where id = p_retainer_id;
end;
$$;

grant execute on function public.request_cancel_retainer(uuid) to authenticated;

-- ============================================
-- Talent roster: a private directory of freelance designers, developers,
-- and creative talent the studio can pull in for extra project capacity.
-- Unlike everything else built so far, this is purely internal — no
-- client ever sees it, there's no draft/sent lifecycle, and no new
-- account type. It's a studio-only address book.
-- ============================================
create table if not exists public.talent (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles (id) on delete cascade,
  full_name text not null,
  discipline text not null default 'designer'
    check (discipline in ('designer', 'developer', 'creative', 'other')),
  specialties jsonb not null default '[]'::jsonb,
  email text,
  phone text,
  rate numeric,
  rate_currency text not null default 'usd',
  rate_unit text not null default 'hourly' check (rate_unit in ('hourly', 'project')),
  portfolio_url text,
  notes text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.talent enable row level security;

create policy "Studio manages talent"
  on public.talent for select using (public.is_studio());
create policy "Studio can add talent"
  on public.talent for insert with check (public.is_studio() and created_by = auth.uid());
create policy "Studio can update talent"
  on public.talent for update using (public.is_studio());
create policy "Studio can delete talent"
  on public.talent for delete using (public.is_studio());

drop trigger if exists talent_set_updated_at on public.talent;
create trigger talent_set_updated_at
  before update on public.talent
  for each row execute function public.set_updated_at();


-- ============================================
-- Marketplace: talent can now join the platform themselves (not just be
-- added by the studio to the internal roster), build a public profile,
-- and receive hire requests — the "closer to Upwork" version of the
-- Marketplace, scoped to what's realistic without a full bidding/escrow
-- system: studio-brokered contact requests, not job postings and bids.
--
-- This introduces a third profile role ('talent'), which surfaced a real
-- pre-existing gap: "Users can update their own profile" had no
-- restriction on which columns a user could change, including `role` —
-- any signed-in user could have called supabase.from('profiles').update
-- ({role: 'studio'}) directly and self-promoted. The README already
-- documented studio promotion as a dashboard-only, out-of-band operation;
-- this migration is what actually enforces that, via a trigger that
-- blocks any role change unless it's flagged by a trusted function first.
-- ============================================

-- Allow the new role value.
do $$
declare
  r record;
begin
  for r in
    select conname from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%role%'
  loop
    execute format('alter table public.profiles drop constraint %I', r.conname);
  end loop;
end $$;

alter table public.profiles add constraint profiles_role_check check (role in ('client', 'studio', 'talent'));

-- Close the role self-escalation gap: block a role change made by the
-- 'authenticated' role (i.e. a normal signed-in app user through
-- PostgREST) unless a trusted function has explicitly authorized it for
-- this transaction. Direct SQL/dashboard access — the Supabase Table
-- Editor, migrations, this file itself — never runs as 'authenticated',
-- so the documented dashboard-promotion workflow still works unchanged.
create or replace function public.prevent_role_self_escalation()
returns trigger
language plpgsql
as $$
begin
  if new.role is distinct from old.role
     and current_setting('role', true) = 'authenticated'
     and coalesce(current_setting('app.allow_role_change', true), 'false') <> 'true' then
    raise exception 'role cannot be changed directly — see join_marketplace_as_talent() or promote via the Supabase dashboard';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_prevent_role_escalation on public.profiles;
create trigger profiles_prevent_role_escalation
  before update on public.profiles
  for each row execute function public.prevent_role_self_escalation();

-- ============================================
-- Extend the existing talent roster to support self-registered members
-- alongside studio-added ones. profile_id links a row to the person's
-- own account (null for studio-curated entries with no account of their
-- own). visibility is opt-in — a talent row is never public by default.
-- ============================================
alter table public.talent add column if not exists profile_id uuid references public.profiles (id) on delete cascade;
alter table public.talent add column if not exists visibility text not null default 'private' check (visibility in ('private', 'public'));
alter table public.talent add column if not exists bio text;

create unique index if not exists talent_profile_id_unique on public.talent (profile_id) where profile_id is not null;

drop policy if exists "Studio manages talent" on public.talent;
drop policy if exists "Studio can add talent" on public.talent;
drop policy if exists "Studio can update talent" on public.talent;
drop policy if exists "Studio can delete talent" on public.talent;

create policy "Studio sees all talent, a talent user sees their own row"
  on public.talent for select
  using (public.is_studio() or profile_id = auth.uid());

create policy "Studio or a talent user can add their own row"
  on public.talent for insert
  with check (public.is_studio() or (profile_id = auth.uid() and created_by = auth.uid()));

create policy "Studio or the talent themselves can update the row"
  on public.talent for update
  using (public.is_studio() or profile_id = auth.uid());

create policy "Studio or the talent themselves can remove the row"
  on public.talent for delete
  using (public.is_studio() or profile_id = auth.uid());

-- The only sanctioned way for an existing account to become 'talent' —
-- direct role updates are blocked by the trigger above. Studio accounts
-- can't convert (they already have full access to everything).
create or replace function public.join_marketplace_as_talent()
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_current_role text;
  v_full_name text;
  v_talent_id uuid;
begin
  select role, full_name into v_current_role, v_full_name from public.profiles where id = auth.uid();
  if v_current_role = 'studio' then
    raise exception 'studio accounts cannot join as talent';
  end if;

  -- Talent identity lives in public.talent, keyed by profile_id. That row
  -- is the membership; profiles.role is deliberately left alone. Writing
  -- role = 'talent' here used to overwrite whatever the account already
  -- was, which cost real accounts their studio access. See migration 020.

  select id into v_talent_id from public.talent where profile_id = auth.uid();
  if v_talent_id is null then
    insert into public.talent (created_by, profile_id, full_name, visibility)
    values (auth.uid(), auth.uid(), coalesce(v_full_name, 'New Talent'), 'private')
    returning id into v_talent_id;
  end if;

  return v_talent_id;
end;
$$;

grant execute on function public.join_marketplace_as_talent() to authenticated;

-- Public browsing: same pattern as products — the table stays locked
-- down (studio or the talent themselves only), and an explicit safe
-- column list is exposed instead of opening RLS to anon. email/phone/
-- notes are never returned here.
create or replace function public.list_public_talent()
returns table (
  id uuid, full_name text, discipline text, specialties jsonb, bio text,
  portfolio_url text, rate numeric, rate_currency text, rate_unit text
)
language sql
security definer set search_path = public
stable
as $$
  select id, full_name, discipline, specialties, bio, portfolio_url, rate, rate_currency, rate_unit
  from public.talent
  where visibility = 'public' and status = 'active'
  order by created_at desc;
$$;

grant execute on function public.list_public_talent() to anon, authenticated;

create or replace function public.get_public_talent(p_id uuid)
returns table (
  id uuid, full_name text, discipline text, specialties jsonb, bio text,
  portfolio_url text, rate numeric, rate_currency text, rate_unit text
)
language sql
security definer set search_path = public
stable
as $$
  select id, full_name, discipline, specialties, bio, portfolio_url, rate, rate_currency, rate_unit
  from public.talent
  where id = p_id and visibility = 'public' and status = 'active'
  limit 1;
$$;

grant execute on function public.get_public_talent(uuid) to anon, authenticated;

-- ============================================
-- Hire requests: studio-brokered contact, not job postings/bids/escrow.
-- Anyone signed in can send one; the talent and the studio both see it.
-- ============================================
create table if not exists public.talent_requests (
  id uuid primary key default gen_random_uuid(),
  talent_id uuid not null references public.talent (id) on delete cascade,
  requester_id uuid not null references public.profiles (id) on delete cascade,
  message text not null,
  status text not null default 'new' check (status in ('new', 'contacted', 'closed')),
  created_at timestamptz not null default now()
);

alter table public.talent_requests enable row level security;

create index if not exists talent_requests_talent_id_idx on public.talent_requests (talent_id);

create policy "Requester, the talent, or studio can read a request"
  on public.talent_requests for select
  using (
    public.is_studio()
    or requester_id = auth.uid()
    or exists (select 1 from public.talent t where t.id = talent_id and t.profile_id = auth.uid())
  );

create policy "Any signed-in user can send a request"
  on public.talent_requests for insert
  with check (requester_id = auth.uid());

create policy "The talent or studio can update request status"
  on public.talent_requests for update
  using (
    public.is_studio()
    or exists (select 1 from public.talent t where t.id = talent_id and t.profile_id = auth.uid())
  );


-- ============================================
-- BuildIsago Academy: courses made of ordered lessons (video link and/or
-- text), sold like Digital Products (free or paid, one-time purchase —
-- "enrollment"), with per-student lesson-completion tracking.
--
-- Deliberate scope boundary, same spirit as Marketplace's "no bidding/
-- escrow": lessons hold an external video URL (YouTube/Vimeo/Loom/etc.)
-- pasted by the studio rather than an uploaded, storage-hosted video file.
-- Building real video hosting/streaming/DRM is a different, much larger
-- project than what "training & skills development" needs right now. No
-- quizzes or certificates either — just structured lessons + progress.
--
-- Follows the products.sql pattern throughout: courses/lessons stay
-- studio-only via RLS, with explicit safe-column SECURITY DEFINER
-- functions for public browsing and for a student's own gated access.
-- ============================================
create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles (id) on delete cascade,
  title text not null default 'New Course',
  slug text not null unique,
  description text,
  level text not null default 'beginner' check (level in ('beginner', 'intermediate', 'advanced')),
  price numeric not null default 0 check (price >= 0),
  currency text not null default 'usd',
  cover_image_path text,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.courses enable row level security;

create policy "Studio manages courses"
  on public.courses for select using (public.is_studio());
create policy "Studio can create courses"
  on public.courses for insert with check (public.is_studio() and created_by = auth.uid());
create policy "Studio can update courses"
  on public.courses for update using (public.is_studio());
create policy "Studio can delete courses"
  on public.courses for delete using (public.is_studio());

drop trigger if exists courses_set_updated_at on public.courses;
create trigger courses_set_updated_at
  before update on public.courses
  for each row execute function public.set_updated_at();

-- ============================================
-- Lessons: ordered by `lesson_position` within a course. Kept studio-only in
-- RLS just like courses — content stays locked until the student's
-- own SECURITY DEFINER read below decides it's allowed.
-- ============================================
create table if not exists public.course_lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  title text not null default 'New Lesson',
  lesson_position integer not null default 0,
  content_type text not null default 'video' check (content_type in ('video', 'text')),
  video_url text,
  body text,
  duration_minutes integer,
  is_preview boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.course_lessons enable row level security;

create index if not exists course_lessons_course_id_idx on public.course_lessons (course_id, lesson_position);

create policy "Studio manages course lessons"
  on public.course_lessons for select using (public.is_studio());
create policy "Studio can create course lessons"
  on public.course_lessons for insert with check (public.is_studio());
create policy "Studio can update course lessons"
  on public.course_lessons for update using (public.is_studio());
create policy "Studio can delete course lessons"
  on public.course_lessons for delete using (public.is_studio());

drop trigger if exists course_lessons_set_updated_at on public.course_lessons;
create trigger course_lessons_set_updated_at
  before update on public.course_lessons
  for each row execute function public.set_updated_at();

-- ============================================
-- Public catalog browsing — same shape as list_published_products /
-- get_published_product.
-- ============================================
create or replace function public.list_published_courses()
returns table (
  id uuid, title text, slug text, description text, level text,
  price numeric, currency text, cover_image_path text, lesson_count bigint, created_at timestamptz
)
language sql
security definer set search_path = public
stable
as $$
  select c.id, c.title, c.slug, c.description, c.level, c.price, c.currency, c.cover_image_path,
         (select count(*) from public.course_lessons cl where cl.course_id = c.id),
         c.created_at
  from public.courses c
  where c.status = 'published'
  order by c.created_at desc;
$$;

grant execute on function public.list_published_courses() to anon, authenticated;

create or replace function public.get_published_course(p_slug text)
returns table (
  id uuid, title text, slug text, description text, level text,
  price numeric, currency text, cover_image_path text, lesson_count bigint, created_at timestamptz
)
language sql
security definer set search_path = public
stable
as $$
  select c.id, c.title, c.slug, c.description, c.level, c.price, c.currency, c.cover_image_path,
         (select count(*) from public.course_lessons cl where cl.course_id = c.id),
         c.created_at
  from public.courses c
  where c.slug = p_slug and c.status = 'published'
  limit 1;
$$;

grant execute on function public.get_published_course(text) to anon, authenticated;

-- Lesson outline for the public detail page: title/order/duration always
-- shown; video_url/body only included for lessons marked is_preview, so
-- a prospective buyer can sample the course before paying.
create or replace function public.list_course_lessons_public(p_course_id uuid)
returns table (
  id uuid, title text, lesson_position integer, content_type text,
  duration_minutes integer, is_preview boolean, video_url text, body text
)
language sql
security definer set search_path = public
stable
as $$
  select cl.id, cl.title, cl.lesson_position, cl.content_type, cl.duration_minutes, cl.is_preview,
         case when cl.is_preview then cl.video_url else null end,
         case when cl.is_preview then cl.body else null end
  from public.course_lessons cl
  join public.courses c on c.id = cl.course_id
  where cl.course_id = p_course_id and c.status = 'published'
  order by cl.lesson_position asc, cl.created_at asc;
$$;

grant execute on function public.list_course_lessons_public(uuid) to anon, authenticated;

-- ============================================
-- Enrollments: only ever written by the buyer's own claim_free_course()
-- call or the Stripe webhook (admin client) — mirrors product_purchases.
-- ============================================
create table if not exists public.course_enrollments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  amount_paid numeric not null default 0,
  currency text not null default 'usd',
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  status text not null default 'paid' check (status in ('paid', 'refunded')),
  created_at timestamptz not null default now(),
  unique (course_id, student_id)
);

alter table public.course_enrollments enable row level security;

create policy "Students read their own enrollments, studio reads all"
  on public.course_enrollments for select
  using (student_id = auth.uid() or public.is_studio());

create policy "Studio can update enrollments"
  on public.course_enrollments for update using (public.is_studio());

create or replace function public.claim_free_course(p_course_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_price numeric;
  v_currency text;
begin
  select price, currency into v_price, v_currency
  from public.courses
  where id = p_course_id and status = 'published';

  if v_price is null then
    raise exception 'course not found';
  end if;
  if v_price <> 0 then
    raise exception 'this course is not free';
  end if;

  insert into public.course_enrollments (course_id, student_id, amount_paid, currency, status)
  values (p_course_id, auth.uid(), 0, v_currency, 'paid')
  on conflict (course_id, student_id) do nothing;
end;
$$;

grant execute on function public.claim_free_course(uuid) to authenticated;

-- ============================================
-- Lesson completion: written only through set_lesson_complete() below, so
-- a student can't mark progress on a lesson they aren't actually enrolled
-- in (or that isn't a free preview) — mirrors the enrollment-gating logic
-- rather than opening the table to direct authenticated writes.
-- ============================================
create table if not exists public.lesson_completions (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.course_lessons (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  completed_at timestamptz not null default now(),
  unique (lesson_id, student_id)
);

alter table public.lesson_completions enable row level security;

create policy "Students read their own completions, studio reads all"
  on public.lesson_completions for select
  using (student_id = auth.uid() or public.is_studio());

create or replace function public.get_my_enrollments()
returns table (
  enrollment_id uuid, amount_paid numeric, currency text, enrolled_at timestamptz,
  course_id uuid, course_title text, course_slug text, lesson_count bigint,
  completed_count bigint
)
language sql
security definer set search_path = public
stable
as $$
  select ce.id, ce.amount_paid, ce.currency, ce.created_at,
         c.id, c.title, c.slug,
         (select count(*) from public.course_lessons cl where cl.course_id = c.id),
         (select count(*) from public.lesson_completions lc
            join public.course_lessons cl on cl.id = lc.lesson_id
            where cl.course_id = c.id and lc.student_id = auth.uid())
  from public.course_enrollments ce
  join public.courses c on c.id = ce.course_id
  where ce.student_id = auth.uid() and ce.status = 'paid'
  order by ce.created_at desc;
$$;

grant execute on function public.get_my_enrollments() to authenticated;

-- Full lesson content for a student who owns the course (or is studio),
-- plus their completion flag per lesson. Locked (not enrolled, not
-- preview) rows come back with video_url/body nulled out rather than
-- omitted, so the outline/ordering still renders.
create or replace function public.get_course_lessons_for_student(p_course_id uuid)
returns table (
  id uuid, title text, lesson_position integer, content_type text,
  duration_minutes integer, is_preview boolean, video_url text, body text, completed boolean
)
language plpgsql
security definer set search_path = public
stable
as $$
declare
  v_enrolled boolean;
begin
  v_enrolled := public.is_studio() or exists (
    select 1 from public.course_enrollments ce
    where ce.course_id = p_course_id and ce.student_id = auth.uid() and ce.status = 'paid'
  );

  return query
    select cl.id, cl.title, cl.lesson_position, cl.content_type, cl.duration_minutes, cl.is_preview,
           case when v_enrolled or cl.is_preview then cl.video_url else null end,
           case when v_enrolled or cl.is_preview then cl.body else null end,
           exists (select 1 from public.lesson_completions lc where lc.lesson_id = cl.id and lc.student_id = auth.uid())
    from public.course_lessons cl
    where cl.course_id = p_course_id
    order by cl.lesson_position asc, cl.created_at asc;
end;
$$;

grant execute on function public.get_course_lessons_for_student(uuid) to authenticated;

create or replace function public.set_lesson_complete(p_lesson_id uuid, p_complete boolean)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_course_id uuid;
  v_is_preview boolean;
  v_enrolled boolean;
begin
  select course_id, is_preview into v_course_id, v_is_preview
  from public.course_lessons where id = p_lesson_id;

  if v_course_id is null then
    raise exception 'lesson not found';
  end if;

  v_enrolled := public.is_studio() or v_is_preview or exists (
    select 1 from public.course_enrollments ce
    where ce.course_id = v_course_id and ce.student_id = auth.uid() and ce.status = 'paid'
  );
  if not v_enrolled then
    raise exception 'you do not have access to this lesson';
  end if;

  if p_complete then
    insert into public.lesson_completions (lesson_id, student_id)
    values (p_lesson_id, auth.uid())
    on conflict (lesson_id, student_id) do nothing;
  else
    delete from public.lesson_completions where lesson_id = p_lesson_id and student_id = auth.uid();
  end if;
end;
$$;

grant execute on function public.set_lesson_complete(uuid, boolean) to authenticated;

-- ============================================
-- Storage: a public bucket for course cover images (same pattern as
-- product-previews). No video bucket — see the note at the top of this
-- file about video hosting being out of scope.
-- ============================================
insert into storage.buckets (id, name, public)
values ('course-covers', 'course-covers', true)
on conflict (id) do nothing;

create policy "Anyone can view course cover images"
  on storage.objects for select
  using (bucket_id = 'course-covers');

create policy "Studio can manage course cover images"
  on storage.objects for insert
  with check (bucket_id = 'course-covers' and public.is_studio());

create policy "Studio can replace course cover images"
  on storage.objects for update
  using (bucket_id = 'course-covers' and public.is_studio());

-- ============================================
-- BuildIsago Ventures: the studio's own portfolio of startups it's
-- incubating or has invested in, a public showcase of the published ones,
-- and an inbound "pitch us your startup" intake from founders.
--
-- Deliberate scope boundary, same spirit as Marketplace's "no bidding/
-- escrow" and Academy's "no video hosting": this tracks deal status and
-- shows off the portfolio — it does not run a cap table, generate term
-- sheets, or move money. Equity and investment amounts are recorded here
-- for the studio's own reference; the actual deal (legal docs, wires)
-- happens entirely outside this software, same as how a real incubator's
-- back office works.
-- ============================================
create table if not exists public.ventures (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles (id) on delete cascade,
  name text not null default 'New Venture',
  slug text not null unique,
  tagline text,
  description text,
  stage text not null default 'idea' check (stage in ('idea', 'incubating', 'launched', 'exited')),
  equity_percentage numeric check (equity_percentage is null or (equity_percentage >= 0 and equity_percentage <= 100)),
  investment_amount numeric check (investment_amount is null or investment_amount >= 0),
  currency text not null default 'usd',
  website_url text,
  logo_path text,
  founder_name text,
  founder_email text,
  notes text,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.ventures enable row level security;

create policy "Studio manages ventures"
  on public.ventures for select using (public.is_studio());
create policy "Studio can create ventures"
  on public.ventures for insert with check (public.is_studio() and created_by = auth.uid());
create policy "Studio can update ventures"
  on public.ventures for update using (public.is_studio());
create policy "Studio can delete ventures"
  on public.ventures for delete using (public.is_studio());

drop trigger if exists ventures_set_updated_at on public.ventures;
create trigger ventures_set_updated_at
  before update on public.ventures
  for each row execute function public.set_updated_at();

-- Public portfolio showcase — safe columns only. Equity/investment
-- amounts and founder contact info never leave the studio-only table.
create or replace function public.list_published_ventures()
returns table (
  id uuid, name text, slug text, tagline text, stage text, website_url text, logo_path text, created_at timestamptz
)
language sql
security definer set search_path = public
stable
as $$
  select id, name, slug, tagline, stage, website_url, logo_path, created_at
  from public.ventures
  where status = 'published'
  order by created_at desc;
$$;

grant execute on function public.list_published_ventures() to anon, authenticated;

create or replace function public.get_published_venture(p_slug text)
returns table (
  id uuid, name text, slug text, tagline text, description text, stage text, website_url text, logo_path text, created_at timestamptz
)
language sql
security definer set search_path = public
stable
as $$
  select id, name, slug, tagline, description, stage, website_url, logo_path, created_at
  from public.ventures
  where slug = p_slug and status = 'published'
  limit 1;
$$;

grant execute on function public.get_published_venture(text) to anon, authenticated;

-- ============================================
-- Applications: founders pitch a startup for the studio to consider
-- incubating. Signed-in only — same reasoning as talent_requests, no
-- anonymous writes. The studio can promote one into a tracked venture.
-- ============================================
create table if not exists public.venture_applications (
  id uuid primary key default gen_random_uuid(),
  applicant_id uuid not null references public.profiles (id) on delete cascade,
  venture_name text not null,
  tagline text,
  description text not null,
  stage text not null default 'idea' check (stage in ('idea', 'incubating', 'launched')),
  website_url text,
  status text not null default 'new' check (status in ('new', 'reviewing', 'accepted', 'declined')),
  promoted_venture_id uuid references public.ventures (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.venture_applications enable row level security;

create index if not exists venture_applications_applicant_id_idx on public.venture_applications (applicant_id);

create policy "Applicant or studio can read an application"
  on public.venture_applications for select
  using (applicant_id = auth.uid() or public.is_studio());

create policy "Any signed-in user can submit an application"
  on public.venture_applications for insert
  with check (applicant_id = auth.uid());

create policy "Studio can update applications"
  on public.venture_applications for update using (public.is_studio());

-- One-click "accept and start tracking this deal": creates a draft
-- venture prefilled from the application, links it back, and marks the
-- application accepted. The studio still fills in equity/investment/
-- notes and publishes it themselves when ready.
create or replace function public.promote_venture_application(p_application_id uuid)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_app public.venture_applications;
  v_venture_id uuid;
begin
  if not public.is_studio() then
    raise exception 'only the studio can promote an application';
  end if;

  select * into v_app from public.venture_applications where id = p_application_id;
  if v_app.id is null then
    raise exception 'application not found';
  end if;
  if v_app.promoted_venture_id is not null then
    raise exception 'this application has already been promoted';
  end if;

  insert into public.ventures (created_by, name, slug, tagline, description, stage, founder_name)
  select auth.uid(), v_app.venture_name, 'venture-' || substr(v_app.id::text, 1, 8), v_app.tagline, v_app.description, v_app.stage,
         p.full_name
  from public.profiles p where p.id = v_app.applicant_id
  returning id into v_venture_id;

  update public.venture_applications
  set status = 'accepted', promoted_venture_id = v_venture_id
  where id = p_application_id;

  return v_venture_id;
end;
$$;

grant execute on function public.promote_venture_application(uuid) to authenticated;

-- ============================================
-- Storage: a public bucket for venture logos (same pattern as
-- product-previews / course-covers).
-- ============================================
insert into storage.buckets (id, name, public)
values ('venture-logos', 'venture-logos', true)
on conflict (id) do nothing;

create policy "Anyone can view venture logos"
  on storage.objects for select
  using (bucket_id = 'venture-logos');

create policy "Studio can manage venture logos"
  on storage.objects for insert
  with check (bucket_id = 'venture-logos' and public.is_studio());

create policy "Studio can replace venture logos"
  on storage.objects for update
  using (bucket_id = 'venture-logos' and public.is_studio());

-- ============================================
-- Platform hardening: the operational infrastructure a one-person build
-- skips and a real business can't — error visibility, abuse protection,
-- an audit trail, refund status tracking, and a first cut at RBAC so not
-- every studio login has to mean full financial access.
-- ============================================

-- ============================================
-- Error log: written by the server-side logError() helper via the admin
-- client (service role), so there's no insert policy here at all — the
-- same reasoning as product_purchases only being written by trusted
-- server-side code, just with no exception for a client-callable function.
-- ============================================
create table if not exists public.error_log (
  id uuid primary key default gen_random_uuid(),
  context text not null,
  message text not null,
  detail jsonb,
  created_at timestamptz not null default now()
);

alter table public.error_log enable row level security;

create index if not exists error_log_created_at_idx on public.error_log (created_at desc);

create policy "Studio can read the error log"
  on public.error_log for select using (public.is_studio());

-- ============================================
-- Rate limiting: a generic bucketed counter, not tied to any one table.
-- Callers pick a bucket string (e.g. 'login:someone@example.com') and a
-- max-attempts/window, entirely from server actions — never called with
-- user-supplied bucket strings directly, always composed server-side, so
-- there's no injection surface even though anon can call it.
-- ============================================
create table if not exists public.rate_limit_attempts (
  id bigint generated always as identity primary key,
  bucket text not null,
  created_at timestamptz not null default now()
);

alter table public.rate_limit_attempts enable row level security;

create index if not exists rate_limit_attempts_bucket_idx on public.rate_limit_attempts (bucket, created_at);

create or replace function public.check_rate_limit(p_bucket text, p_max_attempts int, p_window_minutes int)
returns boolean
language plpgsql
security definer set search_path = public
as $$
declare
  v_count int;
begin
  -- Opportunistic cleanup instead of a cron job — cheap, and only needs
  -- to happen often enough that the table doesn't grow unbounded.
  if random() < 0.05 then
    delete from public.rate_limit_attempts where created_at < now() - interval '1 day';
  end if;

  select count(*) into v_count
  from public.rate_limit_attempts
  where bucket = p_bucket and created_at > now() - (p_window_minutes || ' minutes')::interval;

  if v_count >= p_max_attempts then
    return false;
  end if;

  insert into public.rate_limit_attempts (bucket) values (p_bucket);
  return true;
end;
$$;

grant execute on function public.check_rate_limit(text, int, int) to anon, authenticated;

-- ============================================
-- Audit log: who did what to what. Written through a SECURITY DEFINER
-- function (captures actor_id from the session automatically) rather
-- than direct inserts, so every caller — client or studio — can log an
-- action on themselves without needing a write policy on the table.
-- ============================================
create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  target_type text,
  target_id text,
  detail jsonb,
  created_at timestamptz not null default now()
);

alter table public.audit_log enable row level security;

create index if not exists audit_log_created_at_idx on public.audit_log (created_at desc);

create policy "Studio can read the audit log"
  on public.audit_log for select using (public.is_studio());

create or replace function public.log_audit_event(p_action text, p_target_type text, p_target_id text, p_detail jsonb)
returns void
language sql
security definer set search_path = public
as $$
  insert into public.audit_log (actor_id, action, target_type, target_id, detail)
  values (auth.uid(), p_action, p_target_type, p_target_id, p_detail);
$$;

grant execute on function public.log_audit_event(text, text, text, jsonb) to authenticated;

-- ============================================
-- RBAC, first cut: distinguish a studio "owner" from a limited studio
-- "member" so a future team member doesn't automatically get full
-- financial access just by being marked role = 'studio'. Defaults to
-- true so the existing studio account's access is unchanged — this is
-- additive, not a lockout. Promoting a new studio member as a
-- non-owner is a manual dashboard step, same as promotion itself.
-- ============================================
alter table public.profiles add column if not exists is_owner boolean not null default true;

create or replace function public.is_studio_owner()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'studio' and is_owner = true
  );
$$;

-- Money-moving tables become owner-only for writes; any studio member
-- can still read them (day-to-day project visibility), same as before.
drop policy if exists "Studio can create invoices" on public.project_invoices;
drop policy if exists "Studio can update invoices" on public.project_invoices;
drop policy if exists "Studio can delete draft invoices" on public.project_invoices;

create policy "Studio owner can create invoices"
  on public.project_invoices for insert with check (public.is_studio_owner() and created_by = auth.uid());
create policy "Studio owner can update invoices"
  on public.project_invoices for update using (public.is_studio_owner());
create policy "Studio owner can delete draft invoices"
  on public.project_invoices for delete using (public.is_studio_owner() and status = 'draft');

drop policy if exists "Studio can create retainers" on public.project_retainers;
drop policy if exists "Studio can update retainers" on public.project_retainers;
drop policy if exists "Studio can delete draft retainers" on public.project_retainers;

create policy "Studio owner can create retainers"
  on public.project_retainers for insert with check (public.is_studio_owner() and created_by = auth.uid());
create policy "Studio owner can update retainers"
  on public.project_retainers for update using (public.is_studio_owner());
create policy "Studio owner can delete draft retainers"
  on public.project_retainers for delete using (public.is_studio_owner() and status = 'draft');

drop policy if exists "Studio can create ventures" on public.ventures;
drop policy if exists "Studio can update ventures" on public.ventures;
drop policy if exists "Studio can delete ventures" on public.ventures;

create policy "Studio owner can create ventures"
  on public.ventures for insert with check (public.is_studio_owner() and created_by = auth.uid());
create policy "Studio owner can update ventures"
  on public.ventures for update using (public.is_studio_owner());
create policy "Studio owner can delete ventures"
  on public.ventures for delete using (public.is_studio_owner());

-- ============================================
-- Refunds: a status the schema always had a slot for (product_purchases
-- and course_enrollments already accepted 'refunded') but nothing ever
-- set — issuing a refund in the Stripe dashboard never made it back into
-- the app. Invoices didn't even have the slot. Scoped to one-time
-- payments only (invoices, products, courses) — refunding a specific
-- charge within an active retainer subscription is a rarer, more manual
-- Stripe operation and stays out of scope here.
-- ============================================
alter table public.project_invoices drop constraint if exists project_invoices_status_check;
alter table public.project_invoices add constraint project_invoices_status_check
  check (status in ('draft', 'sent', 'paid', 'void', 'refunded'));

alter table public.project_invoices add column if not exists refunded_at timestamptz;
alter table public.project_invoices add column if not exists stripe_refund_id text;
alter table public.product_purchases add column if not exists refunded_at timestamptz;
alter table public.product_purchases add column if not exists stripe_refund_id text;
alter table public.course_enrollments add column if not exists refunded_at timestamptz;
alter table public.course_enrollments add column if not exists stripe_refund_id text;

-- ============================================
-- Wire audit logging into the two existing state-changing functions that
-- matter most: becoming talent (a role change) and promoting a pitch
-- into a tracked venture. Redefining them here rather than editing the
-- original migration files, same as migration 004 did for is_studio().
-- ============================================
create or replace function public.join_marketplace_as_talent()
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_current_role text;
  v_full_name text;
  v_talent_id uuid;
begin
  select role, full_name into v_current_role, v_full_name from public.profiles where id = auth.uid();
  if v_current_role = 'studio' then
    raise exception 'studio accounts cannot join as talent';
  end if;

  -- Talent identity lives in public.talent, keyed by profile_id. That row
  -- is the membership; profiles.role is deliberately left alone. Writing
  -- role = 'talent' here used to overwrite whatever the account already
  -- was, which cost real accounts their studio access. See migration 020.

  select id into v_talent_id from public.talent where profile_id = auth.uid();
  if v_talent_id is null then
    insert into public.talent (created_by, profile_id, full_name, visibility)
    values (auth.uid(), auth.uid(), coalesce(v_full_name, 'New Talent'), 'private')
    returning id into v_talent_id;
  end if;

  perform public.log_audit_event('profile.became_talent', 'profile', auth.uid()::text, null);

  return v_talent_id;
end;
$$;

create or replace function public.promote_venture_application(p_application_id uuid)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_app public.venture_applications;
  v_venture_id uuid;
begin
  if not public.is_studio() then
    raise exception 'only the studio can promote an application';
  end if;

  select * into v_app from public.venture_applications where id = p_application_id;
  if v_app.id is null then
    raise exception 'application not found';
  end if;
  if v_app.promoted_venture_id is not null then
    raise exception 'this application has already been promoted';
  end if;

  insert into public.ventures (created_by, name, slug, tagline, description, stage, founder_name)
  select auth.uid(), v_app.venture_name, 'venture-' || substr(v_app.id::text, 1, 8), v_app.tagline, v_app.description, v_app.stage,
         p.full_name
  from public.profiles p where p.id = v_app.applicant_id
  returning id into v_venture_id;

  update public.venture_applications
  set status = 'accepted', promoted_venture_id = v_venture_id
  where id = p_application_id;

  perform public.log_audit_event(
    'venture.promoted_from_application', 'venture', v_venture_id::text,
    jsonb_build_object('application_id', p_application_id)
  );

  return v_venture_id;
end;
$$;

-- ============================================
-- Engagement mode + is_owner escalation guard (018)
-- ============================================
-- Engagement mode lives on the account, not the project: a client either
-- runs the tools themselves or has the BuildIsago team work for them.
-- Self-serve accounts don't need Approvals / Invoices / Retainers in
-- their way.
--
-- Defaults to 'managed' so every existing account keeps exactly the
-- behaviour it has today.
alter table public.profiles
  add column if not exists engagement_mode text not null default 'managed';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_engagement_mode_check'
  ) then
    alter table public.profiles
      add constraint profiles_engagement_mode_check
      check (engagement_mode in ('self_serve', 'managed'));
  end if;
end $$;

-- ============================================
-- Close an is_owner self-escalation hole
-- ============================================
-- "Users can update their own profile" is USING (auth.uid() = id) with no
-- WITH CHECK, so an authenticated studio member could PATCH their own row
-- and set is_owner = true, granting themselves the financial permissions
-- that 017 gated behind is_studio_owner() (creating/editing/deleting
-- invoices, retainers and ventures).
--
-- role was already protected by this trigger; is_owner was not. Extend it
-- rather than adding a second trigger, so both privilege columns are
-- guarded in one place. As before, this only constrains the
-- 'authenticated' role — migrations and the Supabase dashboard run as
-- other roles and are unaffected, so the documented promotion workflow
-- still works.
create or replace function public.prevent_role_self_escalation()
returns trigger
language plpgsql
as $$
begin
  if new.role is distinct from old.role
     and current_setting('role', true) = 'authenticated'
     and coalesce(current_setting('app.allow_role_change', true), 'false') <> 'true' then
    raise exception 'role cannot be changed directly — see join_marketplace_as_talent() or promote via the Supabase dashboard';
  end if;

  if new.is_owner is distinct from old.is_owner
     and current_setting('role', true) = 'authenticated'
     and coalesce(current_setting('app.allow_role_change', true), 'false') <> 'true' then
    raise exception 'is_owner cannot be changed directly — promote via the Supabase dashboard';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_prevent_role_escalation on public.profiles;
create trigger profiles_prevent_role_escalation
  before update on public.profiles
  for each row execute function public.prevent_role_self_escalation();

-- ============================================
-- Project rename / delete (019)
-- ============================================
-- Projects could be created but never renamed or deleted through the
-- app. Two separate gaps:
--
--   * the only UPDATE policy is "Studio can update any project", so a
--     client could not change their own project's title at all
--   * there is no DELETE policy of any kind, so nobody could delete a
--     project — it had to be done in SQL
--
-- Both are done with SECURITY DEFINER functions rather than by opening
-- broad policies:
--
--   Rename — a client UPDATE policy on projects would also let clients
--   write status, due_date, priority and client_id. That last one is a
--   handover of the row to another account. Renaming should not carry
--   that, so the function writes exactly one column.
--
--   Delete — deleting a project cascades to its invoices, so a client
--   could erase their own billing history. The function refuses while
--   any invoice has left draft.

create or replace function public.rename_project(p_project_id uuid, p_title text)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_title text := btrim(coalesce(p_title, ''));
begin
  if v_title = '' then
    raise exception 'A project needs a name.';
  end if;
  if length(v_title) > 120 then
    raise exception 'That name is too long — 120 characters at most.';
  end if;

  if not exists (
    select 1 from public.projects
    where id = p_project_id
      and (client_id = auth.uid() or public.is_studio())
  ) then
    raise exception 'Project not found.';
  end if;

  update public.projects set title = v_title where id = p_project_id;
end;
$$;

grant execute on function public.rename_project(uuid, text) to authenticated;

create or replace function public.delete_project(p_project_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not exists (
    select 1 from public.projects
    where id = p_project_id
      and (client_id = auth.uid() or public.is_studio())
  ) then
    raise exception 'Project not found.';
  end if;

  -- Invoices cascade with the project. Anything past draft is a real
  -- financial record, so it has to be voided deliberately rather than
  -- disappearing as a side effect of tidying up a project.
  if exists (
    select 1 from public.project_invoices
    where project_id = p_project_id and status <> 'draft'
  ) then
    raise exception 'This project has invoices — void them before deleting it.';
  end if;

  delete from public.projects where id = p_project_id;
end;
$$;

grant execute on function public.delete_project(uuid) to authenticated;

-- ============================================
-- RPC exposure (migration 021)
-- ============================================
-- PostgreSQL grants EXECUTE on every new function to PUBLIC, and Supabase's
-- anon role inherits it there — so without this block every function below
-- answers unauthenticated requests at /rest/v1/rpc/<name>. Revoking from
-- `anon` alone does nothing; PUBLIC is what has to go.
--
-- Deliberately left open to anon: check_rate_limit (login, signup and
-- password reset call it before anyone is signed in) and the
-- list_published_*/get_public_* family (the storefront and marketing pages
-- have no session by design).
revoke execute on function public.log_audit_event(text, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.log_audit_event(text, text, text, jsonb) to authenticated, service_role;
revoke execute on function public.next_invoice_number() from public, anon, authenticated;
grant execute on function public.next_invoice_number() to authenticated, service_role;
-- is_studio() keeps anon EXECUTE: the public-bucket storage policies call
-- it, and a policy anon can reach has to be evaluable by anon or the check
-- raises instead of returning false. It leaks nothing — for a logged-out
-- caller it is always false.
revoke execute on function public.is_studio() from public;
grant execute on function public.is_studio() to anon, authenticated, service_role;
revoke execute on function public.is_studio_owner() from public, anon, authenticated;
grant execute on function public.is_studio_owner() to authenticated, service_role;
revoke execute on function public.join_marketplace_as_talent() from public, anon, authenticated;
grant execute on function public.join_marketplace_as_talent() to authenticated, service_role;
revoke execute on function public.promote_venture_application(uuid) from public, anon, authenticated;
grant execute on function public.promote_venture_application(uuid) to authenticated, service_role;
revoke execute on function public.claim_free_course(uuid) from public, anon, authenticated;
grant execute on function public.claim_free_course(uuid) to authenticated, service_role;
revoke execute on function public.claim_free_product(uuid) from public, anon, authenticated;
grant execute on function public.claim_free_product(uuid) to authenticated, service_role;
revoke execute on function public.decide_approval(uuid, text, text) from public, anon, authenticated;
grant execute on function public.decide_approval(uuid, text, text) to authenticated, service_role;
revoke execute on function public.delete_project(uuid) from public, anon, authenticated;
grant execute on function public.delete_project(uuid) to authenticated, service_role;
revoke execute on function public.rename_project(uuid, text) from public, anon, authenticated;
grant execute on function public.rename_project(uuid, text) to authenticated, service_role;
revoke execute on function public.request_cancel_retainer(uuid) from public, anon, authenticated;
grant execute on function public.request_cancel_retainer(uuid) to authenticated, service_role;
revoke execute on function public.set_lesson_complete(uuid, boolean) from public, anon, authenticated;
grant execute on function public.set_lesson_complete(uuid, boolean) to authenticated, service_role;
revoke execute on function public.set_project_ai_draft(uuid, text) from public, anon, authenticated;
grant execute on function public.set_project_ai_draft(uuid, text) to authenticated, service_role;
revoke execute on function public.get_course_lessons_for_student(uuid) from public, anon, authenticated;
grant execute on function public.get_course_lessons_for_student(uuid) to authenticated, service_role;
revoke execute on function public.get_my_enrollments() from public, anon, authenticated;
grant execute on function public.get_my_enrollments() to authenticated, service_role;
revoke execute on function public.get_my_purchases() from public, anon, authenticated;
grant execute on function public.get_my_purchases() to authenticated, service_role;

-- The auth trigger, not an API. Removing EXECUTE does not stop the trigger:
-- PostgreSQL checks EXECUTE on a trigger function when the trigger is
-- created, not when it fires.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
grant execute on function public.handle_new_user() to service_role;
