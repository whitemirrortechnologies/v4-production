# V4 — Database design (Supabase Postgres) — v2

> SQL: [`supabase/migrations/20261111000000_init.sql`](../supabase/migrations/20261111000000_init.sql) · how to run: [`supabase/README.md`](../supabase/README.md)

Everything lives in **one Supabase project**: Postgres tables, Auth users and Storage files
(including lecture videos for now). Each lecture records `video_provider`, so videos can move to
Cloudflare R2 later without changing the schema.

Conventions:
- `id uuid primary key default gen_random_uuid()` unless stated otherwise.
- Every table has `created_at timestamptz default now()`, and editable tables also have `updated_at`.
- Money is stored as **integer paise** (`₹499 = 49900`) to avoid rounding errors.
- `position int` = display order among siblings (drag-to-reorder in admin).
- **RLS is on for every table.** Column notes like 🔒 mean students can never read that data.

Decisions reflected here:
- **Faculty** have full content control: create, edit and **publish** courses, lectures, questions
  and tests. **Only admins** manage prices (products, coupons), users and roles, orders and
  enrollments.
- **Test attempts:** the admin sets `max_attempts` per test (null = unlimited). Rank and percentile
  always use each student's first attempt.
- **Validity:** set per product, either a number of days or a fixed end date (e.g. after GATE 2027),
  or lifetime.
- **Included from day one:** coupons, bundles, lecture doubts/Q&A, question error reports.
- **Free vs paid is decided by the admin.** Nothing is free by default:
  - a whole course / series / bundle is free when its product price is ₹0
  - `lectures.is_free_preview`: a single lecture anyone can watch (e.g. the first video)
  - `tests.is_free`: a single test any signed-in user can take (e.g. the first mock)
  - `questions.is_free_practice`: questions anyone signed in can practise

  Only admins can set or change these flags (enforced by a database trigger, even for faculty),
  and every change is written to `audit_log`.
- **Practice is for buyers.** Buying any course, test series or bundle for an exam unlocks practice
  on all of that exam's questions. Non-buyers can only practise questions marked `is_free_practice`.

---

## 0. Enums

| Enum | Values |
|---|---|
| `user_role` | `student`, `faculty`, `admin` |
| `content_status` | `draft`, `published`, `archived` |
| `difficulty` | `easy`, `medium`, `hard` |
| `question_type` | `mcq` (single correct), `msq` (multiple correct), `nat` (numerical range), `tita` (CAT type-in) |
| `video_status` | `none`, `uploading`, `ready`, `failed` |
| `product_type` | `course`, `test_series`, `bundle` |
| `discount_type` | `percent`, `fixed` |
| `doubt_status` | `open`, `answered`, `closed` |
| `report_reason` | `wrong_answer`, `wrong_question`, `typo`, `unclear_solution`, `other` |
| `report_status` | `open`, `accepted`, `rejected` |
| `order_status` | `pending`, `paid`, `failed`, `refunded` |
| `test_kind` | `full_mock`, `sectional`, `topic_test`, `pyq_paper` |
| `attempt_status` | `in_progress`, `submitted`, `expired` |
| `response_state` | `not_visited`, `not_answered`, `answered`, `marked_for_review`, `answered_and_marked` |

---

## 1. Users

### `profiles`: one row per Supabase Auth user (created automatically by trigger on sign-up)
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | = `auth.users.id` |
| full_name | text | |
| email | text | copied from auth for admin search |
| phone | text null | |
| avatar_path | text null | Storage path |
| role | user_role | default `student`. Only admins can change it |
| target_exam_id | uuid → exams null | what the student is preparing for |
| is_blocked | bool | default false. Admin can suspend an account |

---

## 2. Exams & syllabus (used to tag questions, separate from course structure)

### `exams`
| Column | Type | Notes |
|---|---|---|
| code | text unique | `GATE_CS`, `CAT` (a table rather than an enum, so `GATE_DA` etc. can be added later) |
| name | text | "GATE Computer Science & IT" |
| description | text | |
| is_active | bool | |
| position | int | |

