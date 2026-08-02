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
