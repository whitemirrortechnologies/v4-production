import Link from "next/link";
import clsx from "clsx";
import { notFound, redirect } from "next/navigation";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/site-header";
import { Rich } from "@/components/rich";
import { btn, Eyebrow } from "@/components/ui";
import { IconCheck, IconX } from "@/components/icons";
import { duration } from "@/lib/format";

export const metadata = { title: "Test result" };

type RQ = {
  test_question_id: string; question_id: string; section_id: string; type: string; stem: string; difficulty: string; topic: string;
  group: { title: string; content: string } | null; options: { id: string; label: string; content: string }[] | null;
  response: { state: string; selected_option_ids: string[] | null; numeric_answer: number | null; text_answer: string | null; time_spent_seconds: number } | null;
  is_correct: boolean | null; marks_awarded: number | null; key: { correct_option_ids: string[] | null; nat_min: number | null; nat_max: number | null; tita_answer: string | null };
  explanation: string | null;
};
type R = {
  attempt_id: string; test_id: string; test_title: string; attempt_no: number; status: string; time_taken_seconds: number;
  score: number; max_score: number; correct: number; wrong: number; unanswered: number; accuracy_percent: number | null; rank: number; total_candidates: number; percentile: number | null;
  sections: { id: string; name: string; score?: number; max_score?: number; correct?: number; wrong?: number; unanswered?: number; time_seconds?: number }[];
  topics: { topic_id: string; topic: string; questions: number; correct: number; wrong: number; score: number }[];
  questions: RQ[];
};

