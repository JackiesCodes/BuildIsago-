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

  perform set_config('app.allow_role_change', 'true', true);
  update public.profiles set role = 'talent' where id = auth.uid();

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
