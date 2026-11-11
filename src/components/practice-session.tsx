"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import clsx from "clsx";
import { Rich } from "@/components/rich";
import { btn, Input } from "@/components/ui";
import { IconAlert, IconCheck, IconClock, IconSpinner, IconX } from "@/components/icons";
import { toast } from "@/lib/toast";
import { clock } from "@/lib/format";
import { TYPE_LABEL } from "@/lib/marking";
import { answerPractice, endPractice, reportQuestion, toggleBookmark } from "@/app/app/practice/actions";
import type { QuestionType } from "@/lib/types";

type Key = { correct_option_ids: string[] | null; nat_min: number | null; nat_max: number | null; tita_answer: string | null };
export type PQ = {
  question_id: string; type: QuestionType; difficulty: string; stem: string; marks: number; is_pyq: boolean; pyq_year: number | null; pyq_paper: string | null; topic: string;
  group: { title: string; content: string } | null; options: { id: string; label: string; content: string }[] | null; bookmarked: boolean;
  answer: { selected_option_ids: string[] | null; numeric_answer: number | null; text_answer: string | null; is_correct: boolean; key: Key; explanation: string | null } | null;
};
export type PSession = { session_id: string; is_timed: boolean; time_limit_seconds: number | null; started_at: string; ended_at: string | null; server_now: string; questions: PQ[] };

