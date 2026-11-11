-- =============================================================================
-- V4 — initial database (Supabase / Postgres 15+)
-- Run once on a fresh project: Dashboard → SQL Editor → paste → Run.
-- Then run supabase/seed.sql (exams + syllabus).
--
-- Sections
--   1. Enums
--   2. Tables (users, syllabus, courses, commerce, questions, tests, practice,
--      progress, community, admin)
--   3. Indexes
--   4. Helper + access functions
--   5. Triggers
--   6. Test engine, practice, progress, checkout functions (RPCs)
--   7. Row-Level Security policies
--   8. Views + admin analytics
--   9. Storage buckets + policies
--  10. Function privileges
--  11. Scheduled jobs (pg_cron)
-- =============================================================================


-- =============================================================================
-- 1. ENUMS
-- =============================================================================
create type public.user_role      as enum ('student', 'faculty', 'admin');
create type public.content_status as enum ('draft', 'published', 'archived');
create type public.difficulty     as enum ('easy', 'medium', 'hard');
create type public.question_type  as enum ('mcq', 'msq', 'nat', 'tita');
create type public.video_status   as enum ('none', 'uploading', 'ready', 'failed');
create type public.product_type   as enum ('course', 'test_series', 'bundle');
create type public.order_status   as enum ('pending', 'paid', 'failed', 'refunded');
create type public.discount_type  as enum ('percent', 'fixed');
create type public.test_kind      as enum ('full_mock', 'sectional', 'topic_test', 'pyq_paper');
create type public.attempt_status as enum ('in_progress', 'submitted', 'expired');
create type public.response_state as enum ('not_visited', 'not_answered', 'answered',
                                           'marked_for_review', 'answered_and_marked');
create type public.doubt_status   as enum ('open', 'answered', 'closed');
create type public.report_reason  as enum ('wrong_answer', 'wrong_question', 'typo',
                                           'unclear_solution', 'other');
create type public.report_status  as enum ('open', 'accepted', 'rejected');


-- =============================================================================
-- 2. TABLES
-- =============================================================================

