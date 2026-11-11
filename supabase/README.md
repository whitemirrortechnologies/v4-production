# V4 database: how to create it

## On your Supabase project (SQL Editor)

1. Create a new project in your Supabase account. Region: **South Asia (Mumbai)**.
2. **Dashboard → Database → Extensions** → enable **pg_cron**. It auto-submits tests when time
   runs out. If you skip this, step 3 prints a notice and everything else still works.
3. **SQL Editor → New query** → paste all of
   [`migrations/20261111000000_init.sql`](migrations/20261111000000_init.sql) → **Run**.
   This creates all tables, security rules, functions, views and storage buckets. It's meant to run
   **once** on an empty project.
4. **New query** → paste [`seed.sql`](seed.sql) → **Run**. This adds GATE CS/IT and CAT and their
   full syllabus topics. It's safe to run again.
5. Create your admin account:
   **Authentication → Users → Add user** (email + password, tick "Auto confirm"), then in SQL Editor:
   ```sql
   update public.profiles set role = 'admin' where email = 'you@example.com';
   ```
   Do the same with `'faculty'` for faculty accounts.
6. Check it worked:
   ```sql
   select code, (select count(*) from public.topics t join public.syllabus_sections s on s.id = t.section_id
                  where s.exam_id = e.id) as topics
     from public.exams e;
   ```
   Expected: `GATE_CS` and `CAT`, each with a topic count.

> The Security Advisor will flag `public.profile_cards` as a "security definer view". That's
> intended: it shows only name, avatar and role, so students can see who answered a doubt, and it
> never exposes email or phone.

## What the app calls (RPC functions)

The frontend never reads questions, answer keys or other students' data directly. It calls these:

| Area | Function | Who |
|---|---|---|
| Tests | `start_test_attempt(test)` → attempt id (resumes an open one) | student |
| | `get_attempt_paper(attempt)` → questions without answers + server clock | student |
| | `save_test_response(attempt, test_question, state, options[], number, text, seconds)` | student |
| | `finish_test_section(attempt)` (CAT timed sections) | student |
| | `submit_test_attempt(attempt)` → full result | student |
| | `get_attempt_result(attempt)` → score, rank, percentile, topics, solutions | student / staff |
| | `get_test_leaderboard(test, limit)` | anyone with access |
| Practice | `start_practice_session(exam, topics[], difficulties[], types[], pyq_only, years[], count, timed, seconds)` | student |
| | `get_practice_session(session)` / `answer_practice_question(...)` / `end_practice_session(session)` | student |
| Lectures | `save_lecture_progress(lecture, position_s, watched_delta_s)` | student |
| Checkout | `preview_price(product, coupon)` / `create_order(product, coupon, provider)` | student |
| | `mark_order_paid(order, payment_id)` / `mark_order_failed(order)` | **server only** (service role) |
| Admin | `admin_daily_activity(days)` / `admin_storage_usage()` | admin / staff |
| Access | `has_course_access(course)` / `has_test_access(test)` / `has_exam_access(exam)` / `can_watch_lecture(lecture)` | anyone |

**Free vs paid** is set by admins only: product price ₹0 (whole course/series/bundle),
`lectures.is_free_preview`, `tests.is_free`, `questions.is_free_practice`. Practice requires buying
something for that exam, except questions marked free.

## Testing locally

`supabase/tests/run.sh` builds a throwaway local Postgres database with stand-ins for Supabase's
`auth`/`storage` schemas. It applies the migration and seed, then runs `tests/e2e.sql`, which acts
as admin, faculty and two students and checks the security rules, checkout and coupons, scoring and
negative marks, timed CAT sections, auto-expiry, practice, progress, doubts and video access.

```bash
PGUSER=postgres bash supabase/tests/run.sh
```

**Never run anything in `supabase/tests/` on the real project.**
