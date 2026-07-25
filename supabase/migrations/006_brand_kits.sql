-- Brand Studio: one brand kit per project (colors, type, voice), plus a
-- token-based public "Brand Guidelines" page that doesn't require login.
create table if not exists public.project_brand_kits (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null unique references public.projects (id) on delete cascade,
  created_by uuid not null references public.profiles (id) on delete cascade,
  colors jsonb not null default '[]'::jsonb,
  heading_font text not null default 'Space Grotesk',
  body_font text not null default 'Inter',
  tagline text,
  voice_tone text,
  share_token uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.project_brand_kits enable row level security;

create policy "Participants can read brand kits"
  on public.project_brand_kits for select
  using (
    exists (
      select 1 from public.projects pr
      where pr.id = project_id
        and (pr.client_id = auth.uid() or public.is_studio())
    )
  );

create policy "Participants can create brand kits"
  on public.project_brand_kits for insert
  with check (
    created_by = auth.uid()
    and exists (
      select 1 from public.projects pr
      where pr.id = project_id
        and (pr.client_id = auth.uid() or public.is_studio())
    )
  );

create policy "Participants can update brand kits"
  on public.project_brand_kits for update
  using (
    exists (
      select 1 from public.projects pr
      where pr.id = project_id
        and (pr.client_id = auth.uid() or public.is_studio())
    )
  );

drop trigger if exists project_brand_kits_set_updated_at on public.project_brand_kits;
create trigger project_brand_kits_set_updated_at
  before update on public.project_brand_kits
  for each row execute function public.set_updated_at();

-- Public read access for the shareable guidelines page, scoped by an
-- unguessable share_token rather than opening RLS to anon entirely.
create or replace function public.get_public_brand_kit(p_token uuid)
returns table (
  project_title text,
  colors jsonb,
  heading_font text,
  body_font text,
  tagline text,
  voice_tone text,
  updated_at timestamptz
)
language sql
security definer set search_path = public
stable
as $$
  select pr.title, bk.colors, bk.heading_font, bk.body_font, bk.tagline, bk.voice_tone, bk.updated_at
  from public.project_brand_kits bk
  join public.projects pr on pr.id = bk.project_id
  where bk.share_token = p_token;
$$;

grant execute on function public.get_public_brand_kit(uuid) to anon, authenticated;
