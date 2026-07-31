-- ============================================
-- Digital Products storefront: a public catalog (UI kits, templates,
-- design systems) that isn't tied to any client project. Anyone can
-- browse without an account; buying (or claiming a free one) requires
-- signing in, and downloading requires a completed purchase.
--
-- Unlike every other public-read feature so far (get_public_brand_kit),
-- there's no per-row secret token here — "public" really does mean
-- anyone. Rather than opening RLS on the products table itself to anon,
-- this keeps the table studio-only (mirrors every other table in this
-- schema) and exposes only a safe, explicit column list — never
-- file_path, the private storage path — through two SECURITY DEFINER
-- functions.
-- ============================================
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles (id) on delete cascade,
  title text not null default 'New Product',
  slug text not null unique,
  description text,
  category text not null default 'ui_kit'
    check (category in ('ui_kit', 'website_template', 'brand_template', 'design_system')),
  price numeric not null default 0 check (price >= 0),
  currency text not null default 'usd',
  preview_image_path text,
  file_path text,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.products enable row level security;

create policy "Studio manages products"
  on public.products for select using (public.is_studio());
create policy "Studio can create products"
  on public.products for insert with check (public.is_studio() and created_by = auth.uid());
create policy "Studio can update products"
  on public.products for update using (public.is_studio());
create policy "Studio can delete products"
  on public.products for delete using (public.is_studio());

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

create or replace function public.list_published_products()
returns table (
  id uuid, title text, slug text, description text, category text,
  price numeric, currency text, preview_image_path text, created_at timestamptz
)
language sql
security definer set search_path = public
stable
as $$
  select id, title, slug, description, category, price, currency, preview_image_path, created_at
  from public.products
  where status = 'published'
  order by created_at desc;
$$;

grant execute on function public.list_published_products() to anon, authenticated;

create or replace function public.get_published_product(p_slug text)
returns table (
  id uuid, title text, slug text, description text, category text,
  price numeric, currency text, preview_image_path text, created_at timestamptz
)
language sql
security definer set search_path = public
stable
as $$
  select id, title, slug, description, category, price, currency, preview_image_path, created_at
  from public.products
  where slug = p_slug and status = 'published'
  limit 1;
$$;

grant execute on function public.get_published_product(text) to anon, authenticated;

-- ============================================
-- Purchases: only ever written by the buyer's own claim_free_product()
-- call or the Stripe webhook (via the admin client) — never a normal
-- insert/update from the app, so there's no policy for either here.
-- ============================================
create table if not exists public.product_purchases (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  buyer_id uuid not null references public.profiles (id) on delete cascade,
  amount_paid numeric not null default 0,
  currency text not null default 'usd',
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  status text not null default 'paid' check (status in ('paid', 'refunded')),
  created_at timestamptz not null default now(),
  unique (product_id, buyer_id)
);

alter table public.product_purchases enable row level security;

create policy "Buyers read their own purchases, studio reads all"
  on public.product_purchases for select
  using (buyer_id = auth.uid() or public.is_studio());

create policy "Studio can update purchases"
  on public.product_purchases for update using (public.is_studio());

create or replace function public.claim_free_product(p_product_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_price numeric;
  v_currency text;
begin
  select price, currency into v_price, v_currency
  from public.products
  where id = p_product_id and status = 'published';

  if v_price is null then
    raise exception 'product not found';
  end if;
  if v_price <> 0 then
    raise exception 'this product is not free';
  end if;

  insert into public.product_purchases (product_id, buyer_id, amount_paid, currency, status)
  values (p_product_id, auth.uid(), 0, v_currency, 'paid')
  on conflict (product_id, buyer_id) do nothing;
end;
$$;

grant execute on function public.claim_free_product(uuid) to authenticated;

-- A buyer's own session can read their product_purchases rows directly
-- (RLS allows it), but products RLS is studio-only, so a normal embedded
-- join (product_purchases -> products) would come back with every
-- product field null for a non-studio buyer. This returns just the safe
-- display columns instead of opening up products RLS more broadly.
create or replace function public.get_my_purchases()
returns table (
  purchase_id uuid, amount_paid numeric, currency text, purchased_at timestamptz,
  product_id uuid, product_title text, product_slug text, product_category text
)
language sql
security definer set search_path = public
stable
as $$
  select pp.id, pp.amount_paid, pp.currency, pp.created_at,
         p.id, p.title, p.slug, p.category
  from public.product_purchases pp
  join public.products p on p.id = pp.product_id
  where pp.buyer_id = auth.uid() and pp.status = 'paid'
  order by pp.created_at desc;
$$;

grant execute on function public.get_my_purchases() to authenticated;

-- ============================================
-- Storage: a public bucket for storefront preview images, and a private
-- one for the actual downloadable files, gated on a matching paid row in
-- product_purchases the same way project-files is gated on project
-- membership.
-- ============================================
insert into storage.buckets (id, name, public)
values ('product-previews', 'product-previews', true)
on conflict (id) do nothing;

create policy "Anyone can view product preview images"
  on storage.objects for select
  using (bucket_id = 'product-previews');

create policy "Studio can manage product preview images"
  on storage.objects for insert
  with check (bucket_id = 'product-previews' and public.is_studio());

create policy "Studio can replace product preview images"
  on storage.objects for update
  using (bucket_id = 'product-previews' and public.is_studio());

insert into storage.buckets (id, name, public)
values ('product-files', 'product-files', false)
on conflict (id) do nothing;

create policy "Studio can manage product files"
  on storage.objects for insert
  with check (bucket_id = 'product-files' and public.is_studio());

create policy "Studio can replace product files"
  on storage.objects for update
  using (bucket_id = 'product-files' and public.is_studio());

-- Files are stored as "<product_id>/<filename>" — the policy below checks
-- that the product referenced by the folder name has a paid purchase row
-- for the caller.
create policy "Buyers can download purchased product files"
  on storage.objects for select
  using (
    bucket_id = 'product-files'
    and (
      public.is_studio()
      or exists (
        select 1 from public.product_purchases pp
        where pp.product_id::text = (storage.foldername(name))[1]
          and pp.buyer_id = auth.uid()
          and pp.status = 'paid'
      )
    )
  );