### `syllabus_sections`: GATE subjects / CAT sections
| Column | Type | Notes |
|---|---|---|
| exam_id | uuid → exams | |
| name | text | e.g. "Algorithms", "General Aptitude" / "VARC", "DILR", "QA" |
| position | int | |

### `topics`: topic → subtopic (one level of nesting)
| Column | Type | Notes |
|---|---|---|
| section_id | uuid → syllabus_sections | |
| parent_id | uuid → topics null | null = topic, set = subtopic |
| name | text | e.g. "Graph Algorithms" → "Shortest Paths" |
| slug | text | unique per section |
| position | int | |

Seeded with the official GATE CS/IT and CAT syllabi.

---

## 3. Courses & curriculum: course → subject → module → chapter → lecture

### `courses`
| Column | Type | Notes |
|---|---|---|
| exam_id | uuid → exams | |
| slug | text unique | URL: `/courses/algorithms-for-gate-cs` |
| title, subtitle | text | |
| description | text | Markdown |
| thumbnail_path | text null | Storage `thumbnails/` (public) |
| status | content_status | only `published` is visible to students |
| published_at | timestamptz null | |
| created_by | uuid → profiles | |

### `course_subjects` · `course_modules` · `course_chapters`
| Table | Parent column | Other columns |
|---|---|---|
| course_subjects | course_id → courses | title, position |
| course_modules | subject_id → course_subjects | title, position |
| course_chapters | module_id → course_modules | title, position |

### `lectures`
| Column | Type | Notes |
|---|---|---|
| chapter_id | uuid → course_chapters | |
| course_id | uuid → courses | **denormalised** (kept in sync by trigger) for fast access checks and counts |
| title | text | |
| description | text null | |
| position | int | |
| is_free_preview | bool | **admin-only**: watchable without buying |
| video_provider | text | `supabase` now, `r2` later |
| video_path | text null | object key, e.g. `lecture-videos/<lecture_id>/<file>.mp4` |
| video_status | video_status | |
| video_size_bytes | bigint null | for the admin storage meter |
| duration_seconds | int null | read from the file at upload |
| notes_path | text null | PDF in `lecture-notes/` (private) |
| status | content_status | |
| created_by | uuid → profiles | |

### `chapter_topics`: links curriculum to syllabus ("practice this chapter")
| chapter_id → course_chapters | topic_id → topics | PK (chapter_id, topic_id) |
|---|---|---|

---

## 4. Products, orders, enrollments

One `product` = one thing a student can buy: a course, a test series, **or a bundle** of
other products.
Courses can also bundle tests (`course_tests`), so buying the course unlocks them too.

### `test_series`
| Column | Type | Notes |
|---|---|---|
| exam_id | uuid → exams | |
| slug | text unique | |
| title, description | text | |
| thumbnail_path | text null | |
| status | content_status | |

### `test_series_tests` / `course_tests`
| Table | Columns |
|---|---|
| test_series_tests | series_id → test_series, test_id → tests, position. PK (series_id, test_id) |
| course_tests | course_id → courses, test_id → tests, position. PK (course_id, test_id) |

### `products`
| Column | Type | Notes |
|---|---|---|
| type | product_type | |
| course_id | uuid → courses null | set when type = course |
| test_series_id | uuid → test_series null | set when type = test_series |
| slug, title, description, thumbnail_path | text null | used by bundles (courses/series use their own) |
| price_paise | int | 0 = free |
| sale_price_paise | int null | optional discounted price |
| validity_days | int null | access lasts N days from purchase |
| access_until | date null | access ends on a fixed date (e.g. after the exam) |
| is_active | bool | |
| | | CHECK: course_id / test_series_id set according to `type` (both null for bundles) |
| | | Expiry = the earlier of (purchase + validity_days) and access_until. Both null = lifetime |

### `bundle_items`
| Column | Type | Notes |
|---|---|---|
| bundle_product_id | uuid → products | must be type `bundle` |
| item_product_id | uuid → products | a course or test-series product (no bundles inside bundles) |
| position | int | |
| | | PK (bundle_product_id, item_product_id) |

