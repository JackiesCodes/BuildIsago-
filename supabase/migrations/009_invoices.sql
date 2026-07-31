-- ============================================
-- Invoices & payments: studio-issued invoices per project, paid via
-- Stripe Checkout. Everything except the "mark paid" write goes through
-- normal RLS as the signed-in studio user. The Stripe webhook has no user
-- session at all, so it authenticates as the Supabase secret key instead
-- (see lib/supabase/admin.js) and is the only thing trusted to flip an
-- invoice to 'paid'.
-- ============================================
create sequence if not exists public.invoice_number_seq start 1;

create or replace function public.next_invoice_number()
returns text
language sql
security definer set search_path = public
as $$
  select 'INV-' || lpad(nextval('public.invoice_number_seq')::text, 4, '0');
$$;

grant execute on function public.next_invoice_number() to authenticated;

create table if not exists public.project_invoices (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  created_by uuid not null references public.profiles (id) on delete cascade,
  invoice_number text not null unique,
  status text not null default 'draft' check (status in ('draft', 'sent', 'paid', 'void')),
  currency text not null default 'usd',
  line_items jsonb not null default '[]'::jsonb,
  tax_rate numeric not null default 0,
  notes text,
  due_date date,
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  sent_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.project_invoices enable row level security;

create index if not exists project_invoices_project_id_idx on public.project_invoices (project_id);

-- Drafts are internal — a client can't read one until the studio sends it.
create policy "Participants can read non-draft invoices, studio reads all"
  on public.project_invoices for select
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

create policy "Studio can create invoices"
  on public.project_invoices for insert
  with check (public.is_studio() and created_by = auth.uid());

create policy "Studio can update invoices"
  on public.project_invoices for update
  using (public.is_studio());

create policy "Studio can delete draft invoices"
  on public.project_invoices for delete
  using (public.is_studio() and status = 'draft');

drop trigger if exists project_invoices_set_updated_at on public.project_invoices;
create trigger project_invoices_set_updated_at
  before update on public.project_invoices
  for each row execute function public.set_updated_at();
