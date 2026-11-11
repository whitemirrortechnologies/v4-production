# V4 — CAT preparation platform

Next.js 16 (App Router) · TypeScript · Tailwind v4 · Supabase (Postgres, Auth, Storage).

- Design: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) · Database: [docs/DATABASE.md](docs/DATABASE.md)
- SQL + how to run it on Supabase: [supabase/README.md](supabase/README.md)

## Deploy on Vercel

1. Import this repo in Vercel (framework: Next.js; no build settings to change).
2. **Settings → Environment Variables** (Production + Preview):

   | Name | Value | Secret? |
   |---|---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → Project URL | no |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | the `anon` / publishable key | no |
   | `SUPABASE_SERVICE_ROLE_KEY` | the `service_role` key (confirms demo payments) | **yes** |
   | `NEXT_PUBLIC_SITE_NAME` | optional, default `V4` | no |

3. In Supabase → **Authentication → URL Configuration**: set **Site URL** to your Vercel URL and add
   `https://YOUR-APP.vercel.app/**` to Redirect URLs. Turn **off** "Confirm email" while testing.
4. Redeploy.

## Run locally

```bash
cp .env.example .env.local   # fill in the three Supabase values
npm install
npm run dev
```

## What's built

| Area | Status |
|---|---|
| Design system (black/indigo, Plus Jakarta + Inter), skeletons, toasts, error/404 pages | ✅ |
| Accounts: sign up, log in, forgot/reset password, settings, purchases list | ✅ |
| Public: home, exams, courses (search/filters), course detail, legal + contact pages, sitemap | ✅ |
| Admin: overview, syllabus, courses + curriculum, video + notes upload, pricing, users, orders | ✅ |
| Admin: question bank (MCQ/TITA and more, LaTeX, PYQs, RC/DILR passages), tests builder, test series | ✅ |
| Student: dashboard, video player with resume, practice with solutions, exam screen, results | ✅ |
| Demo checkout with coupons | ✅ (Razorpay later) |

**Existing database with GATE data?** Run [supabase/manual/remove-gate.sql](supabase/manual/remove-gate.sql) to hide it, or [supabase/manual/delete-gate.sql](supabase/manual/delete-gate.sql) to delete it permanently.

**Before launch:** see [docs/LAUNCH_TODO.md](docs/LAUNCH_TODO.md).