### `coupons` (admin only)
| Column | Type | Notes |
|---|---|---|
| code | citext unique | e.g. `GATE50`, case-insensitive |
| description | text | internal note |
| discount_type | discount_type | |
| discount_value | int | percent (1–100) or paise |
| max_discount_paise | int null | cap for percentage coupons |
| min_order_paise | int null | |
| valid_from, valid_until | timestamptz null | |
| max_redemptions | int null | total uses allowed |
| max_per_user | int | default 1 |
| applies_to_all | bool | false = only the products in `coupon_products` |
| is_active | bool | |

### `coupon_products`
| coupon_id → coupons | product_id → products | PK (coupon_id, product_id) |
|---|---|---|

### `coupon_redemptions`
| Column | Type | Notes |
|---|---|---|
| coupon_id | uuid → coupons | |
| user_id | uuid → profiles | |
| order_id | uuid → orders unique | recorded only when the order is **paid** |
| discount_paise | int | |

### `orders`
| Column | Type | Notes |
|---|---|---|
| user_id | uuid → profiles | |
| product_id | uuid → products | |
| list_price_paise | int | price at checkout time |
| coupon_id | uuid → coupons null | |
| discount_paise | int | default 0 |
| amount_paise | int | what was actually charged = list − discount (fixed at checkout) |
| currency | text | `INR` |
| status | order_status | |
| provider | text | `demo` now, `razorpay` later |
| provider_order_id, provider_payment_id | text null | |
| paid_at | timestamptz null | |

### `enrollments`: access rights
| Column | Type | Notes |
|---|---|---|
| user_id | uuid → profiles | |
| product_id | uuid → products | |
| order_id | uuid → orders null | null = granted manually by admin |
| starts_at | timestamptz | |
| expires_at | timestamptz null | from `validity_days`. null = lifetime |
| is_active | bool | admin can revoke |
| | | UNIQUE (user_id, product_id) |

Helper SQL functions used by RLS and the app: `has_course_access(user, course)` and
`has_test_access(user, test)` and `has_exam_access(user, exam)` (unlocks practice). They count
direct purchases **and bundles**. A test is accessible if
it's free, in a purchased series, or in a purchased course.

---

## 5. Question bank

### `question_groups`: shared passage / data set (CAT RC & DILR, GATE common-data)
| Column | Type | Notes |
|---|---|---|
| exam_id | uuid → exams | |
| title | text | internal name |
| content | text | Markdown + KaTeX + images |
| created_by | uuid → profiles | |

### `questions`
| Column | Type | Notes |
|---|---|---|
| exam_id | uuid → exams | |
| topic_id | uuid → topics | main topic (drives practice filters and topic analytics) |
| group_id | uuid → question_groups null | |
| type | question_type | |
| difficulty | difficulty | |
| stem | text | Markdown + KaTeX. Images in Storage `question-media/` |
| marks | numeric(4,2) | GATE 1 or 2, CAT 3 |
| negative_marks | numeric(4,2) | GATE MCQ ⅓ or ⅔, CAT MCQ 1, MSQ/NAT/TITA 0. Pre-filled by the editor |
| is_pyq | bool | |
| is_free_practice | bool | **admin-only**: practisable without a purchase |
| pyq_year | smallint null | required when is_pyq |
| pyq_paper | text null | e.g. "GATE CS 2024 Set 1", "CAT 2023 Slot 2" |
| status | content_status | only `published` questions go into practice and tests |
| created_by, reviewed_by | uuid → profiles | |

### `question_options`: for MCQ / MSQ
| Column | Type | Notes |
|---|---|---|
| question_id | uuid → questions | |
| label | text | A, B, C, D |
| content | text | Markdown |
| position | int | |

