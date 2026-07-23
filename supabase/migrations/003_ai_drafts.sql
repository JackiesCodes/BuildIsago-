-- BuildIsago Client Portal — migration 003
-- Adds AI-generated first-draft briefs per project.
-- Run this once in the Supabase SQL Editor (Project > SQL Editor > New query).

alter table public.projects add column if not exists ai_draft text;
alter table public.projects add column if not exists ai_draft_generated_at timestamptz;

-- Clients can trigger their own project's AI draft without gaining the
-- broader "studio can update any project" write access (status, priority,
-- due_date stay studio-only). SECURITY DEFINER bypasses the normal RLS
-- update policy for this one narrow, explicitly-checked write.
create or replace function public.set_project_ai_draft(p_project_id uuid, p_draft text)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not exists (
    select 1 from public.projects pr
    where pr.id = p_project_id
      and (
        pr.client_id = auth.uid()
        or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'studio')
      )
  ) then
    raise exception 'not authorized';
  end if;

  update public.projects
  set ai_draft = p_draft, ai_draft_generated_at = now()
  where id = p_project_id;
end;
$$;

grant execute on function public.set_project_ai_draft(uuid, text) to authenticated;
