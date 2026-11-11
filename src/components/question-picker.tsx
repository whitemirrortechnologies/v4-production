"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { btn, Input, Select } from "@/components/ui";
import { IconPlus, IconSpinner, IconCheck } from "@/components/icons";
import { toast } from "@/lib/toast";
import { TYPE_SHORT } from "@/lib/marking";
import { addQuestionsToSection, searchQuestions, type PickerRow } from "@/app/admin/tests/actions";
import type { QuestionType } from "@/lib/types";

const plain = (s: string) => s.replace(/\$\$?[^$]*\$\$?/g, "[math]").replace(/[#*_`>!\[\]()]/g, "").replace(/\s+/g, " ").trim();

export function QuestionPicker({ testId, examId, sections, syllabus, already }: {
  testId: string; examId: string; sections: { id: string; name: string }[]; syllabus: { id: string; name: string }[]; already: string[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState(""), [type, setType] = useState(""), [syl, setSyl] = useState("");
  const [target, setTarget] = useState(sections[0]?.id ?? "");
  const [rows, setRows] = useState<PickerRow[]>([]);
  const [picked, setPicked] = useState<string[]>([]);
  const [loading, startLoad] = useTransition();
  const [saving, startSave] = useTransition();
  const have = new Set(already);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => startLoad(async () => setRows(await searchQuestions(examId, term, type, syl))), 250);
    return () => clearTimeout(t);
  }, [open, term, type, syl, examId]);

  if (!open) return <button type="button" onClick={() => setOpen(true)} className={btn({})}><IconPlus size={14} />Add questions from bank</button>;

  return (
    <div className="rounded-2xl border border-line bg-paper shadow-soft">
      <div className="grid gap-2 border-b border-line p-4 sm:grid-cols-[1fr_10rem_10rem]">
        <Input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Search the bank…" aria-label="Search questions" className="h-10" autoFocus />
        <Select value={syl} onChange={(e) => setSyl(e.target.value)} aria-label="Syllabus section" className="h-10"><option value="">All subjects</option>{syllabus.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select>
        <Select value={type} onChange={(e) => setType(e.target.value)} aria-label="Type" className="h-10"><option value="">All types</option>{(["mcq", "msq", "nat", "tita"] as QuestionType[]).map((t) => <option key={t} value={t}>{TYPE_SHORT[t]}</option>)}</Select>
      </div>
      <ul className="max-h-[26rem] overflow-y-auto">
        {loading && !rows.length && <li className="flex justify-center p-8 text-ink-3"><IconSpinner /></li>}
        {!loading && !rows.length && <li className="p-8 text-center text-sm text-ink-3">No published questions match.</li>}
        {rows.map((r) => {
          const inTest = have.has(r.id), on = picked.includes(r.id);
          return (
            <li key={r.id} className="border-b border-line last:border-0">
              <label className={clsx("flex cursor-pointer items-start gap-3 px-4 py-3", inTest ? "cursor-default opacity-50" : "hover:bg-wash/60")}>
                <input type="checkbox" disabled={inTest} checked={on || inTest} onChange={() => setPicked((p) => (on ? p.filter((x) => x !== r.id) : [...p, r.id]))} className="mt-1 size-4 accent-violet-600" />
                <span className="w-10 shrink-0 pt-0.5 font-mono text-xs font-bold text-violet-600">{TYPE_SHORT[r.type as QuestionType]}</span>
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-2 text-sm">{plain(r.stem)}</span>
                  <span className="mt-1 block text-xs text-ink-3">{r.topic} · <span className="capitalize">{r.difficulty}</span> · +{r.marks}{r.is_pyq && ` · PYQ ${r.pyq_year}`}{inTest && " · already in test"}</span>
                </span>
              </label>
            </li>
          );
        })}
      </ul>
      <div className="flex flex-wrap items-center gap-2 border-t border-line p-4">
        <span className="mr-auto text-sm text-ink-3">{picked.length} selected</span>
        <Select value={target} onChange={(e) => setTarget(e.target.value)} aria-label="Add to section" className="h-10 w-auto">{sections.map((s) => <option key={s.id} value={s.id}>Add to: {s.name}</option>)}</Select>
        <button type="button" onClick={() => setOpen(false)} className={btn({ variant: "outline", size: "sm" })}>Close</button>
        <button type="button" disabled={!picked.length || saving || !target} className={btn({ size: "sm" })}
          onClick={() => startSave(async () => {
            const r = await addQuestionsToSection(testId, target, picked);
            if (r?.error) toast(r.error, "error"); else { toast(r?.ok ?? "Added"); setPicked([]); router.refresh(); }
          })}>{saving ? <IconSpinner size={14} /> : <IconCheck size={14} />}Add {picked.length || ""}</button>
      </div>
    </div>
  );
}
