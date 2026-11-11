import Link from "next/link";
import clsx from "clsx";
import { notFound } from "next/navigation";
import { getViewer, requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Badge, Card, Input, Label, LinkButton, Select, Textarea } from "@/components/ui";
import { ActionForm, IconSubmit, InlineEdit, Submit } from "@/components/forms";
import { QuestionPicker } from "@/components/question-picker";
import { IconDown, IconTrash, IconUp } from "@/components/icons";
import { TYPE_SHORT } from "@/lib/marking";
import type { QuestionType } from "@/lib/types";
import {
  addTestSection, deleteTest, deleteTestSection, moveTestQuestion, removeTestQuestion, setLinks, setQuestionMarks, updateTest, updateTestSection,
} from "../actions";

export const metadata = { title: "Edit test · Admin" };
const plain = (s: string) => s.replace(/\$\$?[^$]*\$\$?/g, "[math]").replace(/[#*_`>!\[\]()]/g, "").replace(/\s+/g, " ").trim();
const local = (iso: string | null) => (iso ? new Date(new Date(iso).getTime() + 5.5 * 3600e3).toISOString().slice(0, 16) : "");

export default async function EditTest({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const { id } = await params;
  await requireStaff(`/admin/tests/${id}`);
  const { tab = "questions" } = await searchParams;
  const isAdmin = (await getViewer())?.profile.role === "admin";
  const supabase = await createClient();
  const { data: test } = await supabase.from("tests").select("*").eq("id", id).maybeSingle();
  if (!test) notFound();
  const [{ data: sections }, { data: tqs }, { data: syl }, { data: courses }, { data: series }, { data: linkC }, { data: linkS }] = await Promise.all([
    supabase.from("test_sections").select("*").eq("test_id", id).order("position"),
    supabase.from("test_questions").select("id,section_id,position,marks,negative_marks,question:questions(id,type,stem,marks,negative_marks,difficulty)").eq("test_id", id).order("position"),
    supabase.from("syllabus_sections").select("id,name").eq("exam_id", test.exam_id).order("position"),
    supabase.from("courses").select("id,title").eq("exam_id", test.exam_id).order("title"),
    supabase.from("test_series").select("id,title").eq("exam_id", test.exam_id).order("title"),
    supabase.from("course_tests").select("course_id").eq("test_id", id),
    supabase.from("test_series_tests").select("series_id").eq("test_id", id),
  ]);
  type TQ = { id: string; section_id: string; marks: number | null; negative_marks: number | null; question: { id: string; type: QuestionType; stem: string; marks: number; negative_marks: number; difficulty: string } };
  const rows = ((tqs ?? []) as unknown as TQ[]).map((r) => ({ ...r, question: Array.isArray(r.question) ? r.question[0] : r.question }));
  const total = rows.reduce((n, r) => n + Number(r.marks ?? r.question.marks), 0);
  const timed = (sections ?? []).length > 0 && (sections ?? []).every((s) => s.duration_minutes);
  const tabs = [["questions", `Questions · ${rows.length}`], ["details", "Details"], ["access", "Access"]];

  return (
    <>
      <Link href="/admin/tests" className="tap text-sm text-ink-3 hover:text-ink">← Tests</Link>
      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="h2">{test.title}</h1>
          <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-ink-3">
            <Badge tone={test.status === "published" ? "good" : "neutral"}>{test.status === "published" ? "Live" : test.status}</Badge>
            {test.is_free && <Badge tone="violet">Free</Badge>}
            {rows.length} questions · {total} marks · {timed ? `${(sections ?? []).reduce((n, s) => n + s.duration_minutes, 0)} min (timed sections)` : `${test.duration_minutes} min`}
          </p>
        </div>
      </div>
      <nav className="mb-8 mt-8 flex gap-1 border-b border-line">
        {tabs.map(([k, l]) => <Link key={k} href={`?tab=${k}`} className={clsx("-mb-px border-b-2 px-4 py-2.5 text-sm font-semibold", tab === k ? "border-violet-500 text-ink" : "border-transparent text-ink-3 hover:text-ink")}>{l}</Link>)}
      </nav>

      {tab === "questions" && (
        <div className="max-w-5xl space-y-5">
          <QuestionPicker testId={id} examId={test.exam_id} sections={(sections ?? []).map((s) => ({ id: s.id, name: s.name }))} syllabus={syl ?? []} already={rows.map((r) => r.question.id)} />
          {(sections ?? []).map((s) => {
            const inS = rows.filter((r) => r.section_id === s.id);
            return (
              <Card key={s.id} className="p-4 sm:p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex w-full min-w-40 sm:w-auto sm:flex-1"><InlineEdit action={updateTestSection} name="name" value={s.name} label="Section name" fields={{ id: s.id, test_id: id }} className="font-display text-lg font-bold tracking-tight" /></div>
                  <ActionForm action={updateTestSection} className="flex items-center gap-1.5">
                    <input type="hidden" name="id" value={s.id} /><input type="hidden" name="test_id" value={id} />
                    <label className="text-xs text-ink-3" htmlFor={`d-${s.id}`}>Own timer</label>
                    <input id={`d-${s.id}`} name="duration_minutes" type="number" min={1} defaultValue={s.duration_minutes ?? ""} placeholder="—" className="h-8 w-16 rounded-lg border border-line px-2 text-sm" />
                    <span className="text-xs text-ink-3">min</span>
                    <Submit size="sm" variant="ghost" className="h-8 px-2">Set</Submit>
                  </ActionForm>
                  <span className="text-xs text-ink-3">{inS.length} Q · {inS.reduce((n, r) => n + Number(r.marks ?? r.question.marks), 0)} marks</span>
                  <ActionForm action={deleteTestSection} confirm={`Remove the section "${s.name}" and its ${inS.length} question(s) from this test? The questions stay in the bank.`}>
                    <input type="hidden" name="id" value={s.id} /><input type="hidden" name="test_id" value={id} /><IconSubmit label="Delete section" danger><IconTrash size={15} /></IconSubmit>
                  </ActionForm>
                </div>
                <ol className="mt-3 divide-y divide-line rounded-xl border border-line">
                  {inS.map((r, n) => (
                    <li key={r.id} className="group/row flex items-center gap-3 px-3 py-2.5">
                      <span className="w-6 text-right text-xs font-semibold tabular-nums text-ink-3">{n + 1}</span>
                      <span className="w-10 font-mono text-xs font-bold text-violet-600">{TYPE_SHORT[r.question.type as QuestionType]}</span>
                      <Link href={`/admin/questions/${r.question.id}`} className="min-w-0 flex-1 truncate py-2.5 text-sm hover:underline">{plain(r.question.stem)}</Link>
                      <ActionForm action={setQuestionMarks} className="hidden items-center gap-1 sm:flex">
                        <input type="hidden" name="id" value={r.id} /><input type="hidden" name="test_id" value={id} />
                        <input name="marks" type="number" step="0.5" aria-label="Marks" defaultValue={r.marks ?? ""} placeholder={String(r.question.marks)} className="h-8 w-14 rounded-lg border border-line px-2 text-xs" />
                        <input name="negative_marks" type="number" step="0.01" aria-label="Negative marks" defaultValue={r.negative_marks ?? ""} placeholder={`-${r.question.negative_marks}`} className="h-8 w-14 rounded-lg border border-line px-2 text-xs" />
                        <Submit size="sm" variant="ghost" className="h-8 px-2 text-xs">Save</Submit>
                      </ActionForm>
                      <span className="flex opacity-60 group-hover/row:opacity-100">
                        {[-1, 1].map((d) => (
                          <ActionForm key={d} action={moveTestQuestion}><input type="hidden" name="id" value={r.id} /><input type="hidden" name="test_id" value={id} /><input type="hidden" name="dir" value={d} />
                            <IconSubmit label={d < 0 ? "Move up" : "Move down"}>{d < 0 ? <IconUp size={14} /> : <IconDown size={14} />}</IconSubmit></ActionForm>
                        ))}
                        <ActionForm action={removeTestQuestion}><input type="hidden" name="id" value={r.id} /><input type="hidden" name="test_id" value={id} /><IconSubmit label="Remove from test" danger><IconTrash size={14} /></IconSubmit></ActionForm>
                      </span>
                    </li>
                  ))}
                  {!inS.length && <li className="px-4 py-6 text-center text-sm text-ink-3">No questions yet. Use “Add questions from bank”.</li>}
                </ol>
              </Card>
            );
          })}
          <Card className="border-dashed p-4">
            <ActionForm action={addTestSection} resetOnSuccess className="flex flex-wrap gap-2">
              <input type="hidden" name="test_id" value={id} />
              <Input name="name" placeholder="New section…" required className="h-10 min-w-48 flex-1" />
              <Input name="duration_minutes" type="number" min={1} placeholder="Own timer (min)" className="h-10 w-40" />
              <Submit size="sm" className="h-10">Add section</Submit>
            </ActionForm>
            <p className="mt-2 text-xs text-ink-3">Give <b>every</b> section its own timer for CAT-style locked sections. Leave all empty for one shared timer.</p>
          </Card>
        </div>
      )}

      {tab === "details" && (
        <Card className="max-w-3xl p-6">
          <ActionForm action={updateTest} className="grid gap-5 sm:grid-cols-2">
            <input type="hidden" name="id" value={id} />
            <label className="block sm:col-span-2"><Label>Title</Label><Input name="title" defaultValue={test.title} required /></label>
            <label className="block"><Label>Slug</Label><Input name="slug" defaultValue={test.slug} required /></label>
            <label className="block"><Label>Type</Label><Select name="kind" defaultValue={test.kind}><option value="full_mock">Full mock</option><option value="sectional">Sectional</option><option value="topic_test">Topic test</option><option value="pyq_paper">PYQ paper</option></Select></label>
            <label className="block"><Label hint={timed ? "sections are timed" : "minutes"}>Duration</Label><Input name="duration_minutes" type="number" min={1} defaultValue={test.duration_minutes} required /></label>
            <label className="block"><Label hint="blank = unlimited">Max attempts</Label><Input name="max_attempts" type="number" min={1} defaultValue={test.max_attempts ?? ""} /></label>
            <label className="block"><Label hint="IST, optional">Opens at</Label><Input name="available_from" type="datetime-local" defaultValue={local(test.available_from)} /></label>
            <label className="block"><Label hint="IST, optional">Closes at</Label><Input name="available_until" type="datetime-local" defaultValue={local(test.available_until)} /></label>
            <label className="block sm:col-span-2"><Label hint="Markdown">Instructions</Label><Textarea name="instructions" rows={6} defaultValue={test.instructions ?? ""} placeholder="Shown before the test starts." /></label>
            <label className="block"><Label>Status</Label><Select name="status" defaultValue={test.status}><option value="draft">Draft (hidden)</option><option value="published">Published (live)</option><option value="archived">Archived</option></Select></label>
            {isAdmin && <label className="flex items-center gap-2.5 self-end rounded-xl bg-violet-50 p-3 text-sm"><input type="checkbox" name="is_free" defaultChecked={test.is_free} className="size-4 accent-violet-600" /><span><b>Free test</b> · any signed-in student</span></label>}
            <div className="sm:col-span-2"><Submit>Save details</Submit></div>
          </ActionForm>
          <div className="mt-10 border-t border-line pt-6">
            <ActionForm action={deleteTest} confirm="Delete this test? Students' past attempts on it are deleted too.">
              <input type="hidden" name="id" value={id} /><Submit size="sm" variant="danger">Delete test</Submit>
            </ActionForm>
          </div>
        </Card>
      )}

      {tab === "access" && (
        <Card className="max-w-3xl p-6">
          <p className="mb-5 text-sm text-ink-3">Students get this test if they bought any course or test series ticked below{test.is_free ? ", and it is also free for everyone signed in" : ""}.</p>
          <ActionForm action={setLinks} className="space-y-6">
            <input type="hidden" name="test_id" value={id} />
            <fieldset><legend className="mb-2 text-sm font-semibold">Included in courses</legend>
              <div className="space-y-1.5">{(courses ?? []).map((c) => <label key={c.id} className="flex items-center gap-2.5 text-sm"><input type="checkbox" name="courses" value={c.id} defaultChecked={linkC?.some((l) => l.course_id === c.id)} className="size-4 accent-violet-600" />{c.title}</label>)}{!courses?.length && <p className="text-sm text-ink-3">No courses for this exam.</p>}</div>
            </fieldset>
            <fieldset><legend className="mb-2 text-sm font-semibold">Included in test series</legend>
              <div className="space-y-1.5">{(series ?? []).map((s) => <label key={s.id} className="flex items-center gap-2.5 text-sm"><input type="checkbox" name="series" value={s.id} defaultChecked={linkS?.some((l) => l.series_id === s.id)} className="size-4 accent-violet-600" />{s.title}</label>)}{!series?.length && <p className="text-sm text-ink-3">No test series yet. <Link href="/admin/series" className="text-violet-600 underline">Create one</Link>.</p>}</div>
            </fieldset>
            <Submit>Save access</Submit>
          </ActionForm>
        </Card>
      )}
      {tab !== "access" && test.status === "published" && <p className="mt-6 text-xs text-ink-3">Live tests: changes to questions apply to new attempts. <LinkButton href="/app/tests" variant="ghost" size="sm">Student view →</LinkButton></p>}
    </>
  );
}
