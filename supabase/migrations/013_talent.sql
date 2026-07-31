-- ============================================
-- Talent roster: a private directory of freelance designers, developers,
-- and creative talent the studio can pull in for extra project capacity.
-- Unlike everything else built so far, this is purely internal — no
-- client ever sees it, there's no draft/sent lifecycle, and no new
-- account type. It's a studio-only address book.
-- ============================================
create table if not exists public.talent (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles (id) on delete cascade,
  full_name text not null,
  discipline text not null default 'designer'
    check (discipline in ('designer', 'developer', 'creative', 'other')),
  specialties jsonb not null default '[]'::jsonb,
  email text,
  phone text,
  rate numeric,
  rate_currency text not null default 'usd',
  rate_unit text not null default 'hourly' check (rate_unit in ('hourly', 'project')),
  portfolio_url text,
  notes text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.talent enable row level security;

create policy "Studio manages talent"
  on public.talent for select using (public.is_studio());
create policy "Studio can add talent"
  on public.talent for insert with check (public.is_studio() and created_by = auth.uid());
create policy "Studio can update talent"
  on public.talent for update using (public.is_studio());
create policy "Studio can delete talent"
  on public.talent for delete using (public.is_studio());

drop trigger if exists talent_set_updated_at on public.talent;
create trigger talent_set_updated_at
  before update on public.talent
  for each row execute function public.set_updated_at();