-- ---------- 2.1 Exams & syllabus --------------------------------------------
create table public.exams (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique check (code ~ '^[A-Z0-9_]{2,20}$'),
  name        text not null,
  description text,
  is_active   boolean not null default true,
  position    int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.syllabus_sections (
  id         uuid primary key default gen_random_uuid(),
  exam_id    uuid not null references public.exams(id) on delete cascade,
  name       text not null,
  position   int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (exam_id, name)
);

create table public.topics (
  id         uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.syllabus_sections(id) on delete cascade,
  parent_id  uuid references public.topics(id) on delete cascade,
  name       text not null,
  slug       text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  position   int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (section_id, slug)
);

-- ---------- 2.2 Users -------------------------------------------------------
create table public.profiles (
  id             uuid primary key references auth.users(id) on delete cascade,
  full_name      text,
  email          text,
  phone          text,
  avatar_path    text,
  role           public.user_role not null default 'student',
  target_exam_id uuid references public.exams(id) on delete set null,
  is_blocked     boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- ---------- 2.3 Courses & curriculum ---------------------------------------
create table public.courses (
  id             uuid primary key default gen_random_uuid(),
  exam_id        uuid not null references public.exams(id) on delete restrict,
  slug           text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title          text not null check (length(btrim(title)) > 0),
  subtitle       text,
  description    text,
  thumbnail_path text,
  status         public.content_status not null default 'draft',
  published_at   timestamptz,
  created_by     uuid references public.profiles(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create table public.course_subjects (
  id         uuid primary key default gen_random_uuid(),
  course_id  uuid not null references public.courses(id) on delete cascade,
  title      text not null check (length(btrim(title)) > 0),
  position   int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.course_modules (
  id         uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.course_subjects(id) on delete cascade,
  title      text not null check (length(btrim(title)) > 0),
  position   int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.course_chapters (
  id         uuid primary key default gen_random_uuid(),
  module_id  uuid not null references public.course_modules(id) on delete cascade,
  title      text not null check (length(btrim(title)) > 0),
  position   int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.lectures (
  id               uuid primary key default gen_random_uuid(),
  chapter_id       uuid not null references public.course_chapters(id) on delete cascade,
  course_id        uuid not null references public.courses(id) on delete cascade, -- set by trigger
  title            text not null check (length(btrim(title)) > 0),
  description      text,
  position         int not null default 0,
  is_free_preview  boolean not null default false,   -- admin-only: watchable without a purchase
  video_provider   text not null default 'supabase' check (video_provider in ('supabase', 'r2')),
  video_path       text,
  video_status     public.video_status not null default 'none',
  video_size_bytes bigint check (video_size_bytes >= 0),
  duration_seconds int check (duration_seconds >= 0),
  notes_path       text,
  status           public.content_status not null default 'draft',
  created_by       uuid references public.profiles(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table public.chapter_topics (
  chapter_id uuid not null references public.course_chapters(id) on delete cascade,
  topic_id   uuid not null references public.topics(id) on delete cascade,
  primary key (chapter_id, topic_id)
);

-- ---------- 2.4 Question bank ----------------------------------------------
create table public.question_groups (
  id         uuid primary key default gen_random_uuid(),
  exam_id    uuid not null references public.exams(id) on delete restrict,
  title      text not null,
  content    text not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.questions (
  id             uuid primary key default gen_random_uuid(),
  exam_id        uuid not null references public.exams(id) on delete restrict,
  topic_id       uuid not null references public.topics(id) on delete restrict,
  group_id       uuid references public.question_groups(id) on delete set null,
  type           public.question_type not null,
  difficulty     public.difficulty not null default 'medium',
  stem           text not null check (length(btrim(stem)) > 0),
  marks          numeric(5,2) not null default 1 check (marks > 0),
  negative_marks numeric(5,2) not null default 0 check (negative_marks >= 0),
  is_pyq         boolean not null default false,
  pyq_year       smallint check (pyq_year between 1990 and 2100),
  is_free_practice boolean not null default false,  -- admin-only: practisable without a purchase
  pyq_paper      text,
  status         public.content_status not null default 'draft',
  created_by     uuid references public.profiles(id) on delete set null,
  reviewed_by    uuid references public.profiles(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint questions_pyq_year check (not is_pyq or pyq_year is not null)
);

create table public.question_options (
  id          uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  label       text not null,
  content     text not null,
  position    int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (question_id, label)
);

-- 🔒 Never readable by students (RLS: staff only). Exposed only through RPCs
-- after a practice answer / test submission.
create table public.question_keys (
  question_id               uuid primary key references public.questions(id) on delete cascade,
  correct_option_ids        uuid[],
  nat_min                   numeric,
  nat_max                   numeric,
  tita_answer               text,
  explanation               text,
  solution_video_lecture_id uuid references public.lectures(id) on delete set null,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  constraint question_keys_nat_range check (nat_min is null or nat_max is null or nat_min <= nat_max)
);

-- ---------- 2.5 Tests -------------------------------------------------------
create table public.tests (
  id               uuid primary key default gen_random_uuid(),
  exam_id          uuid not null references public.exams(id) on delete restrict,
  slug             text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title            text not null check (length(btrim(title)) > 0),
  kind             public.test_kind not null default 'full_mock',
  instructions     text,
  duration_minutes int not null check (duration_minutes > 0),
  is_free          boolean not null default false,  -- admin-only: any signed-in user can take it
  max_attempts     int check (max_attempts > 0),           -- null = unlimited
  available_from   timestamptz,
  available_until  timestamptz,
  status           public.content_status not null default 'draft',
  created_by       uuid references public.profiles(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint tests_window check (available_until is null or available_from is null
                                 or available_until > available_from)
);

create table public.test_sections (
  id               uuid primary key default gen_random_uuid(),
  test_id          uuid not null references public.tests(id) on delete cascade,
  name             text not null,
  position         int not null default 0,
  duration_minutes int check (duration_minutes > 0),  -- set on ALL sections = timed + locked (CAT)
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (id, test_id)
);

create table public.test_questions (
  id             uuid primary key default gen_random_uuid(),
  test_id        uuid not null references public.tests(id) on delete cascade,
  section_id     uuid not null,
  question_id    uuid not null references public.questions(id) on delete restrict,
  position       int not null default 0,
  marks          numeric(5,2) check (marks > 0),           -- override
  negative_marks numeric(5,2) check (negative_marks >= 0), -- override
  created_at     timestamptz not null default now(),
  unique (test_id, question_id),
  foreign key (section_id, test_id) references public.test_sections(id, test_id) on delete cascade
);

-- ---------- 2.6 Products & commerce ----------------------------------------
create table public.test_series (
  id             uuid primary key default gen_random_uuid(),
  exam_id        uuid not null references public.exams(id) on delete restrict,
  slug           text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title          text not null check (length(btrim(title)) > 0),
  description    text,
  thumbnail_path text,
  status         public.content_status not null default 'draft',
  created_by     uuid references public.profiles(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create table public.test_series_tests (
  series_id uuid not null references public.test_series(id) on delete cascade,
  test_id   uuid not null references public.tests(id) on delete cascade,
  position  int not null default 0,
  primary key (series_id, test_id)
);

create table public.course_tests (
  course_id uuid not null references public.courses(id) on delete cascade,
  test_id   uuid not null references public.tests(id) on delete cascade,
  position  int not null default 0,
  primary key (course_id, test_id)
);

create table public.products (
  id               uuid primary key default gen_random_uuid(),
  type             public.product_type not null,
  course_id        uuid unique references public.courses(id) on delete cascade,
  test_series_id   uuid unique references public.test_series(id) on delete cascade,
  slug             text unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title            text,
  description      text,
  thumbnail_path   text,
  price_paise      int not null default 0 check (price_paise >= 0),
  sale_price_paise int check (sale_price_paise >= 0),
  validity_days    int check (validity_days > 0),
  access_until     date,
  is_active        boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint products_sale_le_price check (sale_price_paise is null or sale_price_paise <= price_paise),
  constraint products_type_target check (
       (type = 'course'      and course_id is not null and test_series_id is null)
    or (type = 'test_series' and test_series_id is not null and course_id is null)
    or (type = 'bundle'      and course_id is null and test_series_id is null
                             and slug is not null and title is not null))
);

create table public.bundle_items (
  bundle_product_id uuid not null references public.products(id) on delete cascade,
  item_product_id   uuid not null references public.products(id) on delete cascade,
  position          int not null default 0,
  primary key (bundle_product_id, item_product_id),
  check (bundle_product_id <> item_product_id)
);

create table public.coupons (
  id                 uuid primary key default gen_random_uuid(),
  code               text not null unique check (code ~ '^[A-Z0-9_-]{3,32}$'),
  description        text,
  discount_type      public.discount_type not null,
  discount_value     int not null check (discount_value > 0),
  max_discount_paise int check (max_discount_paise > 0),
  min_order_paise    int check (min_order_paise >= 0),
  valid_from         timestamptz,
  valid_until        timestamptz,
  max_redemptions    int check (max_redemptions > 0),
  max_per_user       int not null default 1 check (max_per_user > 0),
  applies_to_all     boolean not null default true,
  is_active          boolean not null default true,
  created_by         uuid references public.profiles(id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint coupons_percent_max check (discount_type <> 'percent' or discount_value <= 100),
  constraint coupons_window check (valid_until is null or valid_from is null or valid_until > valid_from)
);

create table public.coupon_products (
  coupon_id  uuid not null references public.coupons(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  primary key (coupon_id, product_id)
);

create table public.orders (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid references public.profiles(id) on delete set null,
  product_id          uuid not null references public.products(id) on delete restrict,
  list_price_paise    int not null check (list_price_paise >= 0),
  coupon_id           uuid references public.coupons(id) on delete set null,
  discount_paise      int not null default 0 check (discount_paise >= 0),
  amount_paise        int not null check (amount_paise >= 0),
  currency            text not null default 'INR',
  status              public.order_status not null default 'pending',
  provider            text not null default 'demo' check (provider in ('demo', 'razorpay', 'free')),
  provider_order_id   text,
  provider_payment_id text,
  paid_at             timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint orders_amount check (amount_paise = list_price_paise - discount_paise)
);

create table public.coupon_redemptions (
  id             uuid primary key default gen_random_uuid(),
  coupon_id      uuid not null references public.coupons(id) on delete cascade,
  user_id        uuid references public.profiles(id) on delete set null,
  order_id       uuid not null unique references public.orders(id) on delete cascade,
  discount_paise int not null check (discount_paise >= 0),
  created_at     timestamptz not null default now()
);

create table public.enrollments (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  order_id   uuid references public.orders(id) on delete set null,  -- null = granted by admin
  granted_by uuid references public.profiles(id) on delete set null,
  starts_at  timestamptz not null default now(),
  expires_at timestamptz,                                           -- null = lifetime
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, product_id)
);

-- ---------- 2.7 Test attempts ----------------------------------------------
create table public.test_attempts (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references public.profiles(id) on delete cascade,
  test_id             uuid not null references public.tests(id) on delete cascade,
  attempt_no          int not null check (attempt_no > 0),
  status              public.attempt_status not null default 'in_progress',
  started_at          timestamptz not null default now(),
  deadline_at         timestamptz not null,
  current_section_id  uuid references public.test_sections(id) on delete set null,
  section_deadline_at timestamptz,
  submitted_at        timestamptz,
  score               numeric(7,2),
  max_score           numeric(7,2),
  correct_count       int,
  wrong_count         int,
  unanswered_count    int,
  section_scores      jsonb,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (user_id, test_id, attempt_no)
);

create table public.test_responses (
  attempt_id          uuid not null references public.test_attempts(id) on delete cascade,
  test_question_id    uuid not null references public.test_questions(id) on delete cascade,
  state               public.response_state not null default 'not_visited',
  selected_option_ids uuid[],
  numeric_answer      numeric,
  text_answer         text,
  time_spent_seconds  int not null default 0 check (time_spent_seconds >= 0),
  is_correct          boolean,
  marks_awarded       numeric(5,2),
  updated_at          timestamptz not null default now(),
  primary key (attempt_id, test_question_id)
);

-- ---------- 2.8 Practice ----------------------------------------------------
create table public.practice_sessions (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references public.profiles(id) on delete cascade,
  exam_id            uuid not null references public.exams(id) on delete cascade,
  filters            jsonb not null default '{}',
  question_ids       uuid[] not null default '{}',
  is_timed           boolean not null default false,
  time_limit_seconds int check (time_limit_seconds > 0),
  started_at         timestamptz not null default now(),
  ended_at           timestamptz,
  question_count     int not null default 0,
  answered_count     int not null default 0,
  correct_count      int not null default 0,
  created_at         timestamptz not null default now(),
  constraint practice_timed check (not is_timed or time_limit_seconds is not null)
);

create table public.practice_answers (
  id                  uuid primary key default gen_random_uuid(),
  session_id          uuid not null references public.practice_sessions(id) on delete cascade,
  user_id             uuid not null references public.profiles(id) on delete cascade,
  question_id         uuid not null references public.questions(id) on delete cascade,
  selected_option_ids uuid[],
  numeric_answer      numeric,
  text_answer         text,
  is_correct          boolean not null,
  time_taken_seconds  int not null default 0 check (time_taken_seconds >= 0),
  answered_at         timestamptz not null default now(),
  unique (session_id, question_id)
);

create table public.question_bookmarks (
  user_id     uuid not null references public.profiles(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, question_id)
);

create table public.question_reports (
  id                  uuid primary key default gen_random_uuid(),
  question_id         uuid not null references public.questions(id) on delete cascade,
  user_id             uuid references public.profiles(id) on delete set null,
  reason              public.report_reason not null,
  message             text,
  test_attempt_id     uuid references public.test_attempts(id) on delete set null,
  practice_session_id uuid references public.practice_sessions(id) on delete set null,
  status              public.report_status not null default 'open',
  resolved_by         uuid references public.profiles(id) on delete set null,
  resolved_at         timestamptz,
  resolution_note     text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ---------- 2.9 Learning progress & doubts ---------------------------------
create table public.lecture_progress (
  user_id               uuid not null references public.profiles(id) on delete cascade,
  lecture_id            uuid not null references public.lectures(id) on delete cascade,
  last_position_seconds int not null default 0 check (last_position_seconds >= 0),
  watched_seconds       int not null default 0 check (watched_seconds >= 0),
  completed_at          timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  primary key (user_id, lecture_id)
);

create table public.lecture_doubts (
  id                      uuid primary key default gen_random_uuid(),
  lecture_id              uuid not null references public.lectures(id) on delete cascade,
  user_id                 uuid references public.profiles(id) on delete set null,
  body                    text not null check (length(btrim(body)) > 0),
  video_timestamp_seconds int check (video_timestamp_seconds >= 0),
  status                  public.doubt_status not null default 'open',
  is_pinned               boolean not null default false,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create table public.doubt_replies (
  id              uuid primary key default gen_random_uuid(),
  doubt_id        uuid not null references public.lecture_doubts(id) on delete cascade,
  user_id         uuid references public.profiles(id) on delete set null,
  body            text not null check (length(btrim(body)) > 0),
  is_staff_answer boolean not null default false,  -- set by trigger
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ---------- 2.10 Admin ------------------------------------------------------
create table public.audit_log (
  id          bigint generated always as identity primary key,
  actor_id    uuid references public.profiles(id) on delete set null,
  action      text not null,
  entity_type text not null,
  entity_id   uuid,
  details     jsonb not null default '{}',
  created_at  timestamptz not null default now()
);


-- =============================================================================
-- 3. INDEXES (foreign keys + common filters)
-- =============================================================================
create index on public.syllabus_sections (exam_id, position);
create index on public.topics (section_id, position);
create index on public.topics (parent_id);
create index on public.profiles (role);
create index on public.courses (exam_id, status);
create index on public.course_subjects (course_id, position);
create index on public.course_modules (subject_id, position);
create index on public.course_chapters (module_id, position);
create index on public.lectures (chapter_id, position);
create index on public.lectures (course_id, status);
create index on public.chapter_topics (topic_id);
create index on public.question_groups (exam_id);
create index on public.questions (exam_id, status, topic_id, difficulty);
create index on public.questions (topic_id);
create index on public.questions (exam_id) where is_free_practice;
create index on public.questions (group_id);
create index on public.questions (exam_id, pyq_year) where is_pyq;
create index on public.question_options (question_id, position);
create index on public.tests (exam_id, status);
create index on public.test_sections (test_id, position);
create index on public.test_questions (section_id, position);
create index on public.test_questions (question_id);
create index on public.test_series (exam_id, status);
create index on public.test_series_tests (test_id);
create index on public.course_tests (test_id);
create index on public.bundle_items (item_product_id);
create index on public.coupon_products (product_id);
create index on public.orders (user_id, created_at desc);
create index on public.orders (status, created_at desc);
create index on public.coupon_redemptions (coupon_id, user_id);
create index on public.enrollments (product_id);
create index on public.test_attempts (test_id, attempt_no, score desc);
create index on public.test_attempts (user_id, test_id);
create index on public.test_attempts (deadline_at) where status = 'in_progress';
create unique index test_attempts_one_open on public.test_attempts (user_id, test_id)
  where status = 'in_progress';
create index on public.test_responses (test_question_id);
create index on public.practice_sessions (user_id, started_at desc);
create index on public.practice_answers (question_id);
create index on public.practice_answers (user_id, answered_at desc);
create index on public.question_bookmarks (question_id);
create index on public.question_reports (status, created_at);
create index on public.question_reports (question_id);
create index on public.lecture_progress (lecture_id);
create index on public.lecture_progress (user_id, updated_at desc);
create index on public.lecture_doubts (lecture_id, created_at desc);
create index on public.doubt_replies (doubt_id, created_at);
create index on public.audit_log (entity_type, entity_id);
create index on public.audit_log (created_at desc);


-- =============================================================================
-- 4. HELPER + ACCESS FUNCTIONS
-- All SECURITY DEFINER functions pin search_path = '' and fully qualify names.
-- =============================================================================

create or replace function public.uuid_or_null(p text)
returns uuid language sql immutable set search_path = '' as $$
  select case when p ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
              then p::uuid end;
$$;

create or replace function public.is_staff(p_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles
                  where id = p_user and role in ('faculty', 'admin') and not is_blocked);
$$;

create or replace function public.is_admin(p_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles
                  where id = p_user and role = 'admin' and not is_blocked);
$$;

-- Products a user can currently use: direct enrollments + items of enrolled bundles.
create or replace function public.user_product_ids(p_user uuid default auth.uid())
returns setof uuid language sql stable security definer set search_path = '' as $$
  with live as (
    select e.product_id from public.enrollments e
     where e.user_id = p_user and e.is_active
       and e.starts_at <= now() and (e.expires_at is null or e.expires_at > now())
  )
  select product_id from live
  union
  select bi.item_product_id from public.bundle_items bi join live on live.product_id = bi.bundle_product_id;
$$;

create or replace function public.has_product_access(p_product uuid, p_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = '' as $$
  select p_product in (select public.user_product_ids(p_user));
$$;

create or replace function public.has_course_access(p_course uuid, p_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_staff(p_user)
      or exists (select 1 from public.products p
                  where p.course_id = p_course
                    and p.id in (select public.user_product_ids(p_user)));
$$;

create or replace function public.has_test_access(p_test uuid, p_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_staff(p_user)
      or exists (select 1 from public.tests t where t.id = p_test and t.is_free and p_user is not null)
      or exists (select 1 from public.course_tests ct
                   join public.products p on p.course_id = ct.course_id
                  where ct.test_id = p_test and p.id in (select public.user_product_ids(p_user)))
      or exists (select 1 from public.test_series_tests st
                   join public.products p on p.test_series_id = st.series_id
                  where st.test_id = p_test and p.id in (select public.user_product_ids(p_user)));
$$;

-- Has the user bought anything (course / test series / bundle item) for this exam?
-- Unlocks full practice for that exam.
create or replace function public.has_exam_access(p_exam uuid, p_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_staff(p_user)
      or exists (select 1 from public.products p
                   left join public.courses c on c.id = p.course_id
                   left join public.test_series ts on ts.id = p.test_series_id
                  where p.id in (select public.user_product_ids(p_user))
                    and coalesce(c.exam_id, ts.exam_id) = p_exam);
$$;

create or replace function public.course_visible(p_course uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_staff()
      or exists (select 1 from public.courses where id = p_course and status = 'published');
$$;

create or replace function public.lecture_course_id(p_lecture uuid)
returns uuid language sql stable security definer set search_path = '' as $$
  select course_id from public.lectures where id = p_lecture;
$$;

-- Can the user stream this lecture's video / notes?
create or replace function public.can_watch_lecture(p_lecture uuid, p_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_staff(p_user)
      or exists (
        select 1 from public.lectures l join public.courses c on c.id = l.course_id
         where l.id = p_lecture and l.status = 'published' and c.status = 'published'
           and (l.is_free_preview or public.has_course_access(c.id, p_user)));
$$;

create or replace function public._require_user()
returns uuid language plpgsql stable security definer set search_path = '' as $$
declare v uuid := auth.uid();
begin
  if v is null then
    raise exception 'Not signed in' using errcode = '28000';
  end if;
  if exists (select 1 from public.profiles where id = v and is_blocked) then
    raise exception 'Your account is blocked' using errcode = '42501';
  end if;
  return v;
end $$;

create or replace function public._audit(p_action text, p_entity_type text, p_entity_id uuid, p_details jsonb)
returns void language sql security definer set search_path = '' as $$
  insert into public.audit_log (actor_id, action, entity_type, entity_id, details)
  values (auth.uid(), p_action, p_entity_type, p_entity_id, coalesce(p_details, '{}'));
$$;

-- Is a response correct? null = unanswered.
create or replace function public.evaluate_answer(
  p_type public.question_type, p_key public.question_keys,
  p_selected uuid[], p_numeric numeric, p_text text)
returns boolean language plpgsql immutable set search_path = '' as $$
begin
  if p_type in ('mcq', 'msq') then
    if p_selected is null or cardinality(p_selected) = 0 then return null; end if;
    if p_type = 'mcq' then
      return cardinality(p_selected) = 1 and p_selected[1] = any (coalesce(p_key.correct_option_ids, '{}'));
    end if;
    return (select array_agg(distinct x order by x) from unnest(p_selected) x)
         = (select array_agg(distinct y order by y) from unnest(p_key.correct_option_ids) y);
  elsif p_type = 'nat' then
    if p_numeric is null then return null; end if;
    return p_numeric between p_key.nat_min and p_key.nat_max;
  else
    if p_text is null or btrim(p_text) = '' then return null; end if;
    return lower(btrim(p_text)) = lower(btrim(p_key.tita_answer));
  end if;
end $$;

-- Raises if a published question is incomplete (no key, bad options, ...).
create or replace function public._assert_question_valid(p_question uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  q public.questions;
  k public.question_keys;
  n_opts int;
  n_key int;
  n_match int;
begin
  select * into q from public.questions where id = p_question;
  if not found or q.status <> 'published' then return; end if;

  select * into k from public.question_keys where question_id = q.id;
  if not found then
    raise exception 'Question % cannot be published without an answer key', q.id using errcode = '23514';
  end if;

  if q.type in ('mcq', 'msq') then
    select count(*) into n_opts from public.question_options where question_id = q.id;
    n_key := coalesce(cardinality(k.correct_option_ids), 0);
    select count(*) into n_match from public.question_options
     where question_id = q.id and id = any (coalesce(k.correct_option_ids, '{}'));
    if n_opts < 2 then
      raise exception 'Question % needs at least 2 options', q.id using errcode = '23514';
    end if;
    if n_match <> n_key then
      raise exception 'Answer key of question % points to options of another question', q.id using errcode = '23514';
    end if;
    if q.type = 'mcq' and n_key <> 1 then
      raise exception 'MCQ % must have exactly 1 correct option', q.id using errcode = '23514';
    end if;
    if q.type = 'msq' and n_key < 1 then
      raise exception 'MSQ % must have at least 1 correct option', q.id using errcode = '23514';
    end if;
  elsif q.type = 'nat' then
    if k.nat_min is null or k.nat_max is null then
      raise exception 'NAT % needs nat_min and nat_max', q.id using errcode = '23514';
    end if;
  else
    if k.tita_answer is null or btrim(k.tita_answer) = '' then
      raise exception 'TITA % needs tita_answer', q.id using errcode = '23514';
    end if;
  end if;
end $$;

-- Expiry for a new enrollment: earliest of (start + validity_days) and end of access_until (IST).
create or replace function public._enrollment_expiry(p_product uuid, p_from timestamptz)
returns timestamptz language sql stable security definer set search_path = '' as $$
  select least(
           case when p.validity_days is not null then p_from + make_interval(days => p.validity_days) end,
           case when p.access_until is not null
                then ((p.access_until + 1)::timestamp at time zone 'Asia/Kolkata') end)
    from public.products p where p.id = p_product;
$$;


-- =============================================================================
-- 5. TRIGGERS
-- =============================================================================

-- updated_at on every table that has it
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

do $$
declare t text;
begin
  for t in
    select c.table_name from information_schema.columns c
      join information_schema.tables tb on tb.table_schema = c.table_schema and tb.table_name = c.table_name
     where c.table_schema = 'public' and c.column_name = 'updated_at' and tb.table_type = 'BASE TABLE'
  loop
    execute format('create trigger set_updated_at before update on public.%I
                    for each row execute function public.set_updated_at()', t);
  end loop;
end $$;

-- New auth user → profile
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email,
          coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'))
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Only admins can change role / blocked flag; never remove the last admin.
create or replace function public.protect_profile()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.id <> old.id then
    raise exception 'Profile id cannot change' using errcode = '42501';
  end if;

  if (new.role is distinct from old.role or new.is_blocked is distinct from old.is_blocked
      or new.email is distinct from old.email) then
    -- auth.uid() is null for SQL editor / service role: allowed.
    if auth.uid() is not null and not public.is_admin(auth.uid()) then
      raise exception 'Only admins can change role, email or blocked status' using errcode = '42501';
    end if;
    if old.role = 'admin' and (new.role <> 'admin' or new.is_blocked)
       and not exists (select 1 from public.profiles
                        where role = 'admin' and not is_blocked and id <> old.id) then
      raise exception 'Cannot remove or block the last admin' using errcode = '42501';
    end if;
    if new.role is distinct from old.role or new.is_blocked is distinct from old.is_blocked then
      perform public._audit('profile.role_or_block', 'profile', new.id,
        jsonb_build_object('role', jsonb_build_object('from', old.role, 'to', new.role),
                           'is_blocked', jsonb_build_object('from', old.is_blocked, 'to', new.is_blocked)));
    end if;
  end if;
  return new;
end $$;

create trigger protect_profile before update on public.profiles
  for each row execute function public.protect_profile();

-- Free/paid flags are a pricing decision: only admins may set or change them.
-- TG_ARGV[0] = flag column name.
create or replace function public.protect_free_flag()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_col text := tg_argv[0];
  v_new boolean := (to_jsonb(new) ->> v_col)::boolean;
  v_old boolean := case when tg_op = 'UPDATE' then (to_jsonb(old) ->> v_col)::boolean else false end;
begin
  if v_new is distinct from v_old then
    if auth.uid() is not null and not public.is_admin(auth.uid()) then
      raise exception 'Only admins can change what is free (%)', v_col using errcode = '42501';
    end if;
    perform public._audit('free_flag.change', tg_table_name, new.id,
      jsonb_build_object('field', v_col, 'from', v_old, 'to', v_new));
  end if;
  return new;
end $$;

create trigger protect_free_flag before insert or update of is_free_preview on public.lectures
  for each row execute function public.protect_free_flag('is_free_preview');
create trigger protect_free_flag before insert or update of is_free on public.tests
  for each row execute function public.protect_free_flag('is_free');
create trigger protect_free_flag before insert or update of is_free_practice on public.questions
  for each row execute function public.protect_free_flag('is_free_practice');

-- Lecture.course_id follows its chapter
create or replace function public.lectures_set_course()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  select s.course_id into new.course_id
    from public.course_chapters ch
    join public.course_modules m on m.id = ch.module_id
    join public.course_subjects s on s.id = m.subject_id
   where ch.id = new.chapter_id;
  return new;
end $$;

create trigger lectures_set_course before insert or update of chapter_id on public.lectures
  for each row execute function public.lectures_set_course();

-- Course published_at + audit
create or replace function public.courses_on_status()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'published' and (tg_op = 'INSERT' or old.status <> 'published') then
    new.published_at := coalesce(new.published_at, now());
  end if;
  if tg_op = 'UPDATE' and new.status <> old.status then
    perform public._audit('course.status', 'course', new.id,
      jsonb_build_object('from', old.status, 'to', new.status));
  end if;
  return new;
end $$;

create trigger courses_on_status before insert or update of status on public.courses
  for each row execute function public.courses_on_status();

-- Product price audit
create or replace function public.products_audit()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.price_paise is distinct from old.price_paise
     or new.sale_price_paise is distinct from old.sale_price_paise
     or new.validity_days is distinct from old.validity_days
     or new.access_until is distinct from old.access_until
     or new.is_active is distinct from old.is_active then
    perform public._audit('product.pricing', 'product', new.id,
      jsonb_build_object('before', jsonb_build_object('price_paise', old.price_paise,
                           'sale_price_paise', old.sale_price_paise, 'validity_days', old.validity_days,
                           'access_until', old.access_until, 'is_active', old.is_active),
                         'after', jsonb_build_object('price_paise', new.price_paise,
                           'sale_price_paise', new.sale_price_paise, 'validity_days', new.validity_days,
                           'access_until', new.access_until, 'is_active', new.is_active)));
  end if;
  return new;
end $$;

create trigger products_audit after update on public.products
  for each row execute function public.products_audit();

-- Admin-granted enrollments are audited
create or replace function public.enrollments_audit()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.order_id is null then
    new.granted_by := coalesce(new.granted_by, auth.uid());
    perform public._audit('enrollment.grant', 'enrollment', new.id,
      jsonb_build_object('user_id', new.user_id, 'product_id', new.product_id, 'expires_at', new.expires_at));
  end if;
  return new;
end $$;

create trigger enrollments_audit before insert on public.enrollments
  for each row execute function public.enrollments_audit();

-- Bundles contain only courses / test series
create or replace function public.bundle_items_validate()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select type from public.products where id = new.bundle_product_id) <> 'bundle' then
    raise exception 'bundle_product_id must be a bundle product' using errcode = '23514';
  end if;
  if (select type from public.products where id = new.item_product_id) = 'bundle' then
    raise exception 'Bundles cannot contain other bundles' using errcode = '23514';
  end if;
  return new;
end $$;

create trigger bundle_items_validate before insert or update on public.bundle_items
  for each row execute function public.bundle_items_validate();

-- Coupon codes stored upper-case
create or replace function public.coupons_normalize()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.code := upper(btrim(new.code));
  return new;
end $$;

create trigger coupons_normalize before insert or update of code on public.coupons
  for each row execute function public.coupons_normalize();

-- Published questions must stay valid (checked at COMMIT, so a question, its
-- options and key can be saved together in one transaction).
create or replace function public.questions_validate()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_table_name = 'questions' then
    perform public._assert_question_valid(new.id);
  elsif tg_op = 'DELETE' then
    perform public._assert_question_valid(old.question_id);
  else
    perform public._assert_question_valid(new.question_id);
  end if;
  return null;
end $$;

create constraint trigger questions_validate after insert or update on public.questions
  deferrable initially deferred for each row execute function public.questions_validate();
create constraint trigger question_keys_validate after insert or update or delete on public.question_keys
  deferrable initially deferred for each row execute function public.questions_validate();
create constraint trigger question_options_validate after insert or update or delete on public.question_options
  deferrable initially deferred for each row execute function public.questions_validate();

-- Doubt replies: staff flag + mark doubt answered
create or replace function public.doubt_replies_before()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  new.is_staff_answer := public.is_staff(new.user_id);
  return new;
end $$;

create trigger doubt_replies_before before insert on public.doubt_replies
  for each row execute function public.doubt_replies_before();

create or replace function public.doubt_replies_after()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.is_staff_answer then
    update public.lecture_doubts set status = 'answered'
     where id = new.doubt_id and status = 'open';
  end if;
  return null;
end $$;

create trigger doubt_replies_after after insert on public.doubt_replies
  for each row execute function public.doubt_replies_after();


-- =============================================================================
-- 6. RPC FUNCTIONS (called from the app with the user's session)
-- =============================================================================

-- ---------- 6.1 Test engine -------------------------------------------------
-- Seconds of network grace after a deadline before saves are refused.
create or replace function public._grace() returns interval
language sql immutable set search_path = '' as $$ select interval '15 seconds' $$;

-- Score an attempt and close it.
create or replace function public._score_attempt(p_attempt uuid, p_status public.attempt_status)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.test_responses r
     set is_correct = public.evaluate_answer(q.type, k, r.selected_option_ids, r.numeric_answer, r.text_answer)
    from public.test_questions tq
    join public.questions q on q.id = tq.question_id
    left join public.question_keys k on k.question_id = q.id
   where r.attempt_id = p_attempt and tq.id = r.test_question_id;

  update public.test_responses r
     set marks_awarded = case r.is_correct
                           when true  then coalesce(tq.marks, q.marks)
                           when false then -coalesce(tq.negative_marks, q.negative_marks)
                           else 0 end
    from public.test_questions tq
    join public.questions q on q.id = tq.question_id
   where r.attempt_id = p_attempt and tq.id = r.test_question_id;

  with per_q as (
    select tq.section_id, r.is_correct, r.marks_awarded, r.time_spent_seconds,
           coalesce(tq.marks, q.marks) as max_marks
      from public.test_attempts a
      join public.test_questions tq on tq.test_id = a.test_id
      join public.questions q on q.id = tq.question_id
      left join public.test_responses r on r.attempt_id = a.id and r.test_question_id = tq.id
     where a.id = p_attempt
  ), sec as (
    select section_id,
           jsonb_build_object('score', coalesce(sum(marks_awarded), 0),
                              'max_score', sum(max_marks),
                              'correct', count(*) filter (where is_correct),
                              'wrong', count(*) filter (where is_correct = false),
                              'unanswered', count(*) filter (where is_correct is null),
                              'time_seconds', coalesce(sum(time_spent_seconds), 0)) as j
      from per_q group by section_id
  )
  update public.test_attempts a
     set status = p_status,
         submitted_at = now(),
         current_section_id = null,
         section_deadline_at = null,
         score = (select coalesce(sum(marks_awarded), 0) from per_q),
         max_score = (select sum(max_marks) from per_q),
         correct_count = (select count(*) from per_q where is_correct),
         wrong_count = (select count(*) from per_q where is_correct = false),
         unanswered_count = (select count(*) from per_q where is_correct is null),
         section_scores = (select jsonb_object_agg(section_id, j) from sec)
   where a.id = p_attempt and a.status = 'in_progress';
end $$;

-- Advance timed sections whose clock ran out; close the attempt when time is up.
create or replace function public._sync_attempt_clock(p_attempt uuid)
returns public.test_attempts language plpgsql security definer set search_path = '' as $$
declare
  a public.test_attempts;
  nxt public.test_sections;
begin
  select * into a from public.test_attempts where id = p_attempt for update;
  if a.status <> 'in_progress' then return a; end if;

  -- Timed sections (CAT): move on when a section's clock runs out.
  while a.current_section_id is not null and now() > a.section_deadline_at + public._grace() loop
    select s2.* into nxt
      from public.test_sections s1
      join public.test_sections s2 on s2.test_id = s1.test_id
                                  and (s2.position, s2.id) > (s1.position, s1.id)
     where s1.id = a.current_section_id
     order by s2.position, s2.id limit 1;
    if not found then
      exit;  -- last section: falls through to overall deadline handling
    end if;
    update public.test_attempts
       set current_section_id = nxt.id,
           section_deadline_at = a.section_deadline_at + make_interval(mins => nxt.duration_minutes)
     where id = a.id
     returning * into a;
  end loop;

  if now() > a.deadline_at + public._grace() then
    perform public._score_attempt(a.id, 'expired');
    select * into a from public.test_attempts where id = p_attempt;
  end if;
  return a;
end $$;

create or replace function public.start_test_attempt(p_test uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := public._require_user();
  t public.tests;
  a public.test_attempts;
  v_count int;
  v_timed boolean;
  v_total_minutes int;
  first_sec public.test_sections;
begin
  select * into t from public.tests where id = p_test and status = 'published';
  if not found then raise exception 'Test not found' using errcode = 'P0002'; end if;
  if not public.has_test_access(p_test, v_user) then
    raise exception 'You do not have access to this test' using errcode = '42501';
  end if;
  if t.available_from is not null and now() < t.available_from then
    raise exception 'This test opens at %', t.available_from using errcode = '22023';
  end if;
  if t.available_until is not null and now() > t.available_until then
    raise exception 'This test closed at %', t.available_until using errcode = '22023';
  end if;

  -- Resume an open attempt (closing it first if its time is up).
  select * into a from public.test_attempts
   where user_id = v_user and test_id = p_test and status = 'in_progress';
  if found then
    a := public._sync_attempt_clock(a.id);
    if a.status = 'in_progress' then return a.id; end if;
  end if;

  select count(*) into v_count from public.test_attempts where user_id = v_user and test_id = p_test;
  if t.max_attempts is not null and v_count >= t.max_attempts then
    raise exception 'No attempts left for this test' using errcode = '22023';
  end if;
  if not exists (select 1 from public.test_questions where test_id = p_test) then
    raise exception 'This test has no questions yet' using errcode = '22023';
  end if;

  select bool_and(duration_minutes is not null), sum(duration_minutes)
    into v_timed, v_total_minutes
    from public.test_sections where test_id = p_test;
  select * into first_sec from public.test_sections where test_id = p_test
   order by position, id limit 1;

  insert into public.test_attempts (user_id, test_id, attempt_no, started_at, deadline_at,
                                    current_section_id, section_deadline_at)
  values (v_user, p_test, v_count + 1, now(),
          now() + make_interval(mins => case when v_timed then v_total_minutes else t.duration_minutes end),
          case when v_timed then first_sec.id end,
          case when v_timed then now() + make_interval(mins => first_sec.duration_minutes) end)
  returning * into a;

  insert into public.test_responses (attempt_id, test_question_id)
  select a.id, tq.id from public.test_questions tq where tq.test_id = p_test;

  return a.id;
end $$;

-- The question paper for an open attempt (no answers). For timed sections only
-- the current section's questions are returned.
create or replace function public.get_attempt_paper(p_attempt uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := public._require_user();
  a public.test_attempts;
  t public.tests;
begin
  select * into a from public.test_attempts where id = p_attempt and user_id = v_user;
  if not found then raise exception 'Attempt not found' using errcode = 'P0002'; end if;
  a := public._sync_attempt_clock(a.id);
  if a.status <> 'in_progress' then
    return jsonb_build_object('attempt_id', a.id, 'status', a.status);
  end if;
  select * into t from public.tests where id = a.test_id;

  return jsonb_build_object(
    'attempt_id', a.id,
    'status', a.status,
    'test', jsonb_build_object('id', t.id, 'title', t.title, 'kind', t.kind,
                               'instructions', t.instructions, 'duration_minutes', t.duration_minutes),
    'server_now', now(),
    'started_at', a.started_at,
    'deadline_at', a.deadline_at,
    'current_section_id', a.current_section_id,
    'section_deadline_at', a.section_deadline_at,
    'sections', (select jsonb_agg(jsonb_build_object('id', s.id, 'name', s.name, 'position', s.position,
                                                     'duration_minutes', s.duration_minutes)
                                  order by s.position, s.id)
                   from public.test_sections s where s.test_id = t.id),
    'questions', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'test_question_id', tq.id,
               'section_id', tq.section_id,
               'position', tq.position,
               'type', q.type,
               'stem', q.stem,
               'marks', coalesce(tq.marks, q.marks),
               'negative_marks', coalesce(tq.negative_marks, q.negative_marks),
               'group', case when g.id is not null then
                          jsonb_build_object('id', g.id, 'title', g.title, 'content', g.content) end,
               'options', (select jsonb_agg(jsonb_build_object('id', o.id, 'label', o.label, 'content', o.content)
                                            order by o.position, o.label)
                             from public.question_options o where o.question_id = q.id),
               'response', jsonb_build_object('state', r.state,
                                              'selected_option_ids', r.selected_option_ids,
                                              'numeric_answer', r.numeric_answer,
                                              'text_answer', r.text_answer,
                                              'time_spent_seconds', r.time_spent_seconds))
             order by s.position, tq.position, tq.id), '[]'::jsonb)
        from public.test_questions tq
        join public.test_sections s on s.id = tq.section_id
        join public.questions q on q.id = tq.question_id
        left join public.question_groups g on g.id = q.group_id
        left join public.test_responses r on r.attempt_id = a.id and r.test_question_id = tq.id
       where tq.test_id = t.id
         and (a.current_section_id is null or tq.section_id = a.current_section_id)));
end $$;

-- Autosave one answer. p_state is the palette state the student chose; it is
-- normalised against whether an answer is present.
create or replace function public.save_test_response(
  p_attempt uuid,
  p_test_question uuid,
  p_state public.response_state default 'answered',
  p_selected_option_ids uuid[] default null,
  p_numeric_answer numeric default null,
  p_text_answer text default null,
  p_time_spent_delta int default 0)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := public._require_user();
  a public.test_attempts;
  tq public.test_questions;
  q public.questions;
  v_has boolean;
  v_marked boolean;
  v_state public.response_state;
begin
  select * into a from public.test_attempts where id = p_attempt and user_id = v_user;
  if not found then raise exception 'Attempt not found' using errcode = 'P0002'; end if;
  a := public._sync_attempt_clock(a.id);
  if a.status <> 'in_progress' then
    raise exception 'This test has already been submitted' using errcode = '22023';
  end if;

  select * into tq from public.test_questions where id = p_test_question and test_id = a.test_id;
  if not found then raise exception 'Question is not part of this test' using errcode = '22023'; end if;
  if a.current_section_id is not null and tq.section_id <> a.current_section_id then
    raise exception 'This section is locked' using errcode = '22023';
  end if;
  select * into q from public.questions where id = tq.question_id;

  -- Keep only the field relevant to the question type.
  if q.type in ('mcq', 'msq') then
    p_numeric_answer := null; p_text_answer := null;
    if p_selected_option_ids is not null and cardinality(p_selected_option_ids) = 0 then
      p_selected_option_ids := null;
    end if;
    if q.type = 'mcq' and cardinality(p_selected_option_ids) > 1 then
      raise exception 'Only one option can be selected' using errcode = '22023';
    end if;
    if p_selected_option_ids is not null and exists (
         select 1 from unnest(p_selected_option_ids) x
          where x not in (select id from public.question_options where question_id = q.id)) then
      raise exception 'Invalid option' using errcode = '22023';
    end if;
  elsif q.type = 'nat' then
    p_selected_option_ids := null; p_text_answer := null;
  else
    p_selected_option_ids := null; p_numeric_answer := null;
    p_text_answer := nullif(btrim(p_text_answer), '');
  end if;

  v_has := p_selected_option_ids is not null or p_numeric_answer is not null or p_text_answer is not null;
  v_marked := p_state in ('marked_for_review', 'answered_and_marked');
  v_state := case when v_has and v_marked then 'answered_and_marked'
                  when v_has then 'answered'
                  when v_marked then 'marked_for_review'
                  when p_state = 'not_visited' then 'not_visited'
                  else 'not_answered' end;

  update public.test_responses
     set state = v_state,
         selected_option_ids = p_selected_option_ids,
         numeric_answer = p_numeric_answer,
         text_answer = p_text_answer,
         time_spent_seconds = time_spent_seconds + greatest(0, least(coalesce(p_time_spent_delta, 0), 600)),
         updated_at = now()
   where attempt_id = a.id and test_question_id = tq.id;

  return jsonb_build_object('state', v_state, 'server_now', now(),
                            'deadline_at', a.deadline_at, 'section_deadline_at', a.section_deadline_at);
end $$;

-- Finish the current timed section early (CAT). On the last section this submits.
create or replace function public.finish_test_section(p_attempt uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := public._require_user();
  a public.test_attempts;
  nxt public.test_sections;
  v_remaining int;
begin
  select * into a from public.test_attempts where id = p_attempt and user_id = v_user;
  if not found then raise exception 'Attempt not found' using errcode = 'P0002'; end if;
  a := public._sync_attempt_clock(a.id);
  if a.status <> 'in_progress' then
    return jsonb_build_object('status', a.status);
  end if;
  if a.current_section_id is null then
    raise exception 'This test does not have timed sections' using errcode = '22023';
  end if;

  select s2.* into nxt
    from public.test_sections s1
    join public.test_sections s2 on s2.test_id = s1.test_id and (s2.position, s2.id) > (s1.position, s1.id)
   where s1.id = a.current_section_id
   order by s2.position, s2.id limit 1;

  if not found then
    perform public._score_attempt(a.id, 'submitted');
    return jsonb_build_object('status', 'submitted');
  end if;

  select coalesce(sum(s.duration_minutes), 0) into v_remaining
    from public.test_sections s
   where s.test_id = a.test_id and (s.position, s.id) >= (nxt.position, nxt.id);

  update public.test_attempts
     set current_section_id = nxt.id,
         section_deadline_at = now() + make_interval(mins => nxt.duration_minutes),
         deadline_at = now() + make_interval(mins => v_remaining)
   where id = a.id;
  return jsonb_build_object('status', 'in_progress', 'current_section_id', nxt.id);
end $$;

create or replace function public.submit_test_attempt(p_attempt uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := public._require_user();
  a public.test_attempts;
begin
  select * into a from public.test_attempts where id = p_attempt and user_id = v_user;
  if not found then raise exception 'Attempt not found' using errcode = 'P0002'; end if;
  a := public._sync_attempt_clock(a.id);
  if a.status = 'in_progress' then
    perform public._score_attempt(a.id, 'submitted');
  end if;
  return public.get_attempt_result(p_attempt);
end $$;

-- Full result with answers, solutions, rank/percentile and topic breakdown.
create or replace function public.get_attempt_result(p_attempt uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := public._require_user();
  a public.test_attempts;
  v_total int;
  v_below int;
  v_above int;
begin
  select * into a from public.test_attempts where id = p_attempt;
  if not found or (a.user_id <> v_user and not public.is_staff(v_user)) then
    raise exception 'Attempt not found' using errcode = 'P0002';
  end if;
  a := public._sync_attempt_clock(a.id);
  if a.status = 'in_progress' then
    raise exception 'Results are available after the test is submitted' using errcode = '22023';
  end if;

  -- Rank among students' first attempts.
  select count(*), count(*) filter (where score < a.score), count(*) filter (where score > a.score)
    into v_total, v_below, v_above
    from public.test_attempts
   where test_id = a.test_id and attempt_no = 1 and status <> 'in_progress';

  return jsonb_build_object(
    'attempt_id', a.id,
    'test_id', a.test_id,
    'test_title', (select title from public.tests where id = a.test_id),
    'attempt_no', a.attempt_no,
    'status', a.status,
    'started_at', a.started_at,
    'submitted_at', a.submitted_at,
    'time_taken_seconds', extract(epoch from (a.submitted_at - a.started_at))::int,
    'score', a.score,
    'max_score', a.max_score,
    'correct', a.correct_count,
    'wrong', a.wrong_count,
    'unanswered', a.unanswered_count,
    'accuracy_percent', case when a.correct_count + a.wrong_count > 0
                             then round(100.0 * a.correct_count / (a.correct_count + a.wrong_count), 1) end,
    'rank', v_above + 1,
    'total_candidates', v_total,
    'percentile', case when v_total > 0 then round(100.0 * v_below / v_total, 2) end,
    'sections', (select jsonb_agg(jsonb_build_object('id', s.id, 'name', s.name)
                                  || coalesce(a.section_scores -> (s.id::text), '{}'::jsonb)
                                  order by s.position, s.id)
                   from public.test_sections s where s.test_id = a.test_id),
    'topics', (
      select coalesce(jsonb_agg(x order by x ->> 'topic'), '[]'::jsonb) from (
        select jsonb_build_object('topic_id', tp.id, 'topic', tp.name,
                                  'questions', count(*),
                                  'correct', count(*) filter (where r.is_correct),
                                  'wrong', count(*) filter (where r.is_correct = false),
                                  'score', coalesce(sum(r.marks_awarded), 0)) as x
          from public.test_questions tq
          join public.questions q on q.id = tq.question_id
          join public.topics tp on tp.id = q.topic_id
          left join public.test_responses r on r.attempt_id = a.id and r.test_question_id = tq.id
         where tq.test_id = a.test_id
         group by tp.id, tp.name) t),
    'questions', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'test_question_id', tq.id,
               'question_id', q.id,
               'section_id', tq.section_id,
               'type', q.type,
               'stem', q.stem,
               'difficulty', q.difficulty,
               'topic', tp.name,
               'group', case when g.id is not null then
                          jsonb_build_object('id', g.id, 'title', g.title, 'content', g.content) end,
               'options', (select jsonb_agg(jsonb_build_object('id', o.id, 'label', o.label, 'content', o.content)
                                            order by o.position, o.label)
                             from public.question_options o where o.question_id = q.id),
               'response', jsonb_build_object('state', r.state,
                                              'selected_option_ids', r.selected_option_ids,
                                              'numeric_answer', r.numeric_answer,
                                              'text_answer', r.text_answer,
                                              'time_spent_seconds', r.time_spent_seconds),
               'is_correct', r.is_correct,
               'marks_awarded', r.marks_awarded,
               'key', jsonb_build_object('correct_option_ids', k.correct_option_ids,
                                         'nat_min', k.nat_min, 'nat_max', k.nat_max,
                                         'tita_answer', k.tita_answer),
               'explanation', k.explanation,
               'solution_video_lecture_id', k.solution_video_lecture_id)
             order by s.position, tq.position, tq.id), '[]'::jsonb)
        from public.test_questions tq
        join public.test_sections s on s.id = tq.section_id
        join public.questions q on q.id = tq.question_id
        join public.topics tp on tp.id = q.topic_id
        left join public.question_groups g on g.id = q.group_id
        left join public.question_keys k on k.question_id = q.id
        left join public.test_responses r on r.attempt_id = a.id and r.test_question_id = tq.id
       where tq.test_id = a.test_id));
end $$;

-- Top scores on a test (students' first attempts).
create or replace function public.get_test_leaderboard(p_test uuid, p_limit int default 20)
returns table (rank bigint, user_id uuid, full_name text, score numeric, max_score numeric,
               time_taken_seconds int)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.has_test_access(p_test, auth.uid()) then
    raise exception 'You do not have access to this test' using errcode = '42501';
  end if;
  return query
    select rank() over (order by a.score desc, (a.submitted_at - a.started_at)),
           a.user_id, p.full_name, a.score, a.max_score,
           extract(epoch from (a.submitted_at - a.started_at))::int
      from public.test_attempts a
      join public.profiles p on p.id = a.user_id
     where a.test_id = p_test and a.attempt_no = 1 and a.status <> 'in_progress'
     order by 1
     limit least(greatest(p_limit, 1), 100);
end $$;

-- Closes every overdue attempt. Run every minute by pg_cron (section 11).
create or replace function public.expire_overdue_attempts()
returns int language plpgsql security definer set search_path = '' as $$
declare
  r record;
  n int := 0;
begin
  for r in select id from public.test_attempts
            where status = 'in_progress'
              and (deadline_at + public._grace() < now()
                   or (current_section_id is not null and section_deadline_at + public._grace() < now()))
  loop
    perform public._sync_attempt_clock(r.id);
    n := n + 1;
  end loop;
  return n;
end $$;

-- ---------- 6.2 Practice ----------------------------------------------------
create or replace function public.start_practice_session(
  p_exam uuid,
  p_topic_ids uuid[] default null,          -- topics; subtopics are included automatically
  p_difficulties public.difficulty[] default null,
  p_types public.question_type[] default null,
  p_pyq_only boolean default false,
  p_years int[] default null,
  p_count int default 10,
  p_is_timed boolean default false,
  p_time_limit_seconds int default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := public._require_user();
  v_paid boolean := public.has_exam_access(p_exam, v_user);
  v_ids uuid[];
  v_id uuid;
begin
  if p_is_timed and (p_time_limit_seconds is null or p_time_limit_seconds <= 0) then
    raise exception 'A timed session needs a time limit' using errcode = '22023';
  end if;

  -- Unseen questions first, then random.
  select array_agg(id) into v_ids from (
    select q.id
      from public.questions q
      left join public.topics tp on tp.id = q.topic_id
     where q.exam_id = p_exam and q.status = 'published'
       and (v_paid or q.is_free_practice)          -- non-buyers: free practice questions only
       and (p_topic_ids is null or q.topic_id = any (p_topic_ids) or tp.parent_id = any (p_topic_ids))
       and (p_difficulties is null or q.difficulty = any (p_difficulties))
       and (p_types is null or q.type = any (p_types))
       and (not coalesce(p_pyq_only, false) or q.is_pyq)
       and (p_years is null or q.pyq_year = any (p_years))
     order by exists (select 1 from public.practice_answers pa
                       where pa.user_id = v_user and pa.question_id = q.id),
              random()
     limit least(greatest(coalesce(p_count, 10), 1), 100)) s;

  if v_ids is null then
    if not v_paid then
      raise exception 'Practice is available after you buy a course or test series for this exam'
        using errcode = '42501';
    end if;
    raise exception 'No questions match these filters' using errcode = 'P0002';
  end if;

  insert into public.practice_sessions (user_id, exam_id, filters, question_ids, is_timed,
                                        time_limit_seconds, question_count)
  values (v_user, p_exam,
          jsonb_strip_nulls(jsonb_build_object('topic_ids', p_topic_ids, 'difficulties', p_difficulties,
                                               'types', p_types, 'pyq_only', p_pyq_only, 'years', p_years)),
          v_ids, coalesce(p_is_timed, false), p_time_limit_seconds, cardinality(v_ids))
  returning id into v_id;
  return v_id;
end $$;

-- Session questions. Keys/explanations are included only for answered questions.
create or replace function public.get_practice_session(p_session uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := public._require_user();
  s public.practice_sessions;
begin
  select * into s from public.practice_sessions where id = p_session and user_id = v_user;
  if not found then raise exception 'Session not found' using errcode = 'P0002'; end if;

  return jsonb_build_object(
    'session_id', s.id, 'is_timed', s.is_timed, 'time_limit_seconds', s.time_limit_seconds,
    'started_at', s.started_at, 'ended_at', s.ended_at, 'server_now', now(),
    'question_count', s.question_count, 'answered_count', s.answered_count,
    'correct_count', s.correct_count,
    'questions', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'question_id', q.id, 'type', q.type, 'difficulty', q.difficulty, 'stem', q.stem,
               'marks', q.marks, 'is_pyq', q.is_pyq, 'pyq_year', q.pyq_year, 'pyq_paper', q.pyq_paper,
               'topic', tp.name,
               'group', case when g.id is not null then
                          jsonb_build_object('id', g.id, 'title', g.title, 'content', g.content) end,
               'options', (select jsonb_agg(jsonb_build_object('id', o.id, 'label', o.label, 'content', o.content)
                                            order by o.position, o.label)
                             from public.question_options o where o.question_id = q.id),
               'answer', case when pa.id is not null then jsonb_build_object(
                           'selected_option_ids', pa.selected_option_ids,
                           'numeric_answer', pa.numeric_answer, 'text_answer', pa.text_answer,
                           'is_correct', pa.is_correct,
                           'key', jsonb_build_object('correct_option_ids', k.correct_option_ids,
                                                     'nat_min', k.nat_min, 'nat_max', k.nat_max,
                                                     'tita_answer', k.tita_answer),
                           'explanation', k.explanation) end,
               'bookmarked', exists (select 1 from public.question_bookmarks b
                                      where b.user_id = v_user and b.question_id = q.id))
             order by ord.n), '[]'::jsonb)
        from unnest(s.question_ids) with ordinality as ord(qid, n)
        join public.questions q on q.id = ord.qid
        join public.topics tp on tp.id = q.topic_id
        left join public.question_groups g on g.id = q.group_id
        left join public.practice_answers pa on pa.session_id = s.id and pa.question_id = q.id
        left join public.question_keys k on k.question_id = q.id and pa.id is not null));
end $$;

create or replace function public.answer_practice_question(
  p_session uuid,
  p_question uuid,
  p_selected_option_ids uuid[] default null,
  p_numeric_answer numeric default null,
  p_text_answer text default null,
  p_time_taken_seconds int default 0)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := public._require_user();
  s public.practice_sessions;
  q public.questions;
  k public.question_keys;
  v_correct boolean;
begin
  select * into s from public.practice_sessions where id = p_session and user_id = v_user for update;
  if not found then raise exception 'Session not found' using errcode = 'P0002'; end if;
  if s.ended_at is not null then raise exception 'This session has ended' using errcode = '22023'; end if;
  if s.is_timed and now() > s.started_at + make_interval(secs => s.time_limit_seconds) + public._grace() then
    update public.practice_sessions set ended_at = now() where id = s.id;
    raise exception 'Time is up for this session' using errcode = '22023';
  end if;
  if not (p_question = any (s.question_ids)) then
    raise exception 'Question is not part of this session' using errcode = '22023';
  end if;
  if exists (select 1 from public.practice_answers where session_id = s.id and question_id = p_question) then
    raise exception 'Already answered' using errcode = '23505';
  end if;

  select * into q from public.questions where id = p_question;
  if not (q.is_free_practice or public.has_exam_access(q.exam_id, v_user)) then
    raise exception 'Your access to this exam has expired' using errcode = '42501';
  end if;
  select * into k from public.question_keys where question_id = p_question;
  if q.type = 'mcq' and cardinality(p_selected_option_ids) > 1 then
    raise exception 'Only one option can be selected' using errcode = '22023';
  end if;
  v_correct := public.evaluate_answer(q.type, k, p_selected_option_ids, p_numeric_answer, p_text_answer);
  if v_correct is null then
    raise exception 'Please enter an answer' using errcode = '22023';
  end if;

  insert into public.practice_answers (session_id, user_id, question_id, selected_option_ids,
                                       numeric_answer, text_answer, is_correct, time_taken_seconds)
  values (s.id, v_user, q.id,
          case when q.type in ('mcq', 'msq') then p_selected_option_ids end,
          case when q.type = 'nat' then p_numeric_answer end,
          case when q.type = 'tita' then btrim(p_text_answer) end,
          v_correct, greatest(0, least(coalesce(p_time_taken_seconds, 0), 3600)));

  update public.practice_sessions
     set answered_count = answered_count + 1,
         correct_count = correct_count + case when v_correct then 1 else 0 end,
         ended_at = case when answered_count + 1 >= question_count then now() end
   where id = s.id;

  return jsonb_build_object(
    'is_correct', v_correct,
    'key', jsonb_build_object('correct_option_ids', k.correct_option_ids, 'nat_min', k.nat_min,
                              'nat_max', k.nat_max, 'tita_answer', k.tita_answer),
    'explanation', k.explanation,
    'solution_video_lecture_id', k.solution_video_lecture_id);
end $$;

create or replace function public.end_practice_session(p_session uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_user uuid := public._require_user();
begin
  update public.practice_sessions set ended_at = coalesce(ended_at, now())
   where id = p_session and user_id = v_user;
  if not found then raise exception 'Session not found' using errcode = 'P0002'; end if;
end $$;

-- ---------- 6.3 Lecture progress -------------------------------------------
-- Called every ~10 s by the player. watched_delta is capped so skipping does not count.
create or replace function public.save_lecture_progress(
  p_lecture uuid, p_position_seconds int, p_watched_delta_seconds int default 0)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := public._require_user();
  v_duration int;
  lp public.lecture_progress;
begin
  if not public.can_watch_lecture(p_lecture, v_user) then
    raise exception 'You do not have access to this lecture' using errcode = '42501';
  end if;
  select duration_seconds into v_duration from public.lectures where id = p_lecture;

  insert into public.lecture_progress as x (user_id, lecture_id, last_position_seconds, watched_seconds)
  values (v_user, p_lecture, greatest(0, coalesce(p_position_seconds, 0)),
          greatest(0, least(coalesce(p_watched_delta_seconds, 0), 120)))
  on conflict (user_id, lecture_id) do update
     set last_position_seconds = excluded.last_position_seconds,
         watched_seconds = x.watched_seconds + excluded.watched_seconds,
         updated_at = now()
  returning * into lp;

  if lp.completed_at is null and v_duration > 0 and lp.watched_seconds >= 0.9 * v_duration then
    update public.lecture_progress set completed_at = now()
     where user_id = v_user and lecture_id = p_lecture
     returning * into lp;
  end if;

  return jsonb_build_object('last_position_seconds', lp.last_position_seconds,
                            'watched_seconds', lp.watched_seconds,
                            'completed', lp.completed_at is not null);
end $$;

-- ---------- 6.4 Checkout ----------------------------------------------------
-- Price for one product, with optional coupon. Raises with a readable message
-- when the coupon cannot be used.
create or replace function public._quote(p_user uuid, p_product uuid, p_coupon_code text)
returns table (list_price_paise int, discount_paise int, amount_paise int, coupon_id uuid)
language plpgsql stable security definer set search_path = '' as $$
declare
  p public.products;
  c public.coupons;
  v_list int;
  v_disc int := 0;
begin
  select * into p from public.products pr where pr.id = p_product and pr.is_active;
  if not found then raise exception 'This product is not available' using errcode = 'P0002'; end if;
  if p.type = 'course' and not exists (select 1 from public.courses x where x.id = p.course_id and x.status = 'published')
     or p.type = 'test_series' and not exists (select 1 from public.test_series x
                                                where x.id = p.test_series_id and x.status = 'published') then
    raise exception 'This product is not available' using errcode = 'P0002';
  end if;
  v_list := coalesce(p.sale_price_paise, p.price_paise);

  if p_coupon_code is not null and btrim(p_coupon_code) <> '' then
    select * into c from public.coupons co where co.code = upper(btrim(p_coupon_code)) and co.is_active;
    if not found then raise exception 'Invalid coupon code' using errcode = '22023'; end if;
    if c.valid_from is not null and now() < c.valid_from then
      raise exception 'This coupon is not active yet' using errcode = '22023';
    end if;
    if c.valid_until is not null and now() > c.valid_until then
      raise exception 'This coupon has expired' using errcode = '22023';
    end if;
    if not c.applies_to_all and not exists (select 1 from public.coupon_products cp
                                             where cp.coupon_id = c.id and cp.product_id = p.id) then
      raise exception 'This coupon does not apply to this product' using errcode = '22023';
    end if;
    if c.min_order_paise is not null and v_list < c.min_order_paise then
      raise exception 'Order amount is below this coupon''s minimum' using errcode = '22023';
    end if;
    if c.max_redemptions is not null
       and (select count(*) from public.coupon_redemptions cr where cr.coupon_id = c.id) >= c.max_redemptions then
      raise exception 'This coupon has been fully used' using errcode = '22023';
    end if;
    if (select count(*) from public.coupon_redemptions cr where cr.coupon_id = c.id and cr.user_id = p_user)
       >= c.max_per_user then
      raise exception 'You have already used this coupon' using errcode = '22023';
    end if;
    v_disc := case c.discount_type
                when 'percent' then floor(v_list * c.discount_value / 100.0)::int
                else c.discount_value end;
    if c.max_discount_paise is not null then v_disc := least(v_disc, c.max_discount_paise); end if;
    v_disc := least(v_disc, v_list);
  end if;

  return query select v_list, v_disc, v_list - v_disc, c.id;
end $$;

-- For the checkout page: price preview with a coupon.
create or replace function public.preview_price(p_product uuid, p_coupon_code text default null)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_user uuid := public._require_user();
  r record;
begin
  select * into r from public._quote(v_user, p_product, p_coupon_code);
  return jsonb_build_object('list_price_paise', r.list_price_paise, 'discount_paise', r.discount_paise,
                            'amount_paise', r.amount_paise, 'coupon_applied', r.coupon_id is not null);
end $$;

-- Marks an order paid, records the coupon use and grants/extends the enrollment.
create or replace function public._fulfill_order(p_order uuid, p_provider_payment_id text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  o public.orders;
  c public.coupons;
  v_exp timestamptz;
begin
  select * into o from public.orders where id = p_order for update;
  if not found then raise exception 'Order not found' using errcode = 'P0002'; end if;
  if o.status = 'paid' then return; end if;  -- idempotent (webhooks can repeat)
  if o.status <> 'pending' then
    raise exception 'Order is %', o.status using errcode = '22023';
  end if;

  if o.coupon_id is not null then
    select * into c from public.coupons where id = o.coupon_id for update;  -- serialise redemptions
    if c.max_redemptions is not null
       and (select count(*) from public.coupon_redemptions where coupon_id = c.id) >= c.max_redemptions then
      raise exception 'Coupon was fully used before payment completed' using errcode = '22023';
    end if;
    insert into public.coupon_redemptions (coupon_id, user_id, order_id, discount_paise)
    values (o.coupon_id, o.user_id, o.id, o.discount_paise);
  end if;

  update public.orders
     set status = 'paid', paid_at = now(),
         provider_payment_id = coalesce(p_provider_payment_id, provider_payment_id)
   where id = o.id;

  v_exp := public._enrollment_expiry(o.product_id, now());
  insert into public.enrollments as e (user_id, product_id, order_id, starts_at, expires_at)
  values (o.user_id, o.product_id, o.id, now(), v_exp)
  on conflict (user_id, product_id) do update
     set order_id = excluded.order_id,
         is_active = true,
         starts_at = case when e.expires_at is not null and e.expires_at <= now() then now() else e.starts_at end,
         expires_at = case when (e.expires_at is null and e.is_active) or excluded.expires_at is null then null
                           else greatest(e.expires_at, excluded.expires_at) end;
end $$;

-- Starts checkout. Free (₹0) orders complete immediately.
create or replace function public.create_order(
  p_product uuid, p_coupon_code text default null, p_provider text default 'demo')
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := public._require_user();
  r record;
  o public.orders;
begin
  if p_provider not in ('demo', 'razorpay') then
    raise exception 'Unknown payment provider' using errcode = '22023';
  end if;
  if exists (select 1 from public.enrollments
              where user_id = v_user and product_id = p_product and is_active
                and (expires_at is null or expires_at > now())) then
    raise exception 'You already have access to this' using errcode = '23505';
  end if;

  select * into r from public._quote(v_user, p_product, p_coupon_code);

  insert into public.orders (user_id, product_id, list_price_paise, coupon_id, discount_paise,
                             amount_paise, provider)
  values (v_user, p_product, r.list_price_paise, r.coupon_id, r.discount_paise, r.amount_paise,
          case when r.amount_paise = 0 then 'free' else p_provider end)
  returning * into o;

  if o.amount_paise = 0 then
    perform public._fulfill_order(o.id, null);
    select * into o from public.orders where id = o.id;
  end if;

  return jsonb_build_object('order_id', o.id, 'status', o.status, 'amount_paise', o.amount_paise,
                            'list_price_paise', o.list_price_paise, 'discount_paise', o.discount_paise,
                            'provider', o.provider);
end $$;

-- SERVER ONLY (service_role): payment provider confirmed the payment.
create or replace function public.mark_order_paid(p_order uuid, p_provider_payment_id text default null)
returns void language sql security definer set search_path = '' as $$
  select public._fulfill_order(p_order, p_provider_payment_id);
$$;

-- SERVER ONLY (service_role): payment failed / was cancelled.
create or replace function public.mark_order_failed(p_order uuid)
returns void language sql security definer set search_path = '' as $$
  update public.orders set status = 'failed' where id = p_order and status = 'pending';
$$;


-- =============================================================================
-- 7. ROW-LEVEL SECURITY
-- Pattern: catalog readable by everyone when published; content writable by
-- staff (faculty + admin); money and users admin-only; personal data owner-only.
-- Students reach questions/answers ONLY through the RPCs above.
-- =============================================================================
do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- ---------- Syllabus (public read, staff write) ----------------------------
create policy "read active exams" on public.exams for select to anon, authenticated
  using (is_active or public.is_staff());
create policy "staff manage exams" on public.exams for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

create policy "read sections" on public.syllabus_sections for select to anon, authenticated using (true);
create policy "staff manage sections" on public.syllabus_sections for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

create policy "read topics" on public.topics for select to anon, authenticated using (true);
create policy "staff manage topics" on public.topics for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- ---------- Profiles --------------------------------------------------------
-- Faculty see other users' names through public.profile_cards; emails/phones are admin-only.
create policy "read own profile or admin" on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());
create policy "update own profile or admin" on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- ---------- Courses & curriculum -------------------------------------------
create policy "read published courses" on public.courses for select to anon, authenticated
  using (status = 'published' or public.is_staff());
create policy "staff manage courses" on public.courses for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

create policy "read subjects of visible courses" on public.course_subjects for select to anon, authenticated
  using (public.course_visible(course_id));
create policy "staff manage subjects" on public.course_subjects for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

create policy "read modules of visible courses" on public.course_modules for select to anon, authenticated
  using (exists (select 1 from public.course_subjects s
                  where s.id = subject_id and public.course_visible(s.course_id)));
create policy "staff manage modules" on public.course_modules for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

create policy "read chapters of visible courses" on public.course_chapters for select to anon, authenticated
  using (exists (select 1 from public.course_modules m join public.course_subjects s on s.id = m.subject_id
                  where m.id = module_id and public.course_visible(s.course_id)));
create policy "staff manage chapters" on public.course_chapters for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- Lecture rows (titles, durations) are public for published courses so the
-- curriculum can be shown; the video file itself is protected in Storage.
create policy "read published lectures" on public.lectures for select to anon, authenticated
  using (public.is_staff() or (status = 'published' and public.course_visible(course_id)));
create policy "staff manage lectures" on public.lectures for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

create policy "read chapter topics" on public.chapter_topics for select to anon, authenticated using (true);
create policy "staff manage chapter topics" on public.chapter_topics for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- ---------- Question bank (staff only) -------------------------------------
create policy "staff manage question groups" on public.question_groups for all to authenticated
  using (public.is_staff()) with check (public.is_staff());
create policy "staff manage questions" on public.questions for all to authenticated
  using (public.is_staff()) with check (public.is_staff());
create policy "staff manage question options" on public.question_options for all to authenticated
  using (public.is_staff()) with check (public.is_staff());
create policy "staff manage question keys" on public.question_keys for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

create policy "own bookmarks" on public.question_bookmarks for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "create own reports" on public.question_reports for insert to authenticated
  with check (user_id = auth.uid() and status = 'open' and resolved_by is null);
create policy "read own reports or staff" on public.question_reports for select to authenticated
  using (user_id = auth.uid() or public.is_staff());
create policy "staff resolve reports" on public.question_reports for update to authenticated
  using (public.is_staff()) with check (public.is_staff());
create policy "staff delete reports" on public.question_reports for delete to authenticated
  using (public.is_staff());

-- ---------- Tests -----------------------------------------------------------
create policy "read published tests" on public.tests for select to anon, authenticated
  using (status = 'published' or public.is_staff());
create policy "staff manage tests" on public.tests for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

create policy "read sections of published tests" on public.test_sections for select to anon, authenticated
  using (public.is_staff() or exists (select 1 from public.tests t where t.id = test_id and t.status = 'published'));
create policy "staff manage test sections" on public.test_sections for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

create policy "staff manage test questions" on public.test_questions for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

create policy "read own attempts or staff" on public.test_attempts for select to authenticated
  using (user_id = auth.uid() or public.is_staff());
create policy "read own responses or staff" on public.test_responses for select to authenticated
  using (public.is_staff() or exists (select 1 from public.test_attempts a
                                       where a.id = attempt_id and a.user_id = auth.uid()));

-- ---------- Test series, bundles, products (catalog public; admin write) ---
create policy "read published series" on public.test_series for select to anon, authenticated
  using (status = 'published' or public.is_staff());
create policy "staff manage series" on public.test_series for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

create policy "read series tests" on public.test_series_tests for select to anon, authenticated using (true);
create policy "staff manage series tests" on public.test_series_tests for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

create policy "read course tests" on public.course_tests for select to anon, authenticated using (true);
create policy "staff manage course tests" on public.course_tests for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

create policy "read active products" on public.products for select to anon, authenticated
  using (is_active or public.is_admin());
create policy "admin manage products" on public.products for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "read bundle items" on public.bundle_items for select to anon, authenticated using (true);
create policy "admin manage bundle items" on public.bundle_items for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------- Coupons, orders, enrollments -----------------------------------
create policy "admin manage coupons" on public.coupons for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy "admin manage coupon products" on public.coupon_products for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy "read own redemptions or admin" on public.coupon_redemptions for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

create policy "read own orders or admin" on public.orders for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
create policy "admin update orders" on public.orders for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "read own enrollments or admin" on public.enrollments for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
create policy "admin manage enrollments" on public.enrollments for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------- Practice & progress --------------------------------------------
create policy "read own practice or staff" on public.practice_sessions for select to authenticated
  using (user_id = auth.uid() or public.is_staff());
create policy "read own practice answers or staff" on public.practice_answers for select to authenticated
  using (user_id = auth.uid() or public.is_staff());
create policy "read own progress or staff" on public.lecture_progress for select to authenticated
  using (user_id = auth.uid() or public.is_staff());

-- ---------- Doubts (visible to everyone with course access) ----------------
create policy "read doubts with course access" on public.lecture_doubts for select to authenticated
  using (public.has_course_access(public.lecture_course_id(lecture_id)));
create policy "ask doubts with course access" on public.lecture_doubts for insert to authenticated
  with check (user_id = auth.uid() and status = 'open' and not is_pinned
              and public.has_course_access(public.lecture_course_id(lecture_id)));
create policy "edit own open doubt or staff" on public.lecture_doubts for update to authenticated
  using ((user_id = auth.uid() and status = 'open') or public.is_staff())
  with check (public.is_staff() or (user_id = auth.uid() and status in ('open', 'closed') and not is_pinned));
create policy "delete own doubt or staff" on public.lecture_doubts for delete to authenticated
  using (user_id = auth.uid() or public.is_staff());

create policy "read replies of visible doubts" on public.doubt_replies for select to authenticated
  using (exists (select 1 from public.lecture_doubts d where d.id = doubt_id));
create policy "reply to visible doubts" on public.doubt_replies for insert to authenticated
  with check (user_id = auth.uid() and exists (select 1 from public.lecture_doubts d where d.id = doubt_id));
create policy "edit own reply or staff" on public.doubt_replies for update to authenticated
  using (user_id = auth.uid() or public.is_staff()) with check (user_id = auth.uid() or public.is_staff());
create policy "delete own reply or staff" on public.doubt_replies for delete to authenticated
  using (user_id = auth.uid() or public.is_staff());

-- ---------- Audit log -------------------------------------------------------
create policy "admin read audit log" on public.audit_log for select to authenticated
  using (public.is_admin());


-- =============================================================================
-- 8. VIEWS + ADMIN ANALYTICS
-- security_invoker = true → the caller's RLS applies.
-- =============================================================================

-- Real catalog numbers per course.
create view public.course_stats with (security_invoker = true) as
select c.id as course_id,
       (select count(*) from public.course_subjects s where s.course_id = c.id) as subject_count,
       (select count(*) from public.lectures l where l.course_id = c.id and l.status = 'published') as lecture_count,
       (select coalesce(sum(l.duration_seconds), 0) from public.lectures l
         where l.course_id = c.id and l.status = 'published') as total_duration_seconds,
       (select count(*) from public.lectures l
         where l.course_id = c.id and l.status = 'published' and l.is_free_preview) as free_preview_count,
       (select count(*) from public.course_tests ct where ct.course_id = c.id) as test_count,
       (select count(*) from public.course_tests ct join public.tests t on t.id = ct.test_id
         where ct.course_id = c.id and t.is_free and t.status = 'published') as free_test_count
  from public.courses c;

-- Per user × course progress (students see their own rows).
create view public.course_progress with (security_invoker = true) as
select lp.user_id,
       l.course_id,
       count(*) filter (where lp.completed_at is not null) as completed_lectures,
       (select count(*) from public.lectures l2
         where l2.course_id = l.course_id and l2.status = 'published') as total_lectures,
       max(lp.updated_at) as last_activity_at,
       (array_agg(lp.lecture_id order by lp.updated_at desc))[1] as last_lecture_id
  from public.lecture_progress lp
  join public.lectures l on l.id = lp.lecture_id
 group by lp.user_id, l.course_id;

-- Question quality (staff only, since questions are staff-only).
create view public.question_stats with (security_invoker = true) as
with answers as (
  select question_id, is_correct, time_taken_seconds as t from public.practice_answers
  union all
  select tq.question_id, r.is_correct, r.time_spent_seconds
    from public.test_responses r join public.test_questions tq on tq.id = r.test_question_id
   where r.is_correct is not null
)
select q.id as question_id,
       count(a.question_id) as attempts,
       round(100.0 * count(*) filter (where a.is_correct) / nullif(count(a.question_id), 0), 1) as correct_percent,
       round(avg(a.t)) as avg_time_seconds,
       (select count(*) from public.question_reports r where r.question_id = q.id and r.status = 'open') as open_reports
  from public.questions q
  left join answers a on a.question_id = q.id
 group by q.id;

-- Public name/avatar card (used for doubt threads, leaderboards). Exposes no
-- email/phone. Deliberately runs as owner so names are visible to other users.
create view public.profile_cards as
select id, full_name, avatar_path, role from public.profiles;

-- Admin dashboard: daily numbers for the last N days.
create or replace function public.admin_daily_activity(p_days int default 30)
returns table (day date, signups bigint, active_users bigint, enrollments bigint,
               paid_orders bigint, revenue_paise bigint, practice_answers bigint,
               tests_submitted bigint, lectures_watched bigint)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'Admins only' using errcode = '42501';
  end if;
  return query
  with days as (
    select generate_series((now() at time zone 'Asia/Kolkata')::date - (least(greatest(p_days, 1), 365) - 1),
                           (now() at time zone 'Asia/Kolkata')::date, interval '1 day')::date as d
  ), activity as (
    select user_id, (updated_at at time zone 'Asia/Kolkata')::date as d from public.lecture_progress
    union all select user_id, (answered_at at time zone 'Asia/Kolkata')::date from public.practice_answers
    union all select user_id, (started_at at time zone 'Asia/Kolkata')::date from public.test_attempts
  )
  select days.d,
         (select count(*) from public.profiles p where (p.created_at at time zone 'Asia/Kolkata')::date = days.d),
         (select count(distinct a.user_id) from activity a where a.d = days.d),
         (select count(*) from public.enrollments e where (e.created_at at time zone 'Asia/Kolkata')::date = days.d),
         (select count(*) from public.orders o where o.status = 'paid'
             and (o.paid_at at time zone 'Asia/Kolkata')::date = days.d),
         (select coalesce(sum(o.amount_paise), 0)::bigint from public.orders o where o.status = 'paid'
             and (o.paid_at at time zone 'Asia/Kolkata')::date = days.d),
         (select count(*) from public.practice_answers pa where (pa.answered_at at time zone 'Asia/Kolkata')::date = days.d),
         (select count(*) from public.test_attempts ta where ta.status <> 'in_progress'
             and (ta.submitted_at at time zone 'Asia/Kolkata')::date = days.d),
         (select count(*) from public.lecture_progress lp where (lp.updated_at at time zone 'Asia/Kolkata')::date = days.d)
    from days order by days.d;
end $$;

-- Storage usage per bucket (for the admin "free plan" meter).
create or replace function public.admin_storage_usage()
returns table (bucket_id text, files bigint, total_bytes bigint)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_staff() then
    raise exception 'Staff only' using errcode = '42501';
  end if;
  return query
    select o.bucket_id::text, count(*), coalesce(sum((o.metadata ->> 'size')::bigint), 0)::bigint
      from storage.objects o group by o.bucket_id;
end $$;


-- =============================================================================
-- 9. STORAGE BUCKETS + POLICIES
-- Paths: lecture-videos/<lecture_id>/<file>.mp4, lecture-notes/<lecture_id>/<file>.pdf,
--        avatars/<user_id>/<file>
-- =============================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('lecture-videos', 'lecture-videos', false, 52428800, array['video/mp4', 'video/webm']),        -- 50 MB (Free plan max)
  ('lecture-notes',  'lecture-notes',  false, 20971520, array['application/pdf']),                -- 20 MB
  ('thumbnails',     'thumbnails',     true,  5242880,  array['image/png', 'image/jpeg', 'image/webp']),
  ('question-media', 'question-media', true,  5242880,  array['image/png', 'image/jpeg', 'image/webp', 'image/gif']),
  ('avatars',        'avatars',        true,  2097152,  array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

create policy "v4 staff manage content files" on storage.objects for all to authenticated
  using (bucket_id in ('lecture-videos', 'lecture-notes', 'thumbnails', 'question-media') and public.is_staff())
  with check (bucket_id in ('lecture-videos', 'lecture-notes', 'thumbnails', 'question-media') and public.is_staff());

create policy "v4 watch lecture files" on storage.objects for select to anon, authenticated
  using (bucket_id in ('lecture-videos', 'lecture-notes')
         and public.can_watch_lecture(public.uuid_or_null((storage.foldername(name))[1])));

create policy "v4 users manage own avatar" on storage.objects for all to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);


-- =============================================================================
-- 10. FUNCTION PRIVILEGES
-- Supabase grants EXECUTE on new functions to anon/authenticated by default.
-- Internal helpers and server-only functions are locked down here.
-- =============================================================================
revoke execute on function public._require_user() from public, anon, authenticated;
revoke execute on function public._audit(text, text, uuid, jsonb) from public, anon, authenticated;
revoke execute on function public._assert_question_valid(uuid) from public, anon, authenticated;
revoke execute on function public._enrollment_expiry(uuid, timestamptz) from public, anon, authenticated;
revoke execute on function public._score_attempt(uuid, public.attempt_status) from public, anon, authenticated;
revoke execute on function public._sync_attempt_clock(uuid) from public, anon, authenticated;
revoke execute on function public._quote(uuid, uuid, text) from public, anon, authenticated;
revoke execute on function public._fulfill_order(uuid, text) from public, anon, authenticated;
revoke execute on function public.user_product_ids(uuid) from public, anon, authenticated;
revoke execute on function public.has_product_access(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.expire_overdue_attempts() from public, anon, authenticated;
revoke execute on function public.mark_order_paid(uuid, text) from public, anon, authenticated;
revoke execute on function public.mark_order_failed(uuid) from public, anon, authenticated;
grant execute on function public.expire_overdue_attempts() to service_role;
grant execute on function public.mark_order_paid(uuid, text) to service_role;
grant execute on function public.mark_order_failed(uuid) to service_role;
grant execute on function public.user_product_ids(uuid) to service_role;
grant execute on function public.has_product_access(uuid, uuid) to service_role;

-- Trigger functions are not meant to be called directly.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.protect_profile() from public, anon, authenticated;
revoke execute on function public.lectures_set_course() from public, anon, authenticated;
revoke execute on function public.courses_on_status() from public, anon, authenticated;
revoke execute on function public.products_audit() from public, anon, authenticated;
revoke execute on function public.enrollments_audit() from public, anon, authenticated;
revoke execute on function public.bundle_items_validate() from public, anon, authenticated;
revoke execute on function public.questions_validate() from public, anon, authenticated;
revoke execute on function public.doubt_replies_before() from public, anon, authenticated;
revoke execute on function public.doubt_replies_after() from public, anon, authenticated;
revoke execute on function public.protect_free_flag() from public, anon, authenticated;

-- The profile card view is read-only for signed-in users.
revoke all on public.profile_cards from anon;
revoke insert, update, delete on public.profile_cards from authenticated;


-- =============================================================================
-- 11. SCHEDULED JOBS
-- Auto-submits tests whose time ran out (even if the student closed the tab).
-- If pg_cron is not enabled this prints a notice instead of failing; enable it
-- in Dashboard → Database → Extensions and re-run this block.
-- =============================================================================
do $$
begin
  create extension if not exists pg_cron with schema pg_catalog;
  perform cron.schedule('v4-expire-test-attempts', '* * * * *',
                        'select public.expire_overdue_attempts()');
exception when others then
  raise notice 'pg_cron not set up (%). Enable pg_cron and run: select cron.schedule(''v4-expire-test-attempts'', ''* * * * *'', ''select public.expire_overdue_attempts()'');', sqlerrm;
end $$;
