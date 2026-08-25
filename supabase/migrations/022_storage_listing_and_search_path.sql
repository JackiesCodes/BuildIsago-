-- ============================================
-- 1. Stop anonymous listing of the three public buckets
-- ============================================
-- course-covers, product-previews and venture-logos each had a blanket
-- "Anyone can view" SELECT policy on storage.objects. On a bucket marked
-- public that policy is not what makes images load — public buckets serve
-- /storage/v1/object/public/<bucket>/<path> straight from the CDN without
-- consulting RLS at all, and lib/utils/storage.js only ever builds URLs
-- that way (getPublicUrl is pure string construction). What the policy
-- did add was the ability to *list* the buckets and enumerate every
-- filename in them.
--
-- SELECT is kept for the studio, because the admin uploaders replace
-- objects (upsert) and that path does go through RLS.
drop policy if exists "Anyone can view course cover images" on storage.objects;
drop policy if exists "Anyone can view product preview images" on storage.objects;
drop policy if exists "Anyone can view venture logos" on storage.objects;

create policy "Studio can list course cover images"
  on storage.objects for select
  using (bucket_id = 'course-covers' and public.is_studio());

create policy "Studio can list product preview images"
  on storage.objects for select
  using (bucket_id = 'product-previews' and public.is_studio());

create policy "Studio can list venture logos"
  on storage.objects for select
  using (bucket_id = 'venture-logos' and public.is_studio());

-- ============================================
-- 2. Pin search_path on the two functions that were missing it
-- ============================================
-- Every other function in this schema is already `set search_path = public`.
-- These two were not, which means the schema they resolve unqualified names
-- in depends on the caller's search_path. Both run as triggers on writes:
-- set_updated_at across most tables, and prevent_role_self_escalation on
-- profiles — the guard that stops an account granting itself role='studio'
-- or is_owner. A security trigger is the last function that should resolve
-- its names somewhere the caller chose.
alter function public.set_updated_at() set search_path = public;
alter function public.prevent_role_self_escalation() set search_path = public;

-- ============================================
-- 3. Give `anon` back EXECUTE on is_studio()
-- ============================================
-- Migration 021 revoked this as hygiene: is_studio() returns false for a
-- logged-out caller, so exposing it over REST leaked nothing, but nothing
-- needed it either. The storage policies above changed that — they call
-- is_studio(), and a policy anon can reach must be evaluable by anon.
-- Without the grant the check does not return false, it raises
-- "permission denied for function is_studio", turning a clean deny into an
-- error. Verified after applying: anon enumerates 0 objects rather than
-- erroring.
grant execute on function public.is_studio() to anon;
