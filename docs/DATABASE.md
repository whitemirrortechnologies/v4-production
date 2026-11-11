# V4 — Database design (Supabase Postgres) — DRAFT v1

Everything lives in **one Supabase project**: Postgres tables, Auth users and Storage files
(including lecture videos for now). Each lecture records `video_provider`, so videos can move to
Cloudflare R2 later without changing the schema.

Conventions:
- `id uuid primary key default gen_random_uuid()` unless stated otherwise.
- Every table has `created_at timestamptz default now()`, and editable tables also have `updated_at`.
- Money is stored as **integer paise** (`₹499 = 49900`) to avoid rounding errors.
- `position int` = display order among siblings (drag-to-reorder in admin).
- **RLS is on for every table.** Column notes like 🔒 mean students can never read that data.

---

## 0. Enums

| Enum | Values |
|---|---|
| `user_role` | `student`, `faculty`, `admin` |
| `content_status` | `draft`, `published`, `archived` |
| `difficulty` | `easy`, `medium`, `hard` |
| `question_type` | `mcq` (single correct), `msq` (multiple correct), `nat` (numerical range), `tita` (CAT type-in) |
| `video_status` | `none`, `uploading`, `ready`, `failed` |
| `product_type` | `course`, `test_series` |
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
| is_free_preview | bool | watchable without buying |
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

One `product` = one thing a student can buy: a course **or** a test series.
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
| price_paise | int | 0 = free |
| sale_price_paise | int null | optional discounted price |
| validity_days | int null | null = lifetime access |
| is_active | bool | |
| | | CHECK: exactly one of course_id / test_series_id matches `type` |

### `orders`
| Column | Type | Notes |
|---|---|---|
| user_id | uuid → profiles | |
| product_id | uuid → products | |
| amount_paise | int | price charged at the time of purchase (not looked up live) |
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
`has_test_access(user, test)`. The second checks the test is free, in a purchased series, or in a
purchased course.

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
| is_free | bool | free tests need no purchase |
| max_attempts | int null | null = unlimited |
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
| is_timed | bool | |
| time_limit_seconds | int null | |
| started_at, ended_at | timestamptz | |
| question_count, correct_count | int | |

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
| `test_leaderboard` | ranks/percentiles per test (first attempts) |
| `question_stats` | attempts, % correct, avg time per question (flags too-easy or too-hard questions) |
| `admin_daily_activity` | daily active users, signups, enrollments, revenue, watch-minutes |

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
     profiles ── lecture_progress · practice_sessions/answers · test_attempts/responses · bookmarks
```

**Total: 30 tables + 5 views.**
