"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { Input, Label, Select, Textarea, btn } from "@/components/ui";
import { Rich } from "@/components/rich";
import { IconPlus, IconSpinner, IconTrash, IconCheck } from "@/components/icons";
import { toast } from "@/lib/toast";
import { defaultMarking, TYPE_LABEL } from "@/lib/marking";
import { saveQuestion, type QuestionPayload } from "@/app/admin/questions/actions";
import type { Exam, Question, QuestionGroup, QuestionKey, QuestionOption, QuestionType, Section, Topic } from "@/lib/types";

type Opt = { id: string; content: string; correct: boolean };
const uuid = () => crypto.randomUUID();

export function QuestionEditor({ exams, sections, topics, groups, question, options, keyRow, isAdmin }: {
  exams: Exam[]; sections: Section[]; topics: Topic[]; groups: QuestionGroup[];
  question: Question | null; options: QuestionOption[]; keyRow: QuestionKey | null; isAdmin: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const q = question;
  const [examId, setExamId] = useState(q?.exam_id ?? exams[0]?.id ?? "");
  const exam = exams.find((e) => e.id === examId);
  const [type, setType] = useState<QuestionType>(q?.type ?? "mcq");
  const [topicId, setTopicId] = useState(q?.topic_id ?? "");
  const [groupId, setGroupId] = useState(q?.group_id ?? "");
  const [difficulty, setDifficulty] = useState(q?.difficulty ?? "medium");
  const [stem, setStem] = useState(q?.stem ?? "");
  const [marks, setMarks] = useState(q?.marks ?? defaultMarking(exam?.code ?? "", "mcq").marks);
  const [neg, setNeg] = useState(q?.negative_marks ?? defaultMarking(exam?.code ?? "", "mcq").negative);
  const [isPyq, setIsPyq] = useState(q?.is_pyq ?? false);
  const [year, setYear] = useState<string>(q?.pyq_year ? String(q.pyq_year) : "");
  const [paper, setPaper] = useState(q?.pyq_paper ?? "");
  const [freePractice, setFreePractice] = useState(q?.is_free_practice ?? false);
  const [opts, setOpts] = useState<Opt[]>(options.length
    ? options.map((o) => ({ id: o.id, content: o.content, correct: !!keyRow?.correct_option_ids?.includes(o.id) }))
    : [0, 1, 2, 3].map(() => ({ id: uuid(), content: "", correct: false })));
  const [natMin, setNatMin] = useState(keyRow?.nat_min != null ? String(keyRow.nat_min) : "");
  const [natMax, setNatMax] = useState(keyRow?.nat_max != null ? String(keyRow.nat_max) : "");
  const [tita, setTita] = useState(keyRow?.tita_answer ?? "");
  const [explanation, setExplanation] = useState(keyRow?.explanation ?? "");
  const [tab, setTab] = useState<"write" | "preview">("write");

  const examSections = sections.filter((s) => s.exam_id === examId);
  const examGroups = groups.filter((g) => g.exam_id === examId);
  const choice = type === "mcq" || type === "msq";
  const types: QuestionType[] = exam?.code.startsWith("CAT") ? ["mcq", "tita"] : ["mcq", "msq", "nat"];

  function applyDefaults(nextType: QuestionType, nextMarks = marks) {
    const d = defaultMarking(exam?.code ?? "", nextType, nextMarks);
    setMarks(d.marks); setNeg(d.negative);
  }
  function setCorrect(i: number) {
    setOpts((os) => os.map((o, j) => (type === "mcq" ? { ...o, correct: i === j } : j === i ? { ...o, correct: !o.correct } : o)));
  }

  function save(status: "draft" | "published") {
    const payload: QuestionPayload = {
      id: q?.id ?? null, exam_id: examId, topic_id: topicId, group_id: groupId || null, type, difficulty, stem,
      marks: Number(marks), negative_marks: Number(neg), is_pyq: isPyq, pyq_year: isPyq && year ? Number(year) : null,
      pyq_paper: isPyq ? paper || null : null, status, ...(isAdmin ? { is_free_practice: freePractice } : {}),
      options: choice ? opts : [], nat_min: natMin === "" ? null : Number(natMin), nat_max: natMax === "" ? null : Number(natMax),
      tita_answer: tita || null, explanation: explanation || null,
    };
    start(async () => {
      const r = await saveQuestion(payload);
      if (r?.error) toast(r.error, "error"); else toast(r?.ok ?? "Saved");
      if (r?.id && !q) router.replace(`/admin/questions/${r.id}`);
      else router.refresh();
    });
  }

  const preview = useMemo(() => ({ group: examGroups.find((g) => g.id === groupId) }), [examGroups, groupId]);

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_28rem]">
      <div className="min-w-0 space-y-6">
        <section className="rounded-2xl border border-line bg-paper p-5 sm:p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block"><Label>Exam</Label>
              <Select value={examId} onChange={(e) => { setExamId(e.target.value); setTopicId(""); setGroupId(""); const ex = exams.find((x) => x.id === e.target.value); const t2: QuestionType = ex?.code.startsWith("CAT") && (type === "msq" || type === "nat") ? "mcq" : type; setType(t2); const d = defaultMarking(ex?.code ?? "", t2); setMarks(d.marks); setNeg(d.negative); }}>
                {exams.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
              </Select>
            </label>
            <label className="block"><Label>Topic</Label>
              <Select value={topicId} onChange={(e) => setTopicId(e.target.value)} required>
                <option value="" disabled>Choose a topic…</option>
                {examSections.map((s) => (
                  <optgroup key={s.id} label={s.name}>
                    {topics.filter((t) => t.section_id === s.id && !t.parent_id).flatMap((t) => [
                      <option key={t.id} value={t.id}>{t.name}</option>,
                      ...topics.filter((c) => c.parent_id === t.id).map((c) => <option key={c.id} value={c.id}>&nbsp;&nbsp;↳ {c.name}</option>),
                    ])}
                  </optgroup>
                ))}
              </Select>
            </label>
          </div>

          <div className="mt-5">
            <Label>Question type</Label>
            <div className="flex flex-wrap gap-2" role="radiogroup">
              {types.map((t) => (
                <button key={t} type="button" role="radio" aria-checked={type === t} onClick={() => { setType(t); applyDefaults(t); if (t === "mcq") setOpts((os) => { const i = os.findIndex((o) => o.correct); return os.map((o, j) => ({ ...o, correct: j === i })); }); }}
                  className={clsx("rounded-lg border px-3.5 py-2 text-sm font-semibold transition-colors", type === t ? "border-ink bg-ink text-white" : "border-line-strong hover:bg-wash")}>{TYPE_LABEL[t]}</button>
              ))}
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
            <label className="col-span-2 block sm:col-span-1"><Label>Difficulty</Label>
              <Select value={difficulty} onChange={(e) => setDifficulty(e.target.value as typeof difficulty)}><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option></Select>
            </label>
            <label className="block"><Label>Marks</Label><Input type="number" step="0.5" min="0.5" value={marks} onChange={(e) => { setMarks(Number(e.target.value)); if (!exam?.code.startsWith("CAT")) applyDefaults(type, Number(e.target.value)); }} /></label>
            <label className="block"><Label>Negative</Label><Input type="number" step="0.01" min="0" value={neg} onChange={(e) => setNeg(Number(e.target.value))} /></label>
          </div>
        </section>

        <section className="rounded-2xl border border-line bg-paper p-5 sm:p-6">
          {examGroups.length > 0 && (
            <label className="mb-5 block"><Label hint="for RC / DILR sets">Passage or data set</Label>
              <Select value={groupId} onChange={(e) => setGroupId(e.target.value)}><option value="">None</option>{examGroups.map((g) => <option key={g.id} value={g.id}>{g.title}</option>)}</Select>
            </label>
          )}
          <div className="mb-1.5 flex items-center justify-between"><Label>Question</Label><span className="text-xs text-ink-3">Markdown · LaTeX with $x^2$ or $$\frac{"{a}{b}"}$$</span></div>
          <Textarea value={stem} onChange={(e) => setStem(e.target.value)} rows={6} placeholder="Write the question…" className="font-mono text-sm" />

          {choice && (
            <div className="mt-6">
              <Label>{type === "mcq" ? "Options · select the one correct answer" : "Options · tick every correct answer"}</Label>
              <ul className="space-y-2">
                {opts.map((o, i) => (
                  <li key={o.id} className={clsx("flex items-start gap-2 rounded-xl border p-2 transition-colors", o.correct ? "border-good/50 bg-good/5" : "border-line")}>
                    <button type="button" onClick={() => setCorrect(i)} aria-label={`Mark option ${String.fromCharCode(65 + i)} correct`} aria-pressed={o.correct}
                      className={clsx("mt-1 flex size-8 shrink-0 items-center justify-center text-sm font-bold transition-colors", type === "mcq" ? "rounded-full" : "rounded-lg",
                        o.correct ? "bg-good text-white" : "bg-wash text-ink-2 hover:bg-line")}>
                      {o.correct ? <IconCheck size={15} /> : String.fromCharCode(65 + i)}
                    </button>
                    <textarea value={o.content} onChange={(e) => setOpts((os) => os.map((x, j) => (j === i ? { ...x, content: e.target.value } : x)))}
                      rows={1} placeholder={`Option ${String.fromCharCode(65 + i)}`} aria-label={`Option ${String.fromCharCode(65 + i)}`}
                      className="min-h-10 flex-1 resize-y rounded-lg bg-transparent px-2 py-2 font-mono text-sm focus:bg-wash focus:outline-none" />
                    <button type="button" onClick={() => setOpts((os) => os.filter((_, j) => j !== i))} disabled={opts.length <= 2} aria-label="Remove option"
                      className="mt-1 flex size-8 items-center justify-center rounded-lg text-ink-4 hover:bg-bad/10 hover:text-bad disabled:opacity-30"><IconTrash size={15} /></button>
                  </li>
                ))}
              </ul>
              {opts.length < 6 && (
                <button type="button" onClick={() => setOpts((os) => [...os, { id: uuid(), content: "", correct: false }])}
                  className="mt-2 flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-semibold text-ink-3 hover:bg-wash hover:text-ink"><IconPlus size={14} />Add option</button>
              )}
            </div>
          )}
          {type === "nat" && (
            <div className="mt-6 grid grid-cols-2 gap-4">
              <label className="block"><Label hint="lowest accepted">Answer from</Label><Input type="number" step="any" value={natMin} onChange={(e) => { setNatMin(e.target.value); if (natMax === "") setNatMax(e.target.value); }} /></label>
              <label className="block"><Label hint="highest accepted">Answer to</Label><Input type="number" step="any" value={natMax} onChange={(e) => setNatMax(e.target.value)} /></label>
            </div>
          )}
          {type === "tita" && (
            <label className="mt-6 block"><Label hint="matched ignoring case and spaces">Correct answer</Label><Input value={tita} onChange={(e) => setTita(e.target.value)} /></label>
          )}

          <div className="mb-1.5 mt-6 flex items-center justify-between"><Label>Solution / explanation</Label></div>
          <Textarea value={explanation} onChange={(e) => setExplanation(e.target.value)} rows={5} placeholder="Shown to students after they answer." className="font-mono text-sm" />
        </section>

        <section className="rounded-2xl border border-line bg-paper p-5 sm:p-6">
          <label className="flex items-center gap-2.5 text-sm font-semibold"><input type="checkbox" checked={isPyq} onChange={(e) => setIsPyq(e.target.checked)} className="size-4 accent-violet-600" />Past-year question (PYQ)</label>
          {isPyq && (
            <div className="mt-4 grid gap-4 sm:grid-cols-[8rem_1fr]">
              <label className="block"><Label>Year</Label><Input type="number" min={1990} max={2100} value={year} onChange={(e) => setYear(e.target.value)} placeholder="2024" /></label>
              <label className="block"><Label hint="optional">Paper</Label><Input value={paper} onChange={(e) => setPaper(e.target.value)} placeholder={exam?.code.startsWith("CAT") ? "CAT 2024 Slot 2" : "Paper name and year"} /></label>
            </div>
          )}
          {isAdmin && (
            <label className="mt-5 flex items-start gap-2.5 rounded-xl bg-violet-50 p-3 text-sm">
              <input type="checkbox" checked={freePractice} onChange={(e) => setFreePractice(e.target.checked)} className="mt-0.5 size-4 accent-violet-600" />
              <span><span className="font-semibold">Free practice</span><br /><span className="text-ink-3">Students who haven&apos;t bought anything can practise this question.</span></span>
            </label>
          )}
        </section>

        <div className="sticky bottom-0 z-10 -mx-4 flex flex-wrap items-center justify-end gap-2 border-t border-line bg-[#fafafa]/95 px-4 py-3 sm:mx-0 sm:rounded-2xl sm:border">
          {q && <span className="mr-auto text-xs text-ink-3">Status: <span className="font-semibold">{q.status}</span></span>}
          <button type="button" disabled={pending} onClick={() => save("draft")} className={btn({ variant: "outline" })}>Save draft</button>
          <button type="button" disabled={pending} onClick={() => save("published")} className={btn({})}>{pending && <IconSpinner size={14} />}Save &amp; publish</button>
        </div>
      </div>

      <aside className="min-w-0 xl:sticky xl:top-6 xl:h-fit">
        <div className="mb-3 flex gap-1 rounded-lg bg-wash p-1 xl:hidden">
          {(["write", "preview"] as const).map((t) => <button key={t} type="button" onClick={() => setTab(t)} className={clsx("flex-1 rounded-md py-1.5 text-sm font-semibold capitalize", tab === t ? "bg-paper shadow-sm" : "text-ink-3")}>{t}</button>)}
        </div>
        <div className={clsx("rounded-2xl border border-line bg-paper p-5", tab === "write" && "hidden xl:block")}>
          <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-3">Student preview</p>
          {preview.group && <div className="mb-4 max-h-60 overflow-y-auto rounded-xl bg-wash p-4 text-sm"><p className="mb-2 font-semibold">{preview.group.title}</p><Rich text={preview.group.content} /></div>}
          {stem ? <Rich text={stem} className="text-[15px]" /> : <p className="text-sm text-ink-4">Your question appears here.</p>}
          {choice && (
            <ul className="mt-4 space-y-2">
              {opts.map((o, i) => (
                <li key={o.id} className={clsx("flex gap-3 rounded-xl border px-3 py-2.5 text-sm", o.correct ? "border-good/50 bg-good/5" : "border-line")}>
                  <span className="font-bold text-ink-3">{String.fromCharCode(65 + i)}</span>
                  <div className="min-w-0 flex-1">{o.content ? <Rich text={o.content} /> : <span className="text-ink-4">Empty option</span>}</div>
                </li>
              ))}
            </ul>
          )}
          {type === "nat" && <div className="mt-4 rounded-xl border border-line px-3 py-2.5 text-sm text-ink-3">Numeric answer · accepted {natMin || "?"} to {natMax || "?"}</div>}
          {type === "tita" && <div className="mt-4 rounded-xl border border-line px-3 py-2.5 text-sm text-ink-3">Type-in answer · expects “{tita || "?"}”</div>}
          {explanation && <div className="mt-5 border-t border-line pt-4"><p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-good">Solution</p><Rich text={explanation} className="text-sm" /></div>}
          <p className="mt-5 text-xs text-ink-3">+{marks} / −{neg} · {difficulty}{isPyq && year ? ` · PYQ ${year}` : ""}</p>
        </div>
      </aside>
    </div>
  );
}
