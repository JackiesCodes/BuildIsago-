-- ============================================
-- Retainers: recurring billing on a project — "Design Support," "Brand
-- Management," a monthly "Startup Growth Package," anything billed on a
-- schedule rather than once. Same draft/sent lifecycle as invoices, but
-- backed by a Stripe Subscription instead of a one-time Checkout.
--
-- Status is kept in sync by the Stripe webhook (customer.subscription.*
-- events), same trust model as invoices: the webhook runs with the admin
-- client, no user session. The one exception is cancellation, which a
-- client can also request — that still has to actually call Stripe's API
-- first (only a server action holding STRIPE_SECRET_KEY can do that), so
-- request_cancel_retainer() only persists the "it's canceled" status
-- afterward. It never talks to Stripe itself.
-- ============================================
create table if not exists public.project_retainers (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  created_by uuid not null references public.profiles (id) on delete cascade,
  title text not null default 'Retainer',
  description text,
  amount numeric not null default 0 check (amount >= 0),
  currency text not null default 'usd',
  interval text not null default 'month' check (interval in ('month', 'year')),
  status text not null default 'draft'
    check (status in ('draft', 'pending', 'active', 'past_due', 'canceled')),
  stripe_subscription_id text,
  stripe_customer_id text,
  stripe_checkout_session_id text,
  current_period_end timestamptz,
  sent_at timestamptz,
  canceled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.project_retainers enable row level security;

create index if not exists project_retainers_project_id_idx on public.project_retainers (project_id);
create index if not exists project_retainers_stripe_subscription_id_idx on public.project_retainers (stripe_subscription_id);

-- Drafts are internal — a client can't see one until the studio sends it.
create policy "Participants can read non-draft retainers, studio reads all"
  on public.project_retainers for select
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

create policy "Studio can create retainers"
  on public.project_retainers for insert
  with check (public.is_studio() and created_by = auth.uid());

create policy "Studio can update retainers"
  on public.project_retainers for update using (public.is_studio());

create policy "Studio can delete draft retainers"
  on public.project_retainers for delete using (public.is_studio() and status = 'draft');

drop trigger if exists project_retainers_set_updated_at on public.project_retainers;
create trigger project_retainers_set_updated_at
  before update on public.project_retainers
  for each row execute function public.set_updated_at();

create or replace function public.request_cancel_retainer(p_retainer_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_project_id uuid;
  v_client_id uuid;
  v_status text;
begin
  select r.project_id, r.status, pr.client_id into v_project_id, v_status, v_client_id
  from public.project_retainers r
  join public.projects pr on pr.id = r.project_id
  where r.id = p_retainer_id;

  if v_project_id is null then
    raise exception 'retainer not found';
  end if;
  if v_client_id <> auth.uid() and not public.is_studio() then
    raise exception 'not authorized';
  end if;
  if v_status not in ('pending', 'active', 'past_due') then
    raise exception 'this retainer cannot be canceled';
  end if;

  update public.project_retainers
  set status = 'canceled', canceled_at = now()
  where id = p_retainer_id;
end;
$$;

grant execute on function public.request_cancel_retainer(uuid) to authenticated;
