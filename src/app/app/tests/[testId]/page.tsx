import Link from "next/link";
import { notFound } from "next/navigation";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/site-header";
import { ActionForm, Submit } from "@/components/forms";
import { Rich } from "@/components/rich";
import { btn, Eyebrow } from "@/components/ui";
import { IconLock } from "@/components/icons";
import { startTest } from "../actions";

export const metadata = { title: "Test instructions" };

export default async function TestIntro({ params }: { params: Promise<{ testId: string }> }) {
  const { testId } = await params;
  const { user } = await requireViewer(`/app/tests/${testId}`);
  const supabase = await createClient();
  const { data: t } = await supabase.from("tests").select("*, exam:exams(code,name), test_sections(id,name,position,duration_minutes)").eq("id", testId).eq("status", "published").maybeSingle();
  if (!t) notFound();
  const [{ data: access }, { data: attempts }, { data: links }] = await Promise.all([
    supabase.rpc("has_test_access", { p_test: testId }),
    supabase.from("test_attempts").select("id,status,score,max_score,attempt_no,submitted_at").eq("user_id", user.id).eq("test_id", testId).order("attempt_no", { ascending: false }),
    supabase.from("course_tests").select("course:courses(slug,title)").eq("test_id", testId),
  ]);
  const exam = (Array.isArray(t.exam) ? t.exam[0] : t.exam) as { code: string; name: string };
  const cat = exam.code.startsWith("CAT");
  const secs = ((t.test_sections ?? []) as { id: string; name: string; position: number; duration_minutes: number | null }[]).sort((a, b) => a.position - b.position);
  const timed = secs.length > 0 && secs.every((s) => s.duration_minutes);
  const used = attempts?.length ?? 0;
  const left = t.max_attempts ? t.max_attempts - used : null;
  const now = Date.now();
  const notOpen = t.available_from && new Date(t.available_from).getTime() > now;
  const closed = t.available_until && new Date(t.available_until).getTime() < now;
  const open = attempts?.find((a) => a.status === "in_progress");

  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto max-w-4xl px-4 py-14 sm:px-8">
        <Link href="/app/tests" className="tap text-sm text-ink-3 hover:text-ink">← Tests</Link>
        <div className="mt-5"><Eyebrow>{exam.name}</Eyebrow></div>
        <h1 className="h1 mt-3">{t.title}</h1>

        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          {[["Duration", timed ? `${secs.reduce((n, s) => n + (s.duration_minutes ?? 0), 0)} min` : `${t.duration_minutes} min`], ["Sections", String(secs.length)], ["Attempts", left == null ? `${used} · unlimited` : `${used} of ${t.max_attempts}`]].map(([k, v]) => (
            <div key={k} className="rounded-2xl bg-wash p-5"><p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-3">{k}</p><p className="mt-1 font-display text-2xl font-bold">{v}</p></div>
          ))}
        </div>

        <section className="mt-8 rounded-2xl border border-line p-6">
          <h2 className="font-display text-lg font-bold tracking-tight">Before you begin</h2>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-[15px] leading-relaxed text-ink-2">
            {timed ? <li>Each section has its own timer ({secs.map((s) => `${s.name} ${s.duration_minutes} min`).join(", ")}). You can&apos;t go back to a section once it ends.</li>
              : <li>One timer for the whole test. You can move freely between sections.</li>}
            <li>The timer runs on our server. Refreshing or closing the tab won&apos;t pause it, and the test submits itself when time is up.</li>
            {cat ? <li>MCQ: +3 for correct, −1 for wrong. TITA (type in the answer): +3, no negative marks.</li>
              : <li>MCQ: 1-mark questions lose 1/3, 2-mark questions lose 2/3 for a wrong answer. MSQ and NAT have no negative marks; MSQ needs every correct option.</li>}
            <li>Use <b>Mark for review</b> to come back later. Answers marked for review are still evaluated.</li>
          </ul>
          {t.instructions && <Rich text={t.instructions} className="mt-5 border-t border-line pt-5 text-[15px]" />}
        </section>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          {open ? (
            <Link href={`/app/tests/attempt/${open.id}`} className={btn({ variant: "violet", size: "lg" })}>Resume your attempt</Link>
          ) : access !== true ? (
            <div className="w-full rounded-2xl bg-night p-6 text-white">
              <p className="flex items-center gap-2 font-semibold"><IconLock size={16} />This test is part of a paid plan</p>
              <p className="mt-1 text-sm text-night-ink">Enroll in a course that includes it to unlock it.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {(links ?? []).map((l) => { const c = (Array.isArray(l.course) ? l.course[0] : l.course) as { slug: string; title: string } | null; return c && <Link key={c.slug} href={`/courses/${c.slug}`} className={btn({ variant: "inverse", size: "sm" })}>{c.title}</Link>; })}
                {!links?.length && <Link href="/courses" className={btn({ variant: "inverse", size: "sm" })}>Browse courses</Link>}
              </div>
            </div>
          ) : notOpen ? <p className="text-ink-3">Opens {new Date(t.available_from!).toLocaleString("en-IN")}</p>
            : closed ? <p className="text-ink-3">This test closed on {new Date(t.available_until!).toLocaleString("en-IN")}.</p>
            : left === 0 ? <p className="text-ink-3">You&apos;ve used all your attempts.</p>
            : (
              <ActionForm action={startTest}>
                <input type="hidden" name="test_id" value={testId} />
                <Submit size="lg" variant="violet">{used ? "Start a new attempt" : "I'm ready, start the test"}</Submit>
              </ActionForm>
            )}
        </div>

        {!!attempts?.filter((a) => a.status !== "in_progress").length && (
          <section className="mt-12">
            <h2 className="font-display text-lg font-bold tracking-tight">Your attempts</h2>
            <ul className="mt-4 divide-y divide-line rounded-2xl border border-line">
              {attempts.filter((a) => a.status !== "in_progress").map((a) => (
                <li key={a.id}><Link href={`/app/tests/result/${a.id}`} className="flex items-center justify-between px-5 py-4 hover:bg-wash/60">
                  <span className="text-sm">Attempt {a.attempt_no} · {a.submitted_at && new Date(a.submitted_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
                  <span className="font-semibold">{Number(a.score)} / {Number(a.max_score)} →</span>
                </Link></li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </>
  );
}
