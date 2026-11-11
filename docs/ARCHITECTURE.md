# V4 — Architecture (DRAFT for review)

> Status: proposal. Nothing here is built yet. Items marked **[DECIDE]** need your call.

V4 is an exam-prep platform for **GATE (CS/IT)** and **CAT**: students learn (video courses),
practice (topic-wise questions) and test (full-length mocks). Admins and faculty manage all content
and can see how it's being used.

---

## 1. Tech stack (recommended)

| Layer | Choice | Why |
|---|---|---|
| Web app | **Next.js 15 (App Router) + TypeScript** | One codebase for the public site, the student app and the admin panel. Server components keep secrets and answer keys on the server. |
| UI | **Tailwind CSS + shadcn/ui**, **KaTeX** for math | Fast, consistent UI. GATE/CAT questions need formulas. |
| Database / Auth / Files | **Supabase** (Postgres 17, Auth, Storage, Row-Level Security), region **ap-south-1 (Mumbai)** | You already use Supabase. Low latency for Indian students. RLS enforces access control inside the DB itself. |
| Video **[DECIDE]** | **Bunny Stream** (recommended), or Cloudflare Stream / Mux; Supabase Storage as an MVP fallback | Real video hosting handles transcoding to HLS, adaptive quality, resumable uploads and signed playback URLs. Plain file storage does none of that. |
| Payments | `PaymentProvider` interface: **DemoProvider** now, **Razorpay** later | Turning on real payments later only means writing one new class, not touching business logic. |
| Hosting | **Vercel** (app) + Supabase (backend) | No servers to run. Preview deploys for every PR. |
| Validation | **Zod** shared by forms and server actions | One schema validates both the browser and the server. |
| Testing | Vitest (scoring/logic), Playwright (end-to-end flows) | The scoring engine must be provably correct. |

```
 Browser (student / admin)
      │  HTTPS
      ▼
 Next.js on Vercel ── Server Components / Server Actions / Route Handlers
      │                     │                         │
      │ supabase-js (RLS)   │ service role (admin)    │ signed upload/playback
      ▼                     ▼                         ▼
 Supabase Postgres ◄── Supabase Auth          Video host (Bunny/CF/Mux)
      ▲                                               │ webhook: "video ready"
      └───────────────────────────────────────────────┘
 Payment provider (Demo → Razorpay) ── webhook ──► /api/payments/webhook
```

---

## 2. Roles & permissions

| Capability | Student | Faculty | Admin |
|---|:-:|:-:|:-:|
| Browse catalog, buy, learn, practice, test | ✅ | ✅ | ✅ |
| Create/edit curriculum, upload videos, write questions, build tests | – | ✅ | ✅ |
| Publish courses, set prices | – | **[DECIDE]** | ✅ |
| Manage users, change roles | – | – | ✅ |
| Analytics | – | own content | all |

A role is stored in `profiles.role`. It goes into the JWT through a Supabase custom-claims hook,
so both RLS policies and Next.js middleware can check it cheaply.

---

## 3. Domain model

### 3.1 Content hierarchy (fixed depth, as you described)

```
exam (GATE | CAT)
 └─ course            e.g. "Algorithms for GATE CS"   (price, status, thumbnail)
     └─ subject       e.g. "Algorithms"
         └─ module    e.g. "Graph Algorithms"
             └─ chapter   e.g. "Shortest Paths"
                 └─ lecture   video + notes PDF, duration, is_free_preview
```

Each level gets its own table with `position` ordering. Fixed depth is simpler and faster than a
generic tree, and it matches what admins see.

**Topics (for questions) are separate from the course tree.** Questions are tagged against a
**syllabus taxonomy** (`exam → section → topic → subtopic`, following the official GATE CS/IT
and CAT syllabus). That way one question can appear in practice, in several mocks and next to
several courses' chapters without being copied. Chapters can link to topics, which powers
"practice this chapter".

### 3.2 Question bank — modeled on the real exam formats

