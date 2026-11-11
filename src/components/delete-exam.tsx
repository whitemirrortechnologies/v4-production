"use client";

import { useState } from "react";
import { ActionForm, Submit } from "@/components/forms";
import { Input } from "@/components/ui";
import { deleteExamAndContent } from "@/app/admin/exams/actions";

/** Danger zone: permanently delete an exam and all its content. Needs the exam code typed to confirm. */
export function DeleteExam({ id, code, name, counts }: { id: string; code: string; name: string; counts: { courses: number; questions: number; tests: number; sections: number } }) {
  const [typed, setTyped] = useState("");
  const ok = typed.trim().toUpperCase() === code.toUpperCase();
  const parts = [counts.courses && `${counts.courses} course${counts.courses === 1 ? "" : "s"} (with videos and notes)`, counts.questions && `${counts.questions} question${counts.questions === 1 ? "" : "s"}`,
    counts.tests && `${counts.tests} test${counts.tests === 1 ? "" : "s"}`, counts.sections && `${counts.sections} syllabus section${counts.sections === 1 ? "" : "s"}`].filter(Boolean);
  return (
    <details className="group w-full border-t border-line pt-3">
      <summary className="inline-flex h-9 cursor-pointer items-center rounded-lg px-3 text-sm font-semibold text-bad hover:bg-bad/10">Delete permanently…</summary>
      <div className="mt-3 rounded-xl border border-bad/30 bg-bad/5 p-4">
        <p className="font-semibold text-bad">Delete {name} and everything in it</p>
        <p className="mt-1 text-sm text-ink-2">
          This removes {parts.length ? parts.join(", ") : "the exam"}, plus its test series, attempts, orders and enrollments. <b>It cannot be undone.</b>{" "}
          Students stay; their accounts are not touched.
        </p>
        <ActionForm action={deleteExamAndContent} className="mt-4 flex flex-wrap items-end gap-3">
          <input type="hidden" name="id" value={id} />
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold">Type <code className="rounded bg-wash px-1.5 py-0.5 font-mono text-[13px]">{code}</code> to confirm</span>
            <Input name="confirm" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" autoCapitalize="characters" spellCheck={false} className="w-56 font-mono" />
          </label>
          <Submit variant="danger" disabled={!ok}>Delete everything</Submit>
        </ActionForm>
      </div>
    </details>
  );
}
