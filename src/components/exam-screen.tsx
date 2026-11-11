"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { Rich } from "@/components/rich";
import { btn } from "@/components/ui";
import { IconClock, IconLock, IconSpinner, IconX } from "@/components/icons";
import { toast } from "@/lib/toast";
import { clock } from "@/lib/format";
import { finishSection, saveResponse, submitTest } from "@/app/app/tests/actions";
import type { QuestionType } from "@/lib/types";

type State = "not_visited" | "not_answered" | "answered" | "marked_for_review" | "answered_and_marked";
type Resp = { state: State; sel: string[]; num: string; text: string };
export type PaperQ = {
  test_question_id: string; section_id: string; position: number; type: QuestionType; stem: string; marks: number; negative_marks: number;
  group: { id: string; title: string; content: string } | null; options: { id: string; label: string; content: string }[] | null;
  response: { state: State; selected_option_ids: string[] | null; numeric_answer: number | null; text_answer: string | null; time_spent_seconds: number } | null;
};
export type Paper = {
  attempt_id: string; status: string; test: { id: string; title: string }; server_now: string; started_at: string; deadline_at: string;
  current_section_id: string | null; section_deadline_at: string | null;
  sections: { id: string; name: string; position: number; duration_minutes: number | null }[]; questions: PaperQ[];
};

const LEGEND: { s: State; label: string }[] = [
  { s: "answered", label: "Answered" }, { s: "not_answered", label: "Not answered" }, { s: "not_visited", label: "Not visited" },
  { s: "marked_for_review", label: "Marked" }, { s: "answered_and_marked", label: "Answered & marked" },
];
function Chip({ state, children, current, onClick, label }: { state: State; children?: React.ReactNode; current?: boolean; onClick?: () => void; label?: string }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} aria-current={current ? "step" : undefined} disabled={!onClick}
      className={clsx("relative flex aspect-square w-full items-center justify-center text-xs font-bold transition-transform",
        onClick && "hover:scale-105", current && "ring-2 ring-ink ring-offset-2",
        state === "answered" && "rounded-t-xl rounded-b-md bg-good text-white",
        state === "not_answered" && "rounded-b-xl rounded-t-md bg-bad text-white",
        state === "not_visited" && "rounded-md border border-line-strong bg-paper text-ink-2",
        state === "marked_for_review" && "rounded-full bg-violet-600 text-white",
        state === "answered_and_marked" && "rounded-full bg-violet-600 text-white")}>
      {children}
      {state === "answered_and_marked" && <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-paper bg-good" />}
    </button>
  );
}

