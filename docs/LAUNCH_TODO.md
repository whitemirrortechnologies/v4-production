# V4: launch to-do

Two lists: **what only you can do** (accounts, money, legal, content), and **what is still left
for me to build**. Work top to bottom.

---

## 0. Do these two first (speed + removing GATE)

- [ ] **Faster sign-in checks.** Supabase → Project Settings → **JWT Keys** (or "JWT Signing Keys"): if it still
      says "Legacy JWT secret", click **Migrate** to the new asymmetric signing keys. Then the app verifies sessions
      without a network call on every page. New projects already have this.
- [ ] **Hide GATE on your live site.** Easiest: sign in as admin → **Admin → Exams** → click **Hide from students** on GATE
      (takes effect within a minute). To remove its data completely, run `supabase/manual/delete-gate.sql` in the
      Supabase SQL Editor (permanent) or `supabase/manual/remove-gate.sql` (just hides + archives).
      To bring GATE or any other exam back later: **Admin → Exams → Add an exam**.

## A. Your to-do: right now, to test everything that's built

- [ ] **1. Check the Supabase region.** Supabase → Project Settings → General → Region.
      The app now runs in Vercel's **Mumbai (bom1)** region (`vercel.json`). If your Supabase project
      is **not** in Mumbai, tell me which region and I'll match it. A mismatch makes every click slow.
- [ ] **2. pg_cron is on.** Supabase → Database → Extensions → `pg_cron` enabled. Then in SQL Editor:
      `select jobname, schedule from cron.job;` should list `v4-expire-test-attempts`. If it doesn't, run:
      `select cron.schedule('v4-expire-test-attempts', '* * * * *', 'select public.expire_overdue_attempts()');`
- [ ] **3. Vercel environment variables** (Settings → Environment Variables, Production + Preview):
      | Name | Value | Type |
      |---|---|---|
      | `NEXT_PUBLIC_SUPABASE_URL` | already set | Config |
      | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | already set | Config |
      | `SUPABASE_SERVICE_ROLE_KEY` | already set | **Secret** |
      | `NEXT_PUBLIC_SITE_URL` | your Vercel URL, e.g. `https://v4-production.vercel.app` (no trailing slash) | Config |
      | `NEXT_PUBLIC_SUPPORT_EMAIL` | the support address students should write to | Config |
      Then **Redeploy** with "Use existing build cache" unticked.
- [ ] **4. Supabase → Authentication → URL Configuration**
      - Site URL = the same value as `NEXT_PUBLIC_SITE_URL`
      - Redirect URLs: add `https://YOUR-DOMAIN/auth/callback` (and the Vercel preview pattern
        `https://*-whitemirrortechnologies-projects.vercel.app/auth/callback` if you test previews)

      Without this, password-reset and confirmation emails won't log people in.
- [ ] **5. Run through the app once as admin**, in this order:
      Syllabus (check topics) → Courses (create, add curriculum, upload a short MP4 under 50 MB, set a price,
      tick one lecture "Free preview", publish) → Questions (write 5 questions, publish) →
      Tests (create a mock, add those questions, publish, attach to the course).
- [ ] **6. Run through it as a student** in a private window: sign up → watch the free lecture →
      buy the course (demo payment) → practise → take the test → check results → forgot password.
- [ ] **7. Send me** a screenshot plus one line for anything that breaks or feels wrong.

## B. Your to-do: before real students arrive

**Email (required: signups and resets fail without it)**
- [ ] Create a **Resend** account (or SendGrid/Postmark), verify your domain, get SMTP details.
- [ ] Supabase → Authentication → **SMTP Settings** → enable custom SMTP, paste the details, sender e.g. `no-reply@yourdomain`.
- [ ] Supabase → Authentication → **Email Templates**: put your brand name into "Confirm signup" and "Reset password".
- [ ] Turn **"Confirm email" back on** (Authentication → Providers → Email) once email works.
- [ ] Optional: raise the minimum password length there to 8 (tell me, and I'll match the sign-up form).

**Plans and hosting (the free tiers are not enough for real use)**
- [ ] **Supabase Pro** ($25/mo): daily backups, no pausing, 100 GB storage, files up to 500 GB,
      250 GB bandwidth. After upgrading, raise the `lecture-videos` bucket limit (Storage → bucket settings)
      and tell me, so I can lift the 50 MB limit in the uploader.
- [ ] **Vercel Pro** ($20/mo): the free Hobby plan doesn't allow commercial use.
- [ ] **Domain**: buy it, add it in Vercel → Domains, then update `NEXT_PUBLIC_SITE_URL` and the Supabase URLs (steps 3–4).

**Payments**
- [ ] Apply for **Razorpay** (business KYC: PAN, bank account, GST if registered, and the website with
      the policy pages below live). When approved, add `RAZORPAY_KEY_ID` (Config) and
      `RAZORPAY_KEY_SECRET` + `RAZORPAY_WEBHOOK_SECRET` (Secret) in Vercel and tell me. I'll switch
      checkout from demo to real.

**Legal (Razorpay checks these pages)**
- [ ] Fill in every `[bracketed]` item in `/terms`, `/privacy`, `/refund-policy`, `/contact`
      (business name, address, emails, refund rules, grievance officer). Then have a lawyer or CA review them.
      You can send me the details and I'll fill them in.

**Brand and content**
- [ ] Final site name (env `NEXT_PUBLIC_SITE_NAME`), logo (SVG) and favicon if you want something other than the "V4" mark.
- [ ] Real courses, lecture videos (MP4, H.264, 720p, "fast start"), notes PDFs, questions with
      solutions, and at least one free mock per exam.
- [ ] Decide which lecture/test per course is free (admin ticks it).

**Safety and operations**
- [ ] Make a second admin account (so you're never locked out), and keep your own admin password strong.
- [ ] Create a **separate Supabase project for testing** so experiments never touch real students' data
      (I'll wire a "staging" environment to it).
- [ ] Optional: a **Sentry** account for error alerts (send me the DSN).

## C. Still left for me to build

| Item | Notes |
|---|---|
| Razorpay checkout + webhook | needs your keys (B) |
| Coupons admin screen | DB + checkout already support coupons; there's no admin UI to create them yet |
| Bundles admin screen | DB supports bundles; no UI yet |
| Grant access manually (admin) | give a student a course without payment |
| Doubts under lectures (ask + faculty reply) | DB ready, UI not built |
| Question reports queue (admin) | students can already report; admin review screen not built |
| Bookmarked / "revise later" list for students | bookmarks are saved; no list page yet |
| On-screen calculator in the exam screen | |
| Bulk question import (CSV) | |
| Deeper analytics (per course, per question quality) | the `question_stats` view exists |
| Google sign-in | optional; needs a Google Cloud OAuth client |
| Automated end-to-end tests, error monitoring, CSP header | |
| Lift the 50 MB video limit / move video to R2 | after Supabase Pro or R2 decision |
