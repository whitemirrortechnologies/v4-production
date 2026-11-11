# V4 — GATE CS/IT & CAT learning platform

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
| Design system (black & white + violet tint, light/dark) | ✅ |
| Sign in / sign up (email + password) | ✅ (final login options come last) |
| Public: home, exam pages, course list, course detail with real counts | ✅ |
| Admin: overview, syllabus manager, courses + curriculum editor, lecture video upload, pricing, users, orders | ✅ |
| Student: dashboard, video player with resume + speed + shortcuts, demo checkout with coupons | ✅ |
| Question bank + practice | next |
| Test builder + exam screen + results | next |
| Analytics, Razorpay | later |
