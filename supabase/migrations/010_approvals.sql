-- ============================================
-- Approvals: studio asks a client to sign off on something (a direction,
-- a brief, a scope, optionally a specific design) and the client approves
-- or requests changes with feedback. Mirrors the invoices draft/sent
-- lifecycle: drafts are studio-only and invisible to the client until sent.
--
-- The client's decision doesn't go through a normal RLS update (unlike the
-- studio's own edits) — it's a plain authenticated action, not a webhook,
-- so it goes through the decide_approval() SECURITY DEFINER function
-- instead, which only touches the decision fields and only while the
-- approval is still 'pending'. This mirrors the existing
-- set_project_ai_draft() function rather than opening up a broad column
-- for client-side row updates.
-- ============================================
create table if not exists public.project_approvals (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  created_by uuid not null references public.profiles (id) on delete cascade,
  title text not null default 'Approval request',
  description text,
  design_id uuid references public.project_designs (id) on delete set null,
  status text not null default 'draft' check (status in ('draft', 'pending', 'approved', 'changes_requested')),
  decided_by uuid references public.profiles (id) on delete set null,
  feedback text,
  sent_at timestamptz,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.project_approvals enable row level security;

create index if not exists project_approvals_project_id_idx on public.project_approvals (project_id);

-- Drafts are internal — a client can't read one until the studio sends it.
create policy "Participants can read non-draft approvals, studio reads all"
  on public.project_approvals for select
  using (
    public.is_studio()
    or (
      status <> 'draft'
      and exists (
        select 1 from public.projects pr
        where pr.id = project_id and pr.client_id = auth.uid()
      )
    )
  );

create policy "Studio can create approvals"
  on public.project_approvals for insert
  with check (public.is_studio() and created_by = auth.uid());

create policy "Studio can update approvals"
  on public.project_approvals for update
  using (public.is_studio());

create policy "Studio can delete draft approvals"
  on public.project_approvals for delete
  using (public.is_studio() and status = 'draft');

drop trigger if exists project_approvals_set_updated_at on public.project_approvals;
create trigger project_approvals_set_updated_at
  before update on public.project_approvals
  for each row execute function public.set_updated_at();

create or replace function public.decide_approval(p_approval_id uuid, p_decision text, p_feedback text default null)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_project_id uuid;
  v_client_id uuid;
begin
  if p_decision not in ('approved', 'changes_requested') then
    raise exception 'invalid decision';
  end if;

  select a.project_id, pr.client_id into v_project_id, v_client_id
  from public.project_approvals a
  join public.projects pr on pr.id = a.project_id
  where a.id = p_approval_id and a.status = 'pending';

  if v_project_id is null then
    raise exception 'approval not found or not pending';
  end if;

  if v_client_id <> auth.uid() and not public.is_studio() then
    raise exception 'not authorized';
  end if;

  update public.project_approvals
  set status = p_decision, decided_by = auth.uid(), decided_at = now(), feedback = p_feedback
  where id = p_approval_id;
end;
$$;

grant execute on function public.decide_approval(uuid, text, text) to authenticated;