export function ExamScreen({ paper }: { paper: Paper }) {
  const router = useRouter();
  const qs = paper.questions;
  const timedSections = !!paper.current_section_id;
  const [resp, setResp] = useState<Record<string, Resp>>(() => Object.fromEntries(qs.map((q) => [q.test_question_id, {
    state: q.response?.state ?? "not_visited", sel: q.response?.selected_option_ids ?? [],
    num: q.response?.numeric_answer != null ? String(q.response.numeric_answer) : "", text: q.response?.text_answer ?? "",
  }])));
  const [i, setI] = useState(0);
  const [sectionId, setSectionId] = useState(paper.current_section_id ?? qs[0]?.section_id ?? paper.sections[0]?.id);
  const [confirm, setConfirm] = useState<null | "submit" | "section">(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [busy, start] = useTransition();
  const shownAt = useRef(Date.now());
  const done = useRef(false);

  const skew = useMemo(() => new Date(paper.server_now).getTime() - Date.now(), [paper.server_now]);
  const deadline = new Date(paper.deadline_at).getTime();
  const secDeadline = paper.section_deadline_at ? new Date(paper.section_deadline_at).getTime() : null;
  const [now, setNow] = useState(Date.now() + skew);
  useEffect(() => { const t = setInterval(() => setNow(Date.now() + skew), 1000); return () => clearInterval(t); }, [skew]);
  const left = Math.max(0, (deadline - now) / 1000);
  const secLeft = secDeadline ? Math.max(0, (secDeadline - now) / 1000) : null;

  const inSection = useMemo(() => qs.map((q, k) => ({ q, k })).filter((x) => x.q.section_id === sectionId), [qs, sectionId]);
  const q = qs[i];
  const r = q ? resp[q.test_question_id] : null;
  const hasAnswer = (x: Resp, t: QuestionType) => (t === "mcq" || t === "msq" ? x.sel.length > 0 : t === "nat" ? x.num.trim() !== "" : x.text.trim() !== "");

  const persist = useCallback(async (k: number, next: Resp) => {
    const qq = qs[k];
    const seconds = (Date.now() - shownAt.current) / 1000;
    shownAt.current = Date.now();
    const out = await saveResponse(paper.attempt_id, qq.test_question_id, {
      state: next.state, options: next.sel, num: qq.type === "nat" && next.num !== "" ? Number(next.num) : null,
      text: qq.type === "tita" ? next.text : null, seconds,
    });
    if ("error" in out && out.error) {
      if (/submitted|locked/i.test(out.error)) { done.current = true; router.refresh(); return; }
      toast(`Not saved: ${out.error}`, "error");
    }
  }, [paper.attempt_id, qs, router]);

  // Mark the opened question as visited.
  useEffect(() => {
    if (!q) return;
    shownAt.current = Date.now();
    if (resp[q.test_question_id].state === "not_visited") {
      const next = { ...resp[q.test_question_id], state: "not_answered" as State };
      setResp((all) => ({ ...all, [q.test_question_id]: next }));
      void persist(i, next);
    }
  }, [i]); // eslint-disable-line react-hooks/exhaustive-deps

  function go(k: number, mode: "save" | "mark" | "move") {
    if (!q || !r) return;
    const answered = hasAnswer(r, q.type);
    const marked = mode === "mark" || (mode === "move" && (r.state === "marked_for_review" || r.state === "answered_and_marked"));
    const next: Resp = { ...r, state: marked ? (answered ? "answered_and_marked" : "marked_for_review") : answered ? "answered" : "not_answered" };
    setResp((all) => ({ ...all, [q.test_question_id]: next }));
    void persist(i, next);
    if (k !== i && k >= 0 && k < qs.length) { setI(k); setSectionId(qs[k].section_id); }
    setPaletteOpen(false);
  }
  const nextIndex = () => { const pos = inSection.findIndex((x) => x.k === i); return inSection[pos + 1]?.k ?? (timedSections ? i : qs.findIndex((x, k) => k > i) ) ; };
  function clear() { if (!q) return; setResp((all) => ({ ...all, [q.test_question_id]: { ...all[q.test_question_id], sel: [], num: "", text: "" } })); }

  const doSubmit = useCallback(() => {
    if (done.current) return;
    done.current = true;
    start(async () => {
      if (q && r) await persist(i, { ...r, state: hasAnswer(r, q.type) ? (r.state === "marked_for_review" || r.state === "answered_and_marked" ? "answered_and_marked" : "answered") : r.state === "not_visited" ? "not_answered" : r.state });
      const out = await submitTest(paper.attempt_id);
      if ("error" in out && out.error && !/submitted/i.test(out.error)) { done.current = false; toast(out.error, "error"); return; }
      router.replace(`/app/tests/result/${paper.attempt_id}`);
    });
  }, [q, r, i, persist, paper.attempt_id, router]);

  // Timers: overall → submit; section → reload paper (server moves to the next section).
  useEffect(() => { if (left <= 0 && !done.current) { toast("Time's up. Submitting your test…", "info"); doSubmit(); } }, [left, doSubmit]);
  const reloading = useRef(false);
  useEffect(() => {
    if (secLeft !== null && secLeft <= 0 && !reloading.current && left > 0) {
      reloading.current = true;
      void (async () => { if (q && r) await persist(i, r); toast("Section time is over. Moving on…", "info"); router.refresh(); })();
    }
  }, [secLeft]); // eslint-disable-line react-hooks/exhaustive-deps

  // Don't lose the test by accident.
  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => { if (!done.current) { e.preventDefault(); } };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, []);

  const counts = useMemo(() => {
    const c: Record<State, number> = { answered: 0, not_answered: 0, not_visited: 0, marked_for_review: 0, answered_and_marked: 0 };
    Object.values(resp).forEach((x) => c[x.state]++);
    return c;
  }, [resp]);

  if (!q || !r) return <div className="p-10 text-center">This test has no questions in the current section.</div>;
  const secName = paper.sections.find((s) => s.id === sectionId)?.name;
  const isLastSection = timedSections && paper.sections[paper.sections.length - 1]?.id === paper.current_section_id;
  const posInSection = inSection.findIndex((x) => x.k === i);

  const palette = (
    <div className="flex h-full flex-col">
      <div className="grid grid-cols-2 gap-x-3 gap-y-2 border-b border-line p-4 text-[11px] text-ink-2">
        {LEGEND.map((l) => <span key={l.s} className="flex items-center gap-2"><span className="w-6"><Chip state={l.s}>{counts[l.s]}</Chip></span>{l.label}</span>)}
      </div>
      <div className="scroll-y flex-1 p-4">
        {paper.sections.filter((s) => !timedSections || s.id === paper.current_section_id).map((s) => (
          <div key={s.id} className="mb-5">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-ink-3">{s.name}</p>
            <div className="grid grid-cols-6 gap-2">
              {qs.map((x, k) => ({ x, k })).filter(({ x }) => x.section_id === s.id).map(({ x, k }, n) => (
                <Chip key={x.test_question_id} state={resp[x.test_question_id].state} current={k === i} onClick={() => go(k, "move")} label={`Question ${n + 1}`}>{n + 1}</Chip>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="border-t border-line p-4">
        {timedSections && !isLastSection
          ? <button onClick={() => setConfirm("section")} className={clsx(btn({ variant: "outline" }), "w-full")}>Finish section</button>
          : <button onClick={() => setConfirm("submit")} className={clsx(btn({}), "w-full")}>Submit test</button>}
      </div>
    </div>
  );

  return (
    <div className="flex h-dvh flex-col bg-paper">
      {/* Top bar */}
      <header className="flex h-14 shrink-0 items-center gap-3 bg-night px-3 text-white sm:px-5">
        <p className="min-w-0 flex-1 truncate text-sm font-semibold">{paper.test.title}</p>
        {secLeft !== null && <span className={clsx("hidden items-center gap-1.5 rounded-lg px-2.5 py-1 text-sm tabular-nums sm:flex", secLeft < 300 ? "bg-bad" : "bg-white/10")}>{secName} {clock(secLeft)}</span>}
        <span className={clsx("flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-display text-base font-bold tabular-nums", left < 300 ? "bg-bad" : "bg-white/10")} role="timer" aria-live="off"><IconClock size={15} />{clock(secLeft ?? left)}</span>
        <button onClick={() => setPaletteOpen(true)} className="rounded-lg bg-white/10 px-3 py-1.5 text-sm font-semibold lg:hidden">Questions</button>
      </header>
      {/* Section tabs */}
      <nav className="hide-scrollbar flex shrink-0 gap-1 overflow-x-auto border-b border-line px-3 sm:px-5" aria-label="Sections">
        {paper.sections.map((s) => {
          const locked = timedSections && s.id !== paper.current_section_id;
          const first = qs.findIndex((x) => x.section_id === s.id);
          return (
            <button key={s.id} disabled={locked || first < 0} onClick={() => first >= 0 && go(first, "move")}
              className={clsx("-mb-px flex items-center gap-1.5 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold", s.id === sectionId ? "border-violet-500 text-ink" : "border-transparent text-ink-3", locked && "opacity-50")}>
              {locked && <IconLock size={12} />}{s.name}
            </button>
          );
        })}
      </nav>

      <div className="flex min-h-0 flex-1">
        <main className="flex min-w-0 flex-1 flex-col">
          <div className={clsx("min-h-0 flex-1", q.group ? "grid lg:grid-cols-2" : "")}>
            {q.group && (
              <section className="scroll-y border-b border-line bg-wash/60 p-5 lg:border-b-0 lg:border-r sm:p-7">
                <p className="mb-3 text-sm font-semibold">{q.group.title}</p><Rich text={q.group.content} className="text-[15px]" />
              </section>
            )}
            <section className="scroll-y h-full p-5 sm:p-8">
              <div className="mx-auto max-w-3xl">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-sm">
                  <p className="font-semibold">Question {posInSection + 1}<span className="font-normal text-ink-3"> of {inSection.length}</span></p>
                  <p className="text-xs text-ink-3">{q.type.toUpperCase()} · <span className="text-good">+{q.marks}</span>{Number(q.negative_marks) > 0 && <> · <span className="text-bad">−{q.negative_marks}</span></>}</p>
                </div>
                <Rich text={q.stem} className="text-[16px]" />
                {(q.type === "mcq" || q.type === "msq") && (
                  <ul className="mt-6 space-y-2.5">
                    {(q.options ?? []).map((o) => {
                      const on = r.sel.includes(o.id);
                      return (
                        <li key={o.id}>
                          <button type="button" role={q.type === "mcq" ? "radio" : "checkbox"} aria-checked={on}
                            onClick={() => setResp((all) => ({ ...all, [q.test_question_id]: { ...r, sel: q.type === "mcq" ? [o.id] : on ? r.sel.filter((x) => x !== o.id) : [...r.sel, o.id] } }))}
                            className={clsx("flex w-full items-start gap-3.5 rounded-xl border px-4 py-3.5 text-left transition-colors", on ? "border-ink bg-wash" : "border-line hover:bg-wash/60")}>
                            <span className={clsx("flex size-7 shrink-0 items-center justify-center text-sm font-bold", q.type === "mcq" ? "rounded-full" : "rounded-md", on ? "bg-ink text-white" : "bg-wash text-ink-2")}>{o.label}</span>
                            <div className="min-w-0 flex-1 pt-0.5 text-[15px]"><Rich text={o.content} /></div>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
                {(q.type === "nat" || q.type === "tita") && (
                  <input aria-label="Your answer" inputMode={q.type === "nat" ? "decimal" : "text"} value={q.type === "nat" ? r.num : r.text}
                    onChange={(e) => { const v = e.target.value; if (q.type === "nat" && v !== "" && !/^-?\d*\.?\d*$/.test(v)) return; setResp((all) => ({ ...all, [q.test_question_id]: q.type === "nat" ? { ...r, num: v } : { ...r, text: v } })); }}
                    placeholder={q.type === "nat" ? "Enter a number" : "Type your answer"}
                    className="mt-6 h-12 w-full max-w-xs rounded-xl border border-line-strong px-4 font-mono text-lg focus:border-violet-500 focus:outline-none" />
                )}
              </div>
            </section>
          </div>
          {/* Action bar */}
          <div className="flex shrink-0 flex-wrap items-center gap-2 border-t border-line bg-paper px-3 py-3 sm:px-5">
            <button onClick={() => go(nextIndex(), "mark")} className={btn({ variant: "outline", size: "sm" })}>Mark for review &amp; next</button>
            <button onClick={clear} className={btn({ variant: "ghost", size: "sm" })}>Clear response</button>
            <div className="ml-auto flex gap-2">
              <button disabled={posInSection <= 0} onClick={() => go(inSection[posInSection - 1].k, "move")} className={btn({ variant: "outline", size: "sm" })}>Previous</button>
              <button onClick={() => go(nextIndex(), "save")} className={btn({ size: "sm" })}>Save &amp; next</button>
            </div>
          </div>
        </main>

        <aside className="hidden w-80 shrink-0 border-l border-line lg:block">{palette}</aside>
      </div>

      {paletteOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 lg:hidden" onClick={() => setPaletteOpen(false)}>
          <div className="absolute inset-y-0 right-0 w-[min(22rem,90vw)] bg-paper shadow-lift" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-line px-4 py-3"><p className="font-semibold">Questions</p><button onClick={() => setPaletteOpen(false)} aria-label="Close" className="flex size-9 items-center justify-center rounded-lg hover:bg-wash"><IconX /></button></div>
            <div className="h-[calc(100%-3.5rem)]">{palette}</div>
          </div>
        </div>
      )}

      {confirm && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 p-4 sm:items-center" onClick={() => !busy && setConfirm(null)}>
          <div role="alertdialog" aria-modal className="pop w-full max-w-md rounded-2xl bg-paper p-6 shadow-lift" onClick={(e) => e.stopPropagation()}>
            <p className="font-display text-xl font-bold tracking-tight">{confirm === "submit" ? "Submit the test?" : `Finish ${secName}?`}</p>
            <p className="mt-2 text-sm text-ink-3">{confirm === "submit" ? "You can't change answers after submitting." : "You won't be able to come back to this section."}</p>
            <dl className="mt-5 grid grid-cols-2 gap-2 text-sm">
              {LEGEND.map((l) => <div key={l.s} className="flex items-center justify-between rounded-lg bg-wash px-3 py-2"><dt className="text-ink-2">{l.label}</dt><dd className="font-bold tabular-nums">{counts[l.s]}</dd></div>)}
            </dl>
            <div className="mt-6 flex justify-end gap-2">
              <button disabled={busy} onClick={() => setConfirm(null)} className={btn({ variant: "outline" })}>Keep going</button>
              <button disabled={busy} className={btn({})} onClick={() => {
                if (confirm === "submit") doSubmit();
                else start(async () => { if (q && r) await persist(i, r); const out = await finishSection(paper.attempt_id); if ("error" in out && out.error) toast(out.error, "error"); setConfirm(null); if ("status" in out && out.status === "submitted") { done.current = true; router.replace(`/app/tests/result/${paper.attempt_id}`); } else router.refresh(); });
              }}>{busy && <IconSpinner size={14} />}{confirm === "submit" ? "Submit" : "Finish section"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