| Type | Exam | Answer | Marking |
|---|---|---|---|
| `MCQ` single correct | GATE, CAT | one option | GATE: −⅓ (1-mark) / −⅔ (2-mark); CAT: +3 / −1 |
| `MSQ` multiple correct | GATE | set of options; credit only for an exact match | no negative marks |
| `NAT` numerical | GATE | number within a `[min, max]` range | no negative marks |
| `TITA` type-in-the-answer | CAT | exact number/string | no negative marks |

Fields: stem (Markdown + KaTeX + images), options, difficulty (`easy|medium|hard`), marks,
topic(s), explanation/solution, **`is_pyq` + `pyq_year` + `pyq_paper`** (e.g. GATE CS 2024 Set 1),
status (`draft|review|published`), author.

**Answer keys live in a separate table (`question_keys`) that students can't read through RLS.**
Scoring happens on the server, so answers can't leak through the browser's network tab.

CAT passages/sets (RC, DILR) are a `question_group` with shared context, and its child questions
point to it.

### 3.3 Tests

- `test`: exam, type (`full_mock | sectional | topic_test | pyq_paper`), duration, instructions,
  marking scheme, linked course(s) or standalone, free/paid.
- `test_section`: e.g. CAT VARC / DILR / QA, each with its **own timer and locked navigation**;
  GATE General Aptitude + CS, one shared timer.
- `test_question`: ordered list of questions per section, with optional per-test marks override.

### 3.4 Commerce

`course.price_inr`, optional `sale_price_inr`, `validity_days`.
`order` (pending → paid | failed | refunded) → creates an `enrollment` (user, course, expires_at).
**Catalog numbers are computed from the DB** (lecture count, total hours, question count) through a
view, so nothing shown to students is made up.

### 3.5 Learning activity

- `lecture_progress` (user, lecture, `last_position_s`, `watched_s`, `completed_at`) → resume +
  % complete.
- `practice_attempt` (user, question, response, is_correct, time_taken_s, mode timed/untimed).
- `test_attempt` (user, test, started_at, **server-side deadline**, status, score, per-section scores,
  rank/percentile) + `test_response` (question, response, marked_for_review, time_spent_s).

---

## 4. Key flows

### 4.1 Admin video upload (direct to video host, never through our server)
1. Admin selects a file on the lecture form.
2. A server action creates the video on Bunny/CF and returns a **short-lived signed TUS upload URL**.
3. The browser uploads directly with resumable TUS (survives flaky connections, multi-GB files),
   with a progress bar.
4. The video host sends a webhook when transcoding finishes → `lecture.video_status = ready`,
   `duration_s` filled in automatically.

### 4.2 Watching a lecture
- The server checks enrollment (or `is_free_preview`) → issues a **signed, expiring HLS URL**.
- Distraction-free player (hls.js): speed control, quality, keyboard shortcuts, notes PDF.
- Position saved every ~10 s and on pause/unload → resumes where the student left off.

### 4.3 Practice
Filter by exam → topic → difficulty → PYQ-only / year → timed or untimed. After each answer the
server checks it and returns the correct answer plus the explanation. Wrong answers go to a
"revise" list.

### 4.4 Mock test engine (exam-conditions)
- Starting creates a `test_attempt` with `deadline = now + duration`. **The server clock decides**,
  so refreshing or changing the device clock doesn't buy extra time.
- The UI follows the real exam layout: question palette (not visited / not answered / answered /
  marked for review), on-screen virtual calculator for GATE, section lock for CAT.
- Each answer autosaves (debounced) to `test_response`. Refreshing resumes the attempt.
- Submitting, or hitting the deadline (enforced on the server even if the tab closes, via a
  scheduled sweep with `pg_cron`), → the scoring function runs in Postgres → results.
- **Analysis:** score, accuracy, per-section/per-topic breakdown, time per question, percentile among
  all attempts, and solutions for every question.

