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

  perform set_config('app.allow_role_change', 'true', true);
  update public.profiles set role = 'talent' where id = auth.uid();

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
