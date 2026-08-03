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