### 4.5 Payment (demo now)
Checkout → `order(pending)` → `PaymentProvider.createPayment()` → DemoProvider shows a
"Simulate success/failure" screen → webhook-style handler confirms → `enrollment` created.
Razorpay later: same flow, real checkout plus signature-verified webhook.

---

## 5. App structure (routes)

```
/                         landing: choose GATE or CAT
/gate, /cat               exam hub: courses, mocks, PYQs
/courses/[slug]           course detail (curriculum, real counts, price, preview lectures)
/checkout/[courseId]
/login, /signup           Supabase Auth (email OTP / Google) [DECIDE]

/app                      student dashboard (progress, continue watching, upcoming tests)
/app/learn/[courseSlug]/[lectureId]
/app/practice             practice setup + session
/app/tests                available tests
/app/tests/[attemptId]    exam-mode UI (full screen, minimal chrome)
/app/tests/[attemptId]/result

/admin                    analytics overview
/admin/courses            list → /admin/courses/[id] (curriculum tree editor, drag-to-reorder)
/admin/questions          bank: search/filter, editor with live KaTeX preview, bulk CSV import
/admin/tests              test builder (pick questions by filter, sections, marking)
/admin/users              search, view activity, change role
/admin/orders
```

Code layout:

```
src/app/(public) (student) (admin)   route groups with their own layouts + guards
src/features/<domain>/               courses, video, questions, tests, practice, payments, analytics
    ├─ queries.ts   server-only reads
    ├─ actions.ts   server actions (Zod-validated, role-checked)
    └─ components/
src/lib/supabase/  src/lib/payments/  src/lib/video/   provider adapters
supabase/migrations/                  SQL schema + RLS policies + functions (version-controlled)
supabase/seed.sql                     GATE/CAT syllabus taxonomy + demo data
```

---

## 6. Security

- **RLS on every table.** Students only see published content, their own progress and attempts.
  Staff see what their role allows.
- Answer keys are never sent to the browser before a question is scored or a test is submitted.
- Video playback URLs are signed and expire, and are only issued to enrolled users.
- Every admin mutation re-checks the role on the server. The service-role key exists only on the
  server.
- `audit_log` for role changes, price changes, publish/unpublish and refunds.
- Rate limiting on auth and answer-submission endpoints.

## 7. Analytics (admin)

Built from data we already store (no third-party tracking needed at first):
signups/DAU/WAU, enrollments and revenue per course, lecture watch-time and drop-off points,
practice volume and accuracy per topic, **question quality** (questions nearly everyone gets
right or wrong → flag for review), test attempt counts and score distributions.
Implemented as SQL views / materialized views refreshed by `pg_cron`.

---

## 8. Build plan (milestones)

| # | Milestone | Result you can try |
|---|---|---|
| M0 | Scaffold: Next.js, Supabase project, auth, roles, CI, deploy | Sign up, log in, admin can promote users |
| M1 | Catalog + curriculum editor | Admin builds a course tree. Students browse with real counts |
| M2 | Video upload + player + resume | Admin uploads, student watches and resumes |
| M3 | Demo checkout + enrollment gating | Buy → access unlocks |
| M4 | Question bank + practice | Admin authors MCQ/MSQ/NAT/TITA + PYQs. Students practice |
| M5 | Test builder + exam engine + results/analysis | Full GATE and CAT mocks |
| M6 | Student dashboard + admin analytics | Progress and usage views |
| M7 | Hardening: Razorpay, Playwright E2E, perf, a11y | Production-ready |

---

## 9. Open decisions

1. **Existing `whitemirrortechnologies/v4` repo**: port its code (e.g. the video uploader) or
   start fresh here?
2. **Video host**: Bunny Stream / Cloudflare Stream / Mux / Supabase Storage.
3. **Supabase project**: new dedicated project (recommended) vs. reusing an existing one.
4. **Login methods**: email+password, email OTP, Google, phone OTP?
5. **Faculty powers**: can faculty publish and set prices, or only author drafts for admin approval?
6. **Test access**: tests bundled inside courses, sold separately as "test series", or both?
