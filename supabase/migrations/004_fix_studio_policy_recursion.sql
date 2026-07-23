-- Fixes "infinite recursion detected in policy for relation 'profiles'".
--
-- The "studio can see/do everything" policies checked role by running
-- `exists (select ... from public.profiles where id = auth.uid() and role = 'studio')`
-- directly inside a policy on `profiles` itself (and, transitively, inside
-- policies on other tables that also queried `profiles`). Postgres re-enters
-- the RLS policy on `profiles` while evaluating that subquery, which
-- triggers infinite recursion.
--
-- Fix: move the role check into a SECURITY DEFINER function, which runs
-- with the privileges of its owner and bypasses RLS on `profiles` entirely,
-- so it never re-triggers the policy it's being called from.

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

-- ---- profiles ----
drop policy if exists "Profiles are viewable by owner or studio" on public.profiles;
create policy "Profiles are viewable by owner or studio"
  on public.profiles for select
  using (
    auth.uid() = id
    or public.is_studio()
  );

-- ---- projects ----
drop policy if exists "Clients see own projects, studio sees all" on public.projects;
create policy "Clients see own projects, studio sees all"
  on public.projects for select
  using (
    client_id = auth.uid()
    or public.is_studio()
  );

drop policy if exists "Studio can update any project" on public.projects;
create policy "Studio can update any project"
  on public.projects for update
  using (public.is_studio());

-- ---- messages ----
drop policy if exists "Participants can read project messages" on public.messages;
create policy "Participants can read project messages"
  on public.messages for select
  using (
    exists (
      select 1 from public.projects pr
      where pr.id = project_id
        and (pr.client_id = auth.uid() or public.is_studio())
    )
  );

drop policy if exists "Participants can send project messages" on public.messages;
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

-- ---- project_files ----
drop policy if exists "Participants can read project file records" on public.project_files;
create policy "Participants can read project file records"
  on public.project_files for select
  using (
    exists (
      select 1 from public.projects pr
      where pr.id = project_id
        and (pr.client_id = auth.uid() or public.is_studio())
    )
  );

drop policy if exists "Participants can add project file records" on public.project_files;
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

-- ---- storage.objects (project-files bucket) ----
drop policy if exists "Participants can read project files in storage" on storage.objects;
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

drop policy if exists "Participants can upload project files to storage" on storage.objects;
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

-- ---- project_milestones ----
drop policy if exists "Participants can read project milestones" on public.project_milestones;
create policy "Participants can read project milestones"
  on public.project_milestones for select
  using (
    exists (
      select 1 from public.projects pr
      where pr.id = project_id
        and (pr.client_id = auth.uid() or public.is_studio())
    )
  );

drop policy if exists "Participants can seed project milestones" on public.project_milestones;
create policy "Participants can seed project milestones"
  on public.project_milestones for insert
  with check (
    exists (
      select 1 from public.projects pr
      where pr.id = project_id
        and (pr.client_id = auth.uid() or public.is_studio())
    )
  );

drop policy if exists "Studio can update project milestones" on public.project_milestones;
create policy "Studio can update project milestones"
  on public.project_milestones for update
  using (public.is_studio());

-- ---- AI draft RPC ----
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
