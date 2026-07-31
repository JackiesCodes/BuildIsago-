-- ============================================
-- BuildIsago Academy: courses made of ordered lessons (video link and/or
-- text), sold like Digital Products (free or paid, one-time purchase —
-- "enrollment"), with per-student lesson-completion tracking.
--
-- Deliberate scope boundary, same spirit as Marketplace's "no bidding/
-- escrow": lessons hold an external video URL (YouTube/Vimeo/Loom/etc.)
-- pasted by the studio rather than an uploaded, storage-hosted video file.
-- Building real video hosting/streaming/DRM is a different, much larger
-- project than what "training & skills development" needs right now. No
-- quizzes or certificates either — just structured lessons + progress.
--
-- Follows the products.sql pattern throughout: courses/lessons stay
-- studio-only via RLS, with explicit safe-column SECURITY DEFINER
-- functions for public browsing and for a student's own gated access.
-- ============================================
create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles (id) on delete cascade,
  title text not null default 'New Course',
  slug text not null unique,
  description text,
  level text not null default 'beginner' check (level in ('beginner', 'intermediate', 'advanced')),
  price numeric not null default 0 check (price >= 0),
  currency text not null default 'usd',
  cover_image_path text,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.courses enable row level security;

create policy "Studio manages courses"
  on public.courses for select using (public.is_studio());
create policy "Studio can create courses"
  on public.courses for insert with check (public.is_studio() and created_by = auth.uid());
create policy "Studio can update courses"
  on public.courses for update using (public.is_studio());
create policy "Studio can delete courses"
  on public.courses for delete using (public.is_studio());

drop trigger if exists courses_set_updated_at on public.courses;
create trigger courses_set_updated_at
  before update on public.courses
  for each row execute function public.set_updated_at();

-- ============================================
-- Lessons: ordered by `lesson_position` within a course. Kept studio-only in
-- RLS just like courses — content stays locked until the student's
-- own SECURITY DEFINER read below decides it's allowed.
-- ============================================
create table if not exists public.course_lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  title text not null default 'New Lesson',
  lesson_position integer not null default 0,
  content_type text not null default 'video' check (content_type in ('video', 'text')),
  video_url text,
  body text,
  duration_minutes integer,
  is_preview boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.course_lessons enable row level security;

create index if not exists course_lessons_course_id_idx on public.course_lessons (course_id, lesson_position);

create policy "Studio manages course lessons"
  on public.course_lessons for select using (public.is_studio());
create policy "Studio can create course lessons"
  on public.course_lessons for insert with check (public.is_studio());
create policy "Studio can update course lessons"
  on public.course_lessons for update using (public.is_studio());
create policy "Studio can delete course lessons"
  on public.course_lessons for delete using (public.is_studio());

drop trigger if exists course_lessons_set_updated_at on public.course_lessons;
create trigger course_lessons_set_updated_at
  before update on public.course_lessons
  for each row execute function public.set_updated_at();

-- ============================================
-- Public catalog browsing — same shape as list_published_products /
-- get_published_product.
-- ============================================
create or replace function public.list_published_courses()
returns table (
  id uuid, title text, slug text, description text, level text,
  price numeric, currency text, cover_image_path text, lesson_count bigint, created_at timestamptz
)
language sql
security definer set search_path = public
stable
as $$
  select c.id, c.title, c.slug, c.description, c.level, c.price, c.currency, c.cover_image_path,
         (select count(*) from public.course_lessons cl where cl.course_id = c.id),
         c.created_at
  from public.courses c
  where c.status = 'published'
  order by c.created_at desc;
$$;

grant execute on function public.list_published_courses() to anon, authenticated;

create or replace function public.get_published_course(p_slug text)
returns table (
  id uuid, title text, slug text, description text, level text,
  price numeric, currency text, cover_image_path text, lesson_count bigint, created_at timestamptz
)
language sql
security definer set search_path = public
stable
as $$
  select c.id, c.title, c.slug, c.description, c.level, c.price, c.currency, c.cover_image_path,
         (select count(*) from public.course_lessons cl where cl.course_id = c.id),
         c.created_at
  from public.courses c
  where c.slug = p_slug and c.status = 'published'
  limit 1;
$$;

grant execute on function public.get_published_course(text) to anon, authenticated;

-- Lesson outline for the public detail page: title/order/duration always
-- shown; video_url/body only included for lessons marked is_preview, so
-- a prospective buyer can sample the course before paying.
create or replace function public.list_course_lessons_public(p_course_id uuid)
returns table (
  id uuid, title text, lesson_position integer, content_type text,
  duration_minutes integer, is_preview boolean, video_url text, body text
)
language sql
security definer set search_path = public
stable
as $$
  select cl.id, cl.title, cl.lesson_position, cl.content_type, cl.duration_minutes, cl.is_preview,
         case when cl.is_preview then cl.video_url else null end,
         case when cl.is_preview then cl.body else null end
  from public.course_lessons cl
  join public.courses c on c.id = cl.course_id
  where cl.course_id = p_course_id and c.status = 'published'
  order by cl.lesson_position asc, cl.created_at asc;
$$;

grant execute on function public.list_course_lessons_public(uuid) to anon, authenticated;

-- ============================================
-- Enrollments: only ever written by the buyer's own claim_free_course()
-- call or the Stripe webhook (admin client) — mirrors product_purchases.
-- ============================================
create table if not exists public.course_enrollments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  amount_paid numeric not null default 0,
  currency text not null default 'usd',
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  status text not null default 'paid' check (status in ('paid', 'refunded')),
  created_at timestamptz not null default now(),
  unique (course_id, student_id)
);

