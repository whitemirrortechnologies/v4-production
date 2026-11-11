import Link from "next/link";
import clsx from "clsx";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/site-header";
import { ActionForm, Submit } from "@/components/forms";
import { Eyebrow, Select } from "@/components/ui";
import { getExams } from "@/lib/catalog";
import { startPractice } from "./actions";
import type { Section, Topic } from "@/lib/types";

export const metadata = { title: "Practice" };

const chip = "inline-flex cursor-pointer select-none items-center rounded-full border border-line-strong px-3.5 py-1.5 text-sm transition-colors hover:bg-wash has-[:checked]:border-ink has-[:checked]:bg-ink has-[:checked]:text-white has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-violet-500";

export default async function PracticeHome({ searchParams }: { searchParams: Promise<{ exam?: string }> }) {
  const { user, profile } = await requireViewer("/app/practice");
  const sp = await searchParams;
  const exams = await getExams();
  const exam = exams.find((e) => e.code.toLowerCase() === sp.exam?.toLowerCase()) ?? exams.find((e) => e.id === profile.target_exam_id) ?? exams[0];
  const supabase = await createClient();
  const [{ data: secs }, { data: recent }, { data: access }] = await Promise.all([
    exam ? supabase.from("syllabus_sections").select("*, topics(*)").eq("exam_id", exam.id).order("position") : Promise.resolve({ data: [] }),
    supabase.from("practice_sessions").select("id,started_at,ended_at,question_count,answered_count,correct_count,exam_id").eq("user_id", user.id).order("started_at", { ascending: false }).limit(6),
    exam ? supabase.rpc("has_exam_access", { p_exam: exam.id }) : Promise.resolve({ data: false }),
  ]);
  const sections = (secs ?? []) as (Section & { topics: Topic[] })[];
  const cat = exam?.code.startsWith("CAT");

  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto max-w-[90rem] px-4 py-14 sm:px-10">
        <Eyebrow>Practice{exam ? ` · ${exam.code.split("_")[0]}` : ""}</Eyebrow>
        <h1 className="h1 mt-3">Practise by topic</h1>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink-2">Pick topics and difficulty, and get an explanation after every answer.</p>

        <div className="mt-8 inline-flex rounded-lg border border-line bg-wash p-1">
          {exams.map((e) => <Link key={e.id} href={`?exam=${e.code.toLowerCase()}`} className={clsx("rounded-md px-5 py-1.5 text-sm font-semibold", e.id === exam?.id ? "bg-ink text-white" : "text-ink-3 hover:text-ink")}>{e.code.split("_")[0]}</Link>)}
        </div>

        {access !== true && (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-violet-50 px-5 py-4">
            <p className="text-sm text-violet-900"><span className="font-semibold">Free practice only.</span> Enroll in any {exam?.code.split("_")[0]} course or test series to unlock every question.</p>
            <Link href={`/exams/${exam?.code.toLowerCase()}`} className="text-sm font-semibold text-violet-600 hover:underline">See courses →</Link>
          </div>
        )}

        {exam && (
          <ActionForm action={startPractice} className="mt-8 grid gap-6 lg:grid-cols-[1fr_22rem]">
            <input type="hidden" name="exam_id" value={exam.id} />
            <div className="min-w-0 space-y-3">
              {sections.map((s) => {
                const top = s.topics.filter((t) => !t.parent_id).sort((a, b) => a.position - b.position);
                return (
                  <details key={s.id} className="group rounded-2xl border border-line bg-paper open:shadow-soft">
                    <summary className="flex cursor-pointer items-center gap-4 px-5 py-4">
                      <span className="w-12 shrink-0 font-mono text-xs font-bold text-violet-600">{s.name.split(/\s+/).map((w) => w[0]).join("").slice(0, 4).toUpperCase()}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold">{s.name}</span>
                        <span className="block truncate text-xs text-ink-3">{top.map((t) => t.name).join(" · ")}</span>
                      </span>
                      <span className="hidden text-xs font-semibold text-ink-3 group-open:hidden sm:inline">Choose</span>
                    </summary>
                    <div className="flex flex-wrap gap-2 border-t border-line px-5 py-4">
                      <label className={clsx(chip, "border-dashed font-semibold")}><input type="checkbox" name="sections" value={s.id} className="sr-only" />Whole section</label>
                      {top.map((t) => <label key={t.id} className={chip}><input type="checkbox" name="topics" value={t.id} className="sr-only" />{t.name}</label>)}
                    </div>
                  </details>
                );
              })}
              <p className="px-1 text-xs text-ink-3">Choose nothing to practise across the whole syllabus.</p>
            </div>

            <div className="h-fit space-y-6 rounded-2xl border border-line bg-paper p-5 lg:sticky lg:top-24">
              <fieldset><legend className="mb-2 text-sm font-semibold">Difficulty</legend>
                <div className="flex flex-wrap gap-2">{["easy", "medium", "hard"].map((d) => <label key={d} className={clsx(chip, "capitalize")}><input type="checkbox" name="difficulty" value={d} className="sr-only" />{d}</label>)}</div>
              </fieldset>
              <fieldset><legend className="mb-2 text-sm font-semibold">Question type</legend>
                <div className="flex flex-wrap gap-2">{(cat ? [["mcq", "MCQ"], ["tita", "TITA"]] : [["mcq", "MCQ"], ["msq", "MSQ"], ["nat", "NAT"]]).map(([v, l]) => <label key={v} className={chip}><input type="checkbox" name="type" value={v} className="sr-only" />{l}</label>)}</div>
              </fieldset>
              <label className={chip}><input type="checkbox" name="pyq" className="sr-only" />Past-year questions only</label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block"><span className="mb-1.5 block text-sm font-semibold">Questions</span>
                  <Select name="count" defaultValue="10" className="h-11">{[5, 10, 20, 30].map((n) => <option key={n} value={n}>{n}</option>)}</Select>
                </label>
                <label className="block"><span className="mb-1.5 block text-sm font-semibold">Minutes</span>
                  <Select name="minutes" defaultValue="15" className="h-11">{[5, 10, 15, 20, 30, 45, 60].map((n) => <option key={n} value={n}>{n}</option>)}</Select>
                </label>
              </div>
              <label className="flex items-center gap-2.5 text-sm font-medium"><input type="checkbox" name="timed" className="size-4 accent-violet-600" />Timed (use the minutes above)</label>
              <Submit size="lg" className="w-full">Start practice</Submit>
            </div>
          </ActionForm>
        )}

        {recent && recent.length > 0 && (
          <section className="mt-16">
            <h2 className="h2">Recent sessions</h2>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {recent.map((r) => (
                <Link key={r.id} href={`/app/practice/${r.id}`} className="lift rounded-2xl border border-line p-5">
                  <p className="text-xs text-ink-3">{new Date(r.started_at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</p>
                  <p className="mt-2 font-display text-2xl font-bold">{r.correct_count}<span className="text-base font-medium text-ink-3"> / {r.answered_count} correct</span></p>
                  <p className="mt-1 text-sm text-ink-3">{r.ended_at ? "Completed" : `${r.question_count - r.answered_count} left · continue`}</p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
    </>
  );
}
