import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Badge, Card, Input, Label, PageHeader } from "@/components/ui";
import { ActionForm, IconSubmit, Submit } from "@/components/forms";
import { IconTrash } from "@/components/icons";
import { EXAM_PRESETS } from "@/lib/exam-presets";
import type { Exam } from "@/lib/types";
import { addExam, deleteExam, setExamVisible } from "./actions";

export const metadata = { title: "Exams · Admin" };

export default async function ExamsAdmin() {
  await requireStaff("/admin/exams");
  const supabase = await createClient();
  const { data } = await supabase.from("exams").select("*").order("position");
  const exams = (data ?? []) as Exam[];
  const stats = await Promise.all(exams.map(async (e) => {
    const n = async (t: string) => (await supabase.from(t).select("*", { count: "exact", head: true }).eq("exam_id", e.id)).count ?? 0;
    const [courses, questions, tests, sections] = await Promise.all([n("courses"), n("questions"), n("tests"), n("syllabus_sections")]);
    return { id: e.id, courses, questions, tests, sections };
  }));
  const have = new Set(exams.map((e) => e.code));
  const offered = EXAM_PRESETS.filter((p) => !have.has(p.code));
  const visible = exams.filter((e) => e.is_active);

  return (
    <>
      <PageHeader eyebrow="Content" title="Exams"
        subtitle="Switch exams on or off for students. With one exam on, V4 is a single-exam site; add another and students get an exam picker automatically." />

      <div className="max-w-4xl space-y-8">
        <div>
          <h2 className="mb-3 font-display text-lg font-bold tracking-tight">Your exams</h2>
          <div className="overflow-hidden rounded-2xl border border-line bg-paper">
            {exams.map((e) => {
              const s = stats.find((x) => x.id === e.id)!;
              return (
                <div key={e.id} className="flex flex-wrap items-center gap-4 border-b border-line px-5 py-4 last:border-0">
                  <div className="min-w-0 flex-1 basis-56">
                    <p className="flex items-center gap-2 font-semibold">{e.name}<Badge tone={e.is_active ? "good" : "neutral"}>{e.is_active ? "Visible" : "Hidden"}</Badge></p>
                    <p className="mt-1 text-sm text-ink-3">{e.code} · {s.sections} sections · {s.courses} courses · {s.questions} questions · {s.tests} tests</p>
                  </div>
                  <ActionForm action={setExamVisible} className="flex items-center gap-3">
                    <input type="hidden" name="id" value={e.id} /><input type="hidden" name="visible" value={e.is_active ? "0" : "1"} />
                    <Submit size="sm" variant={e.is_active ? "outline" : "violet"}>{e.is_active ? "Hide from students" : "Show to students"}</Submit>
                  </ActionForm>
                  <ActionForm action={deleteExam} confirm={`Delete "${e.name}" and its syllabus? Only possible when it has no courses, questions or tests.`}>
                    <input type="hidden" name="id" value={e.id} /><IconSubmit label="Delete exam" danger><IconTrash size={15} /></IconSubmit>
                  </ActionForm>
                </div>
              );
            })}
            {!exams.length && <p className="p-8 text-center text-ink-3">No exams yet. Add one below.</p>}
          </div>
          {visible.length === 1 && <p className="mt-3 text-sm text-ink-3">Only <b>{visible[0].name}</b> is visible, so students see a single-exam site: no exam picker, no &ldquo;Exams&rdquo; menu.</p>}
        </div>

        <Card className="p-6">
          <h2 className="font-display text-lg font-bold tracking-tight">Add an exam</h2>
          <p className="mb-5 mt-1 text-sm text-ink-3">Pick a ready-made exam to get its full syllabus in one click, or create your own.</p>
          {offered.length > 0 && (
            <div className="mb-6 flex flex-wrap gap-3">
              {offered.map((p) => (
                <ActionForm key={p.key} action={addExam}>
                  <input type="hidden" name="preset" value={p.key} />
                  <Submit variant="outline" size="lg">+ {p.name}</Submit>
                </ActionForm>
              ))}
            </div>
          )}
          <ActionForm action={addExam} resetOnSuccess className="grid gap-4 border-t border-line pt-5 sm:grid-cols-[1fr_9rem_auto] sm:items-end">
            <label className="block"><Label>Custom exam name</Label><Input name="name" placeholder="e.g. XAT, GMAT, SNAP" required /></label>
            <label className="block"><Label hint="short">Code</Label><Input name="code" placeholder="XAT" required /></label>
            <Submit>Add exam</Submit>
          </ActionForm>
          <p className="mt-3 text-xs text-ink-3">A custom exam starts empty: add its sections and topics under Syllabus.</p>
        </Card>
      </div>
    </>
  );
}