### `question_keys` 🔒: answers and solutions, **never readable by students through RLS**
| Column | Type | Notes |
|---|---|---|
| question_id | uuid PK → questions | |
| correct_option_ids | uuid[] null | MCQ: exactly 1. MSQ: 1 or more |
| nat_min, nat_max | numeric null | NAT: answer correct if `nat_min ≤ x ≤ nat_max` |
| tita_answer | text null | CAT TITA: exact match (trimmed) |
| explanation | text | Markdown solution |
| solution_video_lecture_id | uuid → lectures null | optional video solution |

Students only get the key and explanation through server functions, after answering in practice or
after submitting a test.

### `question_bookmarks`: student's "revise later" list
| user_id → profiles | question_id → questions | created_at | PK (user_id, question_id) |
|---|---|---|---|

---

## 6. Tests

### `tests`
| Column | Type | Notes |
|---|---|---|
| exam_id | uuid → exams | |
| slug | text unique | |
| title | text | |
| kind | test_kind | |
| instructions | text | Markdown, shown before starting |
| duration_minutes | int | overall time (GATE 180, CAT 120) |
| is_free | bool | **admin-only**: any signed-in user can take it without buying |
| max_attempts | int null | set by admin per test. null = unlimited |
| available_from, available_until | timestamptz null | for scheduled "live" mocks |
| status | content_status | |
| created_by | uuid → profiles | |

### `test_sections`
| Column | Type | Notes |
|---|---|---|
| test_id | uuid → tests | |
| name | text | GATE: "General Aptitude", "Computer Science". CAT: "VARC", "DILR", "QA" |
| position | int | |
| duration_minutes | int null | **set = section has its own timer and locks once finished (CAT)**. null = shared timer, free navigation (GATE) |

### `test_questions`
| Column | Type | Notes |
|---|---|---|
| test_id | uuid → tests | |
| section_id | uuid → test_sections | |
| question_id | uuid → questions | |
| position | int | |
| marks, negative_marks | numeric null | override the question's defaults for this test |
| | | UNIQUE (test_id, question_id) |

### `test_attempts`
| Column | Type | Notes |
|---|---|---|
| user_id | uuid → profiles | |
| test_id | uuid → tests | |
| attempt_no | int | 1, 2, … |
| status | attempt_status | |
| started_at | timestamptz | |
| deadline_at | timestamptz | **set by the server**, the only clock that counts |
| current_section_id | uuid → test_sections null | for timed sections |
| section_deadline_at | timestamptz null | |
| submitted_at | timestamptz null | |
| score, max_score | numeric null | filled at submit |
| correct_count, wrong_count, unanswered_count | int null | |
| section_scores | jsonb null | `{section_id: {score, correct, wrong, time_s}}` |
| percentile | numeric null | among first attempts of all students |

### `test_responses`
| Column | Type | Notes |
|---|---|---|
| attempt_id | uuid → test_attempts | |
| test_question_id | uuid → test_questions | |
| state | response_state | drives the question palette colours |
| selected_option_ids | uuid[] null | MCQ/MSQ |
| numeric_answer | numeric null | NAT |
| text_answer | text null | TITA |
| time_spent_seconds | int | |
| is_correct | bool null | filled at submit |
| marks_awarded | numeric null | filled at submit |
| | | PK (attempt_id, test_question_id) |

Scoring is a Postgres function `submit_test_attempt(attempt_id)`. A `pg_cron` job auto-submits
attempts past their `deadline_at`, even if the student closed the tab.

---

## 7. Practice

### `practice_sessions`
| Column | Type | Notes |
|---|---|---|
| user_id | uuid → profiles | |
| exam_id | uuid → exams | |
| filters | jsonb | `{topic_ids, difficulty, pyq_only, years}` |
| question_ids | uuid[] | questions chosen for this session, in order |
| is_timed | bool | |
| time_limit_seconds | int null | |
| started_at, ended_at | timestamptz | |
| question_count, answered_count, correct_count | int | |

### `practice_answers`
| Column | Type | Notes |
|---|---|---|
| session_id | uuid → practice_sessions | |
| user_id | uuid → profiles | |
| question_id | uuid → questions | |
| selected_option_ids / numeric_answer / text_answer | | same as test_responses |
| is_correct | bool | |
| time_taken_seconds | int | |
| answered_at | timestamptz | |

