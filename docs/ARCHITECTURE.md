# V4 — Architecture (DRAFT for review)

> Status: proposal, round 3. Decided: start fresh · Next.js + Supabase (Free plan, **separate
> Supabase account** from the one connected here) · **Cloudflare R2 for video files** · tests sold
> both inside courses and as test series · **login UI built last**.
> R2 setup guide: [docs/setup/cloudflare-r2.md](setup/cloudflare-r2.md).

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
| Video | **Cloudflare R2** via a `VideoStorage` adapter (Bunny Stream etc. can be added later) | Supabase Free can't hold real course video (see §1.1). The adapter lets us swap where files live without touching the rest of the app. |
| Payments | `PaymentProvider` interface: **DemoProvider** now, **Razorpay** later | Turning on real payments later only means writing one new class, not touching business logic. |
| Hosting | **Vercel** for development and previews. For the paid launch, Vercel Pro or Cloudflare (Workers via OpenNext) | Vercel's free Hobby plan doesn't allow commercial use, and selling courses is commercial. |
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

### 1.1 Budget constraint: Supabase Free plan

Limits as of Nov 2026 (from Supabase docs):

| Resource | Free limit | What it means for V4 |
|---|---|---|
| Database | 500 MB | Plenty. ~100k questions plus all progress data fit easily. |
| Monthly active users | 50,000 | Plenty. |
| File storage | **1 GB total** | ≈ 3–6 hours of compressed lecture video. **Not enough for courses.** |
| Max file size | **50 MB per file** | ≈ 15–20 min of 720p video per lecture, unless split. |
| Bandwidth | **5 GB uncached + 5 GB cached / month**, shared by DB, auth and storage | ≈ 30–60 student-hours of video watching **per month for everyone combined**. |
| Inactivity | Projects pause after ~1 week with no activity. No backups. | Fine during development. Needs a plan before launch. |
| Projects | 2 free projects per org (you're using 1: Amritacanteen) | N/A: V4 uses a separate Supabase account. |

**Conclusion:** Supabase Free handles everything except video. For video:

| Option | Cost | Storage / bandwidth | Trade-off |
|---|---|---|---|
| A. Supabase Storage only | ₹0 | 1 GB / ~10 GB per month | Only good for a demo with a few short clips. |
| **B. Cloudflare R2 + Supabase (recommended)** | **₹0** within 10 GB storage; **egress is always free** | 10 GB storage (~20 h at 720p, more at lower bitrates), unlimited bandwidth | Needs a free Cloudflare account (card on file). No automatic transcoding, so we serve web-optimised MP4 with seeking (fine for lectures). |
| C. YouTube unlisted, uploaded from the admin panel | ₹0 | Unlimited | YouTube branding/player, unlisted links can be shared, API upload quota (~6 uploads/day). |
| D. Bunny Stream | ~$1/month minimum + ~$0.01/GB | Unlimited, with HLS transcoding | Best experience, not free. |

The code goes through one `VideoStorage` interface (`createUpload`, `getPlaybackUrl`, `delete`),
so the app starts on A or B and can move to D later by adding an adapter and migrating files.
The upload flow (§4.1) is the same for each: signed URL → direct browser upload with progress.

### 1.2 Where data lives: one database + one file store

V4 has **one database** (Supabase Postgres) and **one bucket for big files** (Cloudflare R2).
R2 isn't a second database. It only holds the video bytes:

```
Supabase Postgres  (source of truth)            Cloudflare R2  (bucket: v4-videos, private)
lecture: id, title, duration_s, size_bytes,  ─► lectures/<lecture_id>/<upload_id>.mp4
         video_key, video_status, ...
Supabase Storage (small public/private files): thumbnails, notes PDFs, question images
```

- Every check (is this user enrolled? is the video ready?) runs against Postgres. R2 never decides
  who gets access. It only serves a file when the server hands out a presigned URL that expires.
- **Scaling:** Postgres scales by upgrading the Supabase plan (or moving to any other Postgres,
  since it's standard SQL migrations). R2 has no egress fees and no practical size cap, and past the
  10 GB free tier it costs about $0.015/GB-month. Moving to a streaming host later means copying
  files and changing one adapter, with no changes to the app.

### 1.3 Login comes last: how we build without it

The final login screens and methods are built in the last milestone. Until then:
- The schema still uses Supabase Auth users (`auth.users` → `profiles`), so nothing changes later.
- Seed creates demo accounts (`admin@`, `faculty@`, `student@`), and a **dev-only "act as" switcher**
  signs in as them in one click. It's switched on only when `NEXT_PUBLIC_DEV_LOGIN=true` and is
  refused at build time in production.
- RLS policies and role checks are real from day one, so security isn't bolted on at the end.

---

## 2. Roles & permissions

| Capability | Student | Faculty | Admin |
|---|:-:|:-:|:-:|
| Browse catalog, buy, learn, practice, test | ✅ | ✅ | ✅ |
| Create/edit curriculum, upload videos, write questions, build tests | – | ✅ | ✅ |
| Publish content | – | ✅ | ✅ |
| Set prices, coupons, bundles; manage orders & enrollments | – | – | ✅ |
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

### 4.1 Admin video upload (direct to storage, never through our server)
1. Admin selects a file on the lecture form. The browser reads its duration and checks size/type.
2. A server action checks the admin's role and returns a **short-lived signed upload URL** from the
   active `VideoStorage` adapter (Supabase: signed upload URL; R2: presigned multipart upload).
3. The browser uploads directly with a progress bar. Large files go in chunks that can resume.
4. When the upload finishes, the lecture is marked `video_status = ready` with its duration and size.
   An admin storage meter shows usage against the free-tier quota.

Encoding guidance shown in the admin UI: MP4 (H.264/AAC), 720p, ~1 Mbps, "fast start", which
gives roughly 450 MB per hour.

### 4.2 Watching a lecture
- The server checks enrollment (or `is_free_preview`) → issues a **signed, expiring URL**
  (MP4 now, HLS once we're on a streaming host).
- Distraction-free player: speed control, keyboard shortcuts, notes PDF, no recommendations or
  clutter.
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
| M0 | Scaffold: Next.js, local Supabase, schema/RLS base, R2 adapter, dev "act as" switcher, CI | App runs, switch between admin/faculty/student |
| M1 | Catalog + curriculum editor | Admin builds a course tree. Students browse with real counts |
| M2 | Video upload + player + resume | Admin uploads, student watches and resumes |
| M3 | Demo checkout + enrollment gating | Buy → access unlocks |
| M4 | Question bank + practice | Admin authors MCQ/MSQ/NAT/TITA + PYQs. Students practice |
| M5 | Test builder + exam engine + results/analysis | Full GATE and CAT mocks |
| M6 | Student dashboard + admin analytics | Progress and usage views |
| M7 | **Real login** (methods TBD), Razorpay, Playwright E2E, perf, a11y | Production-ready |

---

## 9. Open decisions

1. ~~Existing v4 repo~~: **decided**, start fresh.
2. ~~Video storage~~: **decided**, Cloudflare R2.
3. ~~Supabase project~~: **decided**, a project in your separate Supabase account. Development
   uses a local Supabase (Docker), and migrations are applied to your project when it's ready.
4. **Login methods**: deferred to M7.
5. ~~Faculty powers~~: **decided**, full content control including publishing. Prices and users are admin-only.
6. ~~Test access~~: **decided**, both. Courses can bundle tests, and test series are sold on
   their own. (`product` = course | test_series; enrollments point at products.)
