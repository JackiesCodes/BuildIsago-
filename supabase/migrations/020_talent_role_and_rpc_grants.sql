-- ============================================
-- 1. Joining the marketplace as talent must not destroy your account role
-- ============================================
-- join_marketplace_as_talent() wrote `role = 'talent'` over whatever the
-- account already was. Nothing reads that value: every talent RLS policy
-- keys off `talent.profile_id = auth.uid()`, and the app's only role
-- checks are for 'studio' (the dashboard treats every other value as a
-- client). So the write bought nothing and cost the account its real
-- role.
--
-- It cost this project its only studio account. The owner joined the
-- marketplace on 2026-08-02 (audit_log: profile.became_talent) and every
-- /dashboard/studio page has redirected them to the client dashboard
-- since, because they all test `role !== 'studio'`.
--
-- The guard against studio accounts joining stays — a studio listing
-- itself in its own talent marketplace is a product question, not a
-- security one, and this migration is not the place to change it.
--
-- Dropping the role write also lets the app.allow_role_change escape
-- hatch go: with no role change there is nothing for the
-- prevent_role_self_escalation trigger to be talked out of.
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
  -- is the membership; profiles.role is left exactly as it was.
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

-- ============================================
-- 2. Stop exposing internal SECURITY DEFINER functions to `anon`
-- ============================================
-- Supabase grants EXECUTE on every public function to anon and
-- authenticated by default, so each one below is reachable unauthenticated
-- at /rest/v1/rpc/<name>. Two of these are actually abusable rather than
-- merely untidy:
--
--   log_audit_event   — writes an audit row with a caller-supplied action
--                       string and a null actor. Anyone on the internet
--                       could forge entries into the audit trail.
--   next_invoice_number — bumps a sequence, so anyone could burn invoice
--                       numbers and leave gaps in the studio's books.
--
-- The rest are no-ops for a logged-out caller (they resolve auth.uid() to
-- null and find nothing), but there is no reason for them to answer an
-- unauthenticated request at all.
--
-- Deliberately NOT revoked from anon:
--   check_rate_limit  — login, signup and password-reset call it before
--                       anyone is signed in. Revoking it would silently
--                       disable rate limiting on exactly the endpoints
--                       that need it.
--   list_published_* / get_published_* / list_public_talent /
--   get_public_talent / get_public_brand_kit / list_course_lessons_public
--                     — these serve the public storefront and marketing
--                       pages, which have no session by design.
revoke execute on function public.log_audit_event(text, text, text, jsonb) from anon;
revoke execute on function public.next_invoice_number() from anon;
revoke execute on function public.is_studio() from anon;
revoke execute on function public.is_studio_owner() from anon;
revoke execute on function public.join_marketplace_as_talent() from anon;
revoke execute on function public.promote_venture_application(uuid) from anon;
revoke execute on function public.claim_free_course(uuid) from anon;
revoke execute on function public.claim_free_product(uuid) from anon;
revoke execute on function public.decide_approval(uuid, text, text) from anon;
revoke execute on function public.delete_project(uuid) from anon;
revoke execute on function public.rename_project(uuid, text) from anon;
revoke execute on function public.request_cancel_retainer(uuid) from anon;
revoke execute on function public.set_lesson_complete(uuid, boolean) from anon;
revoke execute on function public.set_project_ai_draft(uuid, text) from anon;
revoke execute on function public.get_course_lessons_for_student(uuid) from anon;
revoke execute on function public.get_my_enrollments() from anon;
revoke execute on function public.get_my_purchases() from anon;

-- handle_new_user() is an auth trigger, not an API. It has no business
-- being callable over REST by anyone.
revoke execute on function public.handle_new_user() from anon, authenticated;