### `question_reports`: "Report an error" from students
| Column | Type | Notes |
|---|---|---|
| question_id | uuid → questions | |
| user_id | uuid → profiles | |
| reason | report_reason | |
| message | text null | |
| test_attempt_id / practice_session_id | uuid null | where it was reported from |
| status | report_status | admin/faculty review queue |
| resolved_by | uuid → profiles null | |
| resolved_at | timestamptz null | |
| resolution_note | text null | shown back to the student |

---

## 8. Learning progress

### `lecture_progress`
| Column | Type | Notes |
|---|---|---|
| user_id | uuid → profiles | |
| lecture_id | uuid → lectures | |
| last_position_seconds | int | resume point |
| watched_seconds | int | total actually watched (skipping doesn't count) |
| completed_at | timestamptz null | set at ≥ 90 % watched |
| updated_at | timestamptz | also used for "continue watching" and activity stats |
| | | PK (user_id, lecture_id) |

### `lecture_doubts`: student questions under a lecture
| Column | Type | Notes |
|---|---|---|
| lecture_id | uuid → lectures | |
| user_id | uuid → profiles | asker |
| body | text | Markdown + KaTeX |
| video_timestamp_seconds | int null | "at 12:34 in the video" |
| status | doubt_status | |
| is_pinned | bool | faculty can pin useful ones |

Visible to students enrolled in the course (shared, like a class forum).

### `doubt_replies`
| Column | Type | Notes |
|---|---|---|
| doubt_id | uuid → lecture_doubts | |
| user_id | uuid → profiles | |
| body | text | |
| is_staff_answer | bool | set automatically when faculty/admin reply, and marks the doubt `answered` |

---

## 9. Admin

### `audit_log`
| Column | Type | Notes |
|---|---|---|
| actor_id | uuid → profiles | |
| action | text | `role.change`, `course.publish`, `price.change`, `enrollment.grant`, … |
| entity_type, entity_id | text, uuid | |
| details | jsonb | before/after values |

---

## 10. Views (computed, nothing stored, so students only see real numbers)

| View | Gives |
|---|---|
| `course_stats` | per course: subjects, lectures, total video minutes, free-preview count, linked tests |
| `course_progress` | per user × course: % lectures completed, last watched lecture |
| `profile_cards` | name, avatar and role only (for doubt threads and leaderboards) |
| `question_stats` | attempts, % correct, avg time per question (flags too-easy or too-hard questions) |


---

## 11. Storage buckets

| Bucket | Access | Contents | Limit (Free plan) |
|---|---|---|---|
| `lecture-videos` | private, signed URLs for enrolled users | MP4 lectures | **50 MB per file, 1 GB total for the whole project** |
| `lecture-notes` | private, signed URLs | PDFs | |
| `thumbnails` | public | course/series images | |
| `question-media` | public | images inside questions/solutions | |
| `avatars` | public | profile photos | |

---

## Relationship overview

```
exams ─┬─ syllabus_sections ── topics ◄──────────────┐
       │                                             │ topic_id
       ├─ courses ── course_subjects ── course_modules ── course_chapters ── lectures
       │     │                                        └─ chapter_topics ──┘
       │     └─ course_tests ─┐
       ├─ test_series ── test_series_tests ─┤
       │                                    ▼
       ├─ tests ── test_sections ── test_questions ──► questions ── question_options
       │                                    │              ├─ question_keys 🔒
       │                                    │              └─ question_groups
       └─ products (course | test_series) ── orders ── enrollments ◄── profiles
                                                                       │
       products ── bundle_items · coupons ── coupon_products · coupon_redemptions
     profiles ── lecture_progress · practice_sessions/answers · test_attempts/responses · bookmarks
     lectures ── lecture_doubts ── doubt_replies          questions ── question_reports
```

**Total: 37 tables + 4 views.** Leaderboard, admin daily activity and storage usage are
functions (`get_test_leaderboard`, `admin_daily_activity`, `admin_storage_usage`).