export default async function ResultPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ show?: string }> }) {
  const { id } = await params;
  await requireViewer(`/app/tests/result/${id}`);
  const { show = "all" } = await searchParams;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_attempt_result", { p_attempt: id });
  if (error) { if (/after the test is submitted/i.test(error.message)) redirect(`/app/tests/attempt/${id}`); notFound(); }
  const r = data as R;
  const pct = r.max_score ? Math.max(0, (Number(r.score) / Number(r.max_score)) * 100) : 0;
  const weak = [...r.topics].filter((t) => t.questions >= 1).sort((a, b) => a.correct / a.questions - b.correct / b.questions).slice(0, 3);
  const list = r.questions.filter((q) => show === "all" || (show === "wrong" && q.is_correct === false) || (show === "correct" && q.is_correct) || (show === "skipped" && q.is_correct == null));
  const yours = (q: RQ) => q.type === "nat" ? q.response?.numeric_answer : q.type === "tita" ? q.response?.text_answer : null;

  return (
    <>
      <SiteHeader />
      <main id="main">
        <section className="on-night relative overflow-hidden bg-night text-white">
          <div className="grid-bg glow-top absolute inset-0" aria-hidden />
          <div className="relative mx-auto max-w-[90rem] px-4 py-12 sm:px-10 lg:py-16">
            <Eyebrow dark>{r.status === "expired" ? "Auto-submitted when time ran out" : "Result"} · attempt {r.attempt_no}</Eyebrow>
            <h1 className="h2 mt-3">{r.test_title}</h1>
            <div className="mt-8 grid gap-8 lg:grid-cols-[auto_1fr] lg:items-end">
              <div>
                <p className="display">{Number(r.score)}<span className="text-night-ink-2">/{Number(r.max_score)}</span></p>
                <div className="mt-4 h-1.5 w-64 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-violet-500" style={{ width: `${pct}%` }} /></div>
              </div>
              <dl className="grid grid-cols-2 gap-x-10 gap-y-5 sm:grid-cols-3 lg:justify-self-end xl:grid-cols-6">
                {[["Rank", r.attempt_no === 1 ? `${r.rank} / ${r.total_candidates}` : "—"], ["Percentile", r.percentile != null ? `${r.percentile}` : "—"], ["Accuracy", r.accuracy_percent != null ? `${r.accuracy_percent}%` : "—"],
                  ["Correct", r.correct], ["Wrong", r.wrong], ["Time", duration(r.time_taken_seconds)]].map(([k, v]) => (
                  <div key={k as string}><dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-night-ink-2">{k}</dt><dd className="mt-1 font-display text-2xl font-bold">{v}</dd></div>
                ))}
              </dl>
            </div>
            {r.attempt_no > 1 && <p className="mt-6 text-xs text-night-ink-2">Rank and percentile are based on everyone&apos;s first attempt, so retakes are compared fairly.</p>}
          </div>
        </section>

        <div className="mx-auto grid max-w-[90rem] gap-6 px-4 py-12 sm:px-10 lg:grid-cols-2">
          <section className="rounded-2xl border border-line p-6">
            <h2 className="font-display text-lg font-bold tracking-tight">By section</h2>
            <div className="mt-4 divide-y divide-line">
              {r.sections.map((s) => (
                <div key={s.id} className="grid grid-cols-[1fr_auto] gap-2 py-3 text-sm">
                  <div><p className="font-semibold">{s.name}</p><p className="text-xs text-ink-3">{s.correct ?? 0} correct · {s.wrong ?? 0} wrong · {s.unanswered ?? 0} skipped · {duration(s.time_seconds)}</p></div>
                  <p className="font-display text-lg font-bold">{Number(s.score ?? 0)}<span className="text-sm font-medium text-ink-3">/{Number(s.max_score ?? 0)}</span></p>
                </div>
              ))}
            </div>
          </section>
          <section className="rounded-2xl border border-line p-6">
            <div className="flex items-baseline justify-between"><h2 className="font-display text-lg font-bold tracking-tight">By topic</h2><span className="text-xs text-ink-3">accuracy</span></div>
            <div className="mt-4 space-y-3">
              {r.topics.map((t) => {
                const a = t.questions ? (t.correct / t.questions) * 100 : 0;
                return (
                  <div key={t.topic_id} className="text-sm">
                    <div className="flex justify-between"><span>{t.topic}</span><span className="tabular-nums text-ink-3">{t.correct}/{t.questions}</span></div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-wash"><div className={clsx("h-full rounded-full", a >= 70 ? "bg-good" : a >= 40 ? "bg-violet-500" : "bg-bad")} style={{ width: `${Math.max(3, a)}%` }} /></div>
                  </div>
                );
              })}
            </div>
            {weak.length > 0 && (
              <div className="mt-6 rounded-xl bg-violet-50 p-4 text-sm">
                <p className="font-semibold text-violet-900">Focus next on: {weak.map((w) => w.topic).join(", ")}</p>
                <Link href="/app/practice" className="mt-2 inline-block font-semibold text-violet-600 hover:underline">Practise these topics →</Link>
              </div>
            )}
          </section>
        </div>

        <section className="mx-auto max-w-[90rem] px-4 pb-20 sm:px-10">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 className="h2">Solutions</h2>
            <nav className="inline-flex rounded-lg border border-line bg-wash p-1 text-sm" aria-label="Filter">
              {[["all", "All"], ["wrong", "Wrong"], ["skipped", "Skipped"], ["correct", "Correct"]].map(([k, l]) => (
                <Link key={k} href={`?show=${k}`} scroll={false} className={clsx("rounded-md px-4 py-1.5 font-semibold", show === k ? "bg-ink text-white" : "text-ink-3 hover:text-ink")}>{l}</Link>
              ))}
            </nav>
          </div>
          <ol className="mt-8 space-y-5">
            {list.map((q) => {
              const n = r.questions.indexOf(q) + 1;
              return (
                <li key={q.test_question_id} className="cv-auto rounded-2xl border border-line p-5 sm:p-7">
                  <div className="mb-4 flex flex-wrap items-center gap-2 text-xs font-semibold">
                    <span className="rounded-full bg-wash px-2.5 py-1">Q{n}</span>
                    <span className={clsx("flex items-center gap-1 rounded-full px-2.5 py-1", q.is_correct ? "bg-good/10 text-good" : q.is_correct === false ? "bg-bad/10 text-bad" : "bg-wash text-ink-3")}>
                      {q.is_correct ? <><IconCheck size={12} />Correct</> : q.is_correct === false ? <><IconX size={12} />Wrong</> : "Skipped"}
                    </span>
                    <span className="rounded-full bg-wash px-2.5 py-1 tabular-nums">{Number(q.marks_awarded ?? 0) > 0 ? "+" : ""}{Number(q.marks_awarded ?? 0)} marks</span>
                    <span className="text-ink-3">{q.topic} · {duration(q.response?.time_spent_seconds)}</span>
                  </div>
                  {q.group && <details className="mb-4 rounded-xl bg-wash p-4 text-sm"><summary className="cursor-pointer font-semibold">{q.group.title}</summary><Rich text={q.group.content} className="mt-2" /></details>}
                  <Rich text={q.stem} className="text-[15px]" />
                  {q.options && (
                    <ul className="mt-4 space-y-2">
                      {q.options.map((o) => {
                        const right = q.key.correct_option_ids?.includes(o.id), picked = q.response?.selected_option_ids?.includes(o.id);
                        return (
                          <li key={o.id} className={clsx("flex gap-3 rounded-xl border px-4 py-3 text-sm", right ? "border-good bg-good/5" : picked ? "border-bad bg-bad/5" : "border-line")}>
                            <span className="font-bold">{o.label}</span><div className="min-w-0 flex-1"><Rich text={o.content} /></div>
                            {picked && <span className="text-xs font-semibold text-ink-3">your answer</span>}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  {!q.options && (
                    <p className="mt-4 text-sm">Your answer: <b>{yours(q) ?? "—"}</b> · Correct: <b className="text-good">{q.type === "nat" ? (q.key.nat_min === q.key.nat_max ? q.key.nat_min : `${q.key.nat_min} to ${q.key.nat_max}`) : q.key.tita_answer}</b></p>
                  )}
                  {q.explanation && <div className="mt-5 rounded-xl bg-wash p-4"><p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-good">Solution</p><Rich text={q.explanation} className="text-[15px]" /></div>}
                </li>
              );
            })}
            {!list.length && <li className="rounded-2xl border border-dashed border-line-strong p-10 text-center text-ink-3">Nothing in this filter.</li>}
          </ol>
          <div className="mt-10 flex gap-3">
            <Link href={`/app/tests/${r.test_id}`} className={btn({ variant: "outline" })}>Back to test</Link>
            <Link href="/app/tests" className={btn({})}>All tests</Link>
          </div>
        </section>
      </main>
    </>
  );
}
