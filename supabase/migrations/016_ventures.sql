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