alter table public.course_enrollments enable row level security;

create policy "Students read their own enrollments, studio reads all"
  on public.course_enrollments for select
  using (student_id = auth.uid() or public.is_studio());

create policy "Studio can update enrollments"
  on public.course_enrollments for update using (public.is_studio());

create or replace function public.claim_free_course(p_course_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_price numeric;
  v_currency text;
begin
  select price, currency into v_price, v_currency
  from public.courses
  where id = p_course_id and status = 'published';

  if v_price is null then
    raise exception 'course not found';
  end if;
  if v_price <> 0 then
    raise exception 'this course is not free';
  end if;

  insert into public.course_enrollments (course_id, student_id, amount_paid, currency, status)
  values (p_course_id, auth.uid(), 0, v_currency, 'paid')
  on conflict (course_id, student_id) do nothing;
end;
$$;

grant execute on function public.claim_free_course(uuid) to authenticated;

-- ============================================
-- Lesson completion: written only through set_lesson_complete() below, so
-- a student can't mark progress on a lesson they aren't actually enrolled
-- in (or that isn't a free preview) — mirrors the enrollment-gating logic
-- rather than opening the table to direct authenticated writes.
-- ============================================
create table if not exists public.lesson_completions (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.course_lessons (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  completed_at timestamptz not null default now(),
  unique (lesson_id, student_id)
);

alter table public.lesson_completions enable row level security;

create policy "Students read their own completions, studio reads all"
  on public.lesson_completions for select
  using (student_id = auth.uid() or public.is_studio());

create or replace function public.get_my_enrollments()
returns table (
  enrollment_id uuid, amount_paid numeric, currency text, enrolled_at timestamptz,
  course_id uuid, course_title text, course_slug text, lesson_count bigint,
  completed_count bigint
)
language sql
security definer set search_path = public
stable
as $$
  select ce.id, ce.amount_paid, ce.currency, ce.created_at,
         c.id, c.title, c.slug,
         (select count(*) from public.course_lessons cl where cl.course_id = c.id),
         (select count(*) from public.lesson_completions lc
            join public.course_lessons cl on cl.id = lc.lesson_id
            where cl.course_id = c.id and lc.student_id = auth.uid())
  from public.course_enrollments ce
  join public.courses c on c.id = ce.course_id
  where ce.student_id = auth.uid() and ce.status = 'paid'
  order by ce.created_at desc;
$$;

grant execute on function public.get_my_enrollments() to authenticated;

-- Full lesson content for a student who owns the course (or is studio),
-- plus their completion flag per lesson. Locked (not enrolled, not
-- preview) rows come back with video_url/body nulled out rather than
-- omitted, so the outline/ordering still renders.
create or replace function public.get_course_lessons_for_student(p_course_id uuid)
returns table (
  id uuid, title text, lesson_position integer, content_type text,
  duration_minutes integer, is_preview boolean, video_url text, body text, completed boolean
)
language plpgsql
security definer set search_path = public
stable
as $$
declare
  v_enrolled boolean;
begin
  v_enrolled := public.is_studio() or exists (
    select 1 from public.course_enrollments ce
    where ce.course_id = p_course_id and ce.student_id = auth.uid() and ce.status = 'paid'
  );

  return query
    select cl.id, cl.title, cl.lesson_position, cl.content_type, cl.duration_minutes, cl.is_preview,
           case when v_enrolled or cl.is_preview then cl.video_url else null end,
           case when v_enrolled or cl.is_preview then cl.body else null end,
           exists (select 1 from public.lesson_completions lc where lc.lesson_id = cl.id and lc.student_id = auth.uid())
    from public.course_lessons cl
    where cl.course_id = p_course_id
    order by cl.lesson_position asc, cl.created_at asc;
end;
$$;

grant execute on function public.get_course_lessons_for_student(uuid) to authenticated;

create or replace function public.set_lesson_complete(p_lesson_id uuid, p_complete boolean)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_course_id uuid;
  v_is_preview boolean;
  v_enrolled boolean;
begin
  select course_id, is_preview into v_course_id, v_is_preview
  from public.course_lessons where id = p_lesson_id;

  if v_course_id is null then
    raise exception 'lesson not found';
  end if;

  v_enrolled := public.is_studio() or v_is_preview or exists (
    select 1 from public.course_enrollments ce
    where ce.course_id = v_course_id and ce.student_id = auth.uid() and ce.status = 'paid'
  );
  if not v_enrolled then
    raise exception 'you do not have access to this lesson';
  end if;

  if p_complete then
    insert into public.lesson_completions (lesson_id, student_id)
    values (p_lesson_id, auth.uid())
    on conflict (lesson_id, student_id) do nothing;
  else
    delete from public.lesson_completions where lesson_id = p_lesson_id and student_id = auth.uid();
  end if;
end;
$$;

grant execute on function public.set_lesson_complete(uuid, boolean) to authenticated;

-- ============================================
-- Storage: a public bucket for course cover images (same pattern as
-- product-previews). No video bucket — see the note at the top of this
-- file about video hosting being out of scope.
-- ============================================
insert into storage.buckets (id, name, public)
values ('course-covers', 'course-covers', true)
on conflict (id) do nothing;

create policy "Anyone can view course cover images"
  on storage.objects for select
  using (bucket_id = 'course-covers');

create policy "Studio can manage course cover images"
  on storage.objects for insert
  with check (bucket_id = 'course-covers' and public.is_studio());

create policy "Studio can replace course cover images"
  on storage.objects for update
  using (bucket_id = 'course-covers' and public.is_studio());
