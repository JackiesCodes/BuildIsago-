-- ============================================
-- Actually revoke the internal RPCs — migration 020 did not
-- ============================================
-- 020 ran `revoke execute ... from anon`, which removed the explicit
-- anon grant but changed nothing: PostgreSQL grants EXECUTE on every new
-- function to PUBLIC by default, and anon inherits it there. The ACLs
-- afterwards still read `{=X/postgres,...}` — that leading `=X` is the
-- PUBLIC grant — and has_function_privilege('anon', …) still returned
-- true for all seventeen. Revoking from PUBLIC is what does it.
--
-- Each function below therefore has its grants rebuilt from nothing:
-- revoke from PUBLIC (and the two API roles, so no stale explicit grant
-- survives), then grant back only to the roles that call it. postgres
-- owns them all and keeps access as owner regardless.
--
-- service_role is granted alongside authenticated because server-side
-- code paths (the Stripe webhook, any admin task) use it and must not
-- start failing on a permission error.
--
-- Verified with has_function_privilege() after applying, not assumed.

-- Called by signed-in users through server actions.
revoke execute on function public.log_audit_event(text, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.log_audit_event(text, text, text, jsonb) to authenticated, service_role;

revoke execute on function public.next_invoice_number() from public, anon, authenticated;
grant execute on function public.next_invoice_number() to authenticated, service_role;

revoke execute on function public.is_studio() from public, anon, authenticated;
grant execute on function public.is_studio() to authenticated, service_role;

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

-- handle_new_user() is the auth trigger, not an API — nobody should be
-- able to call it over REST.
--
-- Removing EXECUTE does not stop the trigger. PostgreSQL checks EXECUTE
-- on a trigger function when the trigger is created, not when it fires.
-- Confirmed here before applying this, with a throwaway table, trigger
-- and function: with EXECUTE revoked from PUBLIC, anon and authenticated,
-- an INSERT run as `authenticated` still fired the trigger and wrote its
-- row (has_function_privilege → false, rows written → 1). Signup is
-- unaffected.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
grant execute on function public.handle_new_user() to service_role;