export function PracticeSession({ data }: { data: PSession }) {
  const [qs, setQs] = useState(data.questions);
  const firstOpen = qs.findIndex((q) => !q.answer);
  const [i, setI] = useState(firstOpen === -1 ? 0 : firstOpen);
  const [ended, setEnded] = useState(!!data.ended_at || firstOpen === -1);
  const [sel, setSel] = useState<string[]>([]);
  const [val, setVal] = useState("");
  const [pending, start] = useTransition();
  const [reporting, setReporting] = useState(false);
  const shownAt = useRef(Date.now());

  // Server-anchored countdown.
  const skew = useMemo(() => new Date(data.server_now).getTime() - Date.now(), [data.server_now]);
  const deadline = data.is_timed && data.time_limit_seconds ? new Date(data.started_at).getTime() + data.time_limit_seconds * 1000 : null;
  const [left, setLeft] = useState<number | null>(deadline ? Math.max(0, (deadline - (Date.now() + skew)) / 1000) : null);
  useEffect(() => {
    if (!deadline || ended) return;
    const id = setInterval(() => {
      const l = Math.max(0, (deadline - (Date.now() + skew)) / 1000);
      setLeft(l);
      if (l <= 0) { clearInterval(id); setEnded(true); void endPractice(data.session_id); toast("Time's up!", "info"); }
    }, 1000);
    return () => clearInterval(id);
  }, [deadline, skew, ended, data.session_id]);

  const q = qs[i];
  useEffect(() => { setSel([]); setVal(""); shownAt.current = Date.now(); }, [i]);

  const answered = qs.filter((x) => x.answer).length;
  const correct = qs.filter((x) => x.answer?.is_correct).length;

  function check() {
    const seconds = (Date.now() - shownAt.current) / 1000;
    const payload = q.type === "mcq" || q.type === "msq" ? { options: sel, seconds }
      : q.type === "nat" ? { num: val === "" ? null : Number(val), seconds } : { text: val, seconds };
    start(async () => {
      const r = await answerPractice(data.session_id, q.question_id, payload);
      if ("error" in r) { toast(r.error ?? "Couldn't check that answer", "error"); return; }
      setQs((all) => all.map((x, j) => j === i ? { ...x, answer: { selected_option_ids: sel.length ? sel : null, numeric_answer: q.type === "nat" ? Number(val) : null, text_answer: q.type === "tita" ? val : null, is_correct: r.is_correct, key: r.key, explanation: r.explanation } } : x));
    });
  }
  function next() {
    const n = qs.findIndex((x, j) => j > i && !x.answer);
    const any = n === -1 ? qs.findIndex((x) => !x.answer) : n;
    if (any === -1) { setEnded(true); void endPractice(data.session_id); } else setI(any);
  }
  const canCheck = q && !q.answer && (q.type === "mcq" || q.type === "msq" ? sel.length > 0 : val.trim() !== "");

  if (ended && !reporting) {
    const acc = answered ? Math.round((correct / answered) * 100) : 0;
    return (
      <div className="mx-auto max-w-2xl">
        <div className="on-night relative overflow-hidden rounded-3xl bg-night p-8 text-white sm:p-10">
          <div className="grid-bg glow-top absolute inset-0" aria-hidden />
          <div className="relative">
            <p className="eyebrow eyebrow-night">Session complete</p>
            <p className="display mt-4">{correct}<span className="text-night-ink-2">/{qs.length}</span></p>
            <p className="mt-3 text-night-ink">{acc}% accuracy on {answered} answered question{answered === 1 ? "" : "s"}.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/app/practice" className={btn({ variant: "inverse" })}>Practise again</Link>
              <button onClick={() => { setEnded(false); setI(0); }} className={btn({ variant: "outlineDark" })}>Review answers</button>
            </div>
          </div>
        </div>
      </div>
    );
  }
  if (!q) return null;
  const a = q.answer;
  const isRight = (id: string) => !!a?.key.correct_option_ids?.includes(id);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_17rem]">
      <article className="min-w-0">
        <div className="mb-4 flex flex-wrap items-center gap-2 text-xs font-semibold text-ink-3">
          <span className="rounded-full bg-wash px-2.5 py-1">Q{i + 1} of {qs.length}</span>
          <span className="rounded-full bg-wash px-2.5 py-1">{TYPE_LABEL[q.type]}</span>
          <span className="rounded-full bg-wash px-2.5 py-1 capitalize">{q.difficulty}</span>
          <span className="rounded-full bg-wash px-2.5 py-1">{q.topic}</span>
          {q.is_pyq && <span className="rounded-full bg-violet-50 px-2.5 py-1 text-violet-600">PYQ {q.pyq_year}{q.pyq_paper ? ` · ${q.pyq_paper}` : ""}</span>}
        </div>

        {q.group && (
          <details open className="mb-5 rounded-2xl bg-wash p-5">
            <summary className="cursor-pointer text-sm font-semibold">{q.group.title}</summary>
            <div className="mt-3 max-h-[50vh] overflow-y-auto text-[15px]"><Rich text={q.group.content} /></div>
          </details>
        )}

        <div className="rounded-2xl border border-line bg-paper p-5 sm:p-7">
          <Rich text={q.stem} className="text-[16px]" />

          {(q.type === "mcq" || q.type === "msq") && (
            <ul className="mt-6 space-y-2.5" role={q.type === "mcq" ? "radiogroup" : "group"}>
              {(q.options ?? []).map((o) => {
                const picked = a ? !!a.selected_option_ids?.includes(o.id) : sel.includes(o.id);
                const state = !a ? (picked ? "picked" : "idle") : isRight(o.id) ? "right" : picked ? "wrong" : "idle";
                return (
                  <li key={o.id}>
                    <button type="button" disabled={!!a} role={q.type === "mcq" ? "radio" : "checkbox"} aria-checked={picked}
                      onClick={() => setSel((s) => q.type === "mcq" ? [o.id] : s.includes(o.id) ? s.filter((x) => x !== o.id) : [...s, o.id])}
                      className={clsx("flex w-full items-start gap-3.5 rounded-xl border px-4 py-3.5 text-left transition-colors",
                        state === "idle" && "border-line hover:border-line-strong hover:bg-wash/60",
                        state === "picked" && "border-ink bg-wash",
                        state === "right" && "border-good bg-good/8",
                        state === "wrong" && "border-bad bg-bad/8")}>
                      <span className={clsx("flex size-7 shrink-0 items-center justify-center text-sm font-bold", q.type === "mcq" ? "rounded-full" : "rounded-md",
                        state === "picked" && "bg-ink text-white", state === "right" && "bg-good text-white", state === "wrong" && "bg-bad text-white", state === "idle" && "bg-wash text-ink-2")}>
                        {state === "right" ? <IconCheck size={14} /> : state === "wrong" ? <IconX size={14} /> : o.label}
                      </span>
                      <div className="min-w-0 flex-1 pt-0.5 text-[15px]"><Rich text={o.content} /></div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {(q.type === "nat" || q.type === "tita") && (
            <div className="mt-6 max-w-xs">
              <Input inputMode={q.type === "nat" ? "decimal" : "text"} type={q.type === "nat" ? "number" : "text"} step="any" aria-label="Your answer"
                value={a ? String(q.type === "nat" ? a.numeric_answer ?? "" : a.text_answer ?? "") : val} disabled={!!a}
                onChange={(e) => setVal(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && canCheck) check(); }}
                placeholder={q.type === "nat" ? "Enter a number" : "Type your answer"}
                className={clsx(a && (a.is_correct ? "border-good" : "border-bad"))} />
              {a && !a.is_correct && <p className="mt-2 text-sm text-ink-2">Correct answer: <span className="font-semibold">{q.type === "nat" ? (a.key.nat_min === a.key.nat_max ? a.key.nat_min : `${a.key.nat_min} to ${a.key.nat_max}`) : a.key.tita_answer}</span></p>}
            </div>
          )}

          {a && (
            <div className={clsx("rise mt-6 rounded-xl p-4", a.is_correct ? "bg-good/10" : "bg-bad/10")}>
              <p className={clsx("flex items-center gap-2 font-semibold", a.is_correct ? "text-good" : "text-bad")}>
                {a.is_correct ? <><IconCheck size={16} />Correct</> : <><IconX size={16} />Not quite</>}
              </p>
              {a.explanation && <Rich text={a.explanation} className="mt-3 text-[15px] text-ink" />}
            </div>
          )}

          <div className="mt-7 flex flex-wrap items-center gap-2 border-t border-line pt-5">
            {!a ? (
              <button type="button" onClick={check} disabled={!canCheck || pending} className={btn({ size: "lg" })}>{pending && <IconSpinner size={14} />}Check answer</button>
            ) : (
              <button type="button" onClick={next} className={btn({ size: "lg" })}>{answered === qs.length ? "See results" : "Next question →"}</button>
            )}
            <button type="button" onClick={() => start(async () => {
              const on = !q.bookmarked; const r = await toggleBookmark(q.question_id, on);
              if (r?.error) toast(r.error, "error"); else { toast(r?.ok ?? ""); setQs((all) => all.map((x, j) => j === i ? { ...x, bookmarked: on } : x)); }
            })} className={btn({ variant: "ghost" })}>{q.bookmarked ? "★ Saved" : "☆ Save for revision"}</button>
            <button type="button" onClick={() => setReporting(true)} className={clsx(btn({ variant: "ghost" }), "ml-auto text-ink-3")}><IconAlert size={14} />Report</button>
          </div>
        </div>
      </article>

      <aside className="h-fit space-y-4 lg:sticky lg:top-24">
        {left !== null && (
          <div className={clsx("flex items-center gap-3 rounded-2xl p-4", left < 60 ? "bg-bad/10 text-bad" : "bg-night text-white")}>
            <IconClock size={18} /><span className="font-display text-2xl font-bold tabular-nums">{clock(left)}</span><span className="text-xs opacity-70">left</span>
          </div>
        )}
        <div className="rounded-2xl border border-line bg-paper p-4">
          <div className="flex items-baseline justify-between text-sm"><span className="font-semibold">Progress</span><span className="text-ink-3">{correct} correct · {answered}/{qs.length}</span></div>
          <div className="mt-4 grid grid-cols-6 gap-1.5">
            {qs.map((x, j) => (
              <button key={x.question_id} onClick={() => setI(j)} aria-label={`Question ${j + 1}`} aria-current={j === i ? "step" : undefined}
                className={clsx("flex aspect-square items-center justify-center rounded-lg text-xs font-bold transition-colors",
                  x.answer ? (x.answer.is_correct ? "bg-good text-white" : "bg-bad text-white") : "bg-wash text-ink-2 hover:bg-line",
                  j === i && "ring-2 ring-ink ring-offset-2")}>{j + 1}</button>
            ))}
          </div>
          <button onClick={() => { setEnded(true); void endPractice(data.session_id); }} className={clsx(btn({ variant: "outline", size: "sm" }), "mt-4 w-full")}>End session</button>
        </div>
      </aside>

      {reporting && (
        <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/40 p-4 sm:items-center" onClick={() => setReporting(false)}>
          <form className="pop w-full max-w-md space-y-4 rounded-2xl bg-paper p-6 shadow-lift" onClick={(e) => e.stopPropagation()}
            action={(fd) => start(async () => { const r = await reportQuestion(fd); toast(r?.error ?? r?.ok ?? "", r?.error ? "error" : "success"); if (!r?.error) setReporting(false); })}>
            <p className="font-display text-lg font-bold tracking-tight">Report a problem</p>
            <input type="hidden" name="question_id" value={q.question_id} /><input type="hidden" name="practice_session_id" value={data.session_id} />
            <select name="reason" required className="h-11 w-full rounded-xl border border-line-strong px-3 text-[15px]" defaultValue="wrong_answer">
              <option value="wrong_answer">The answer key is wrong</option><option value="wrong_question">The question is wrong</option>
              <option value="typo">Typo or formatting</option><option value="unclear_solution">Solution is unclear</option><option value="other">Something else</option>
            </select>
            <textarea name="message" rows={3} placeholder="Tell us more (optional)" className="w-full rounded-xl border border-line-strong px-3 py-2.5 text-[15px] focus:border-violet-500 focus:outline-none" />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setReporting(false)} className={btn({ variant: "outline", size: "sm" })}>Cancel</button>
              <button type="submit" disabled={pending} className={btn({ size: "sm" })}>Send report</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
