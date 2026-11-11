import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Badge, Button, Card, Input, Label, Notice, PageHeader, Select } from "@/components/ui";
import type { Exam, Section, Topic } from "@/lib/types";
import {
  addExam, addSection, addTopic, deleteSection, deleteTopic, moveItem, moveTopicQuestions,
  renameSection, renameTopic, updateExam,
} from "./actions";

export const metadata = { title: "Syllabus · Admin" };

function Move({ table, id, exam }: { table: string; id: string; exam: string }) {
  return (
    <span className="inline-flex">
      {[-1, 1].map((dir) => (
        <form action={moveItem} key={dir}>
          <input type="hidden" name="table" value={table} /><input type="hidden" name="id" value={id} />
          <input type="hidden" name="dir" value={dir} /><input type="hidden" name="exam" value={exam} />
          <button aria-label={dir < 0 ? "Move up" : "Move down"} className="h-8 w-8 rounded-lg text-ink-3 hover:bg-wash hover:text-ink">{dir < 0 ? "↑" : "↓"}</button>
        </form>
      ))}
    </span>
  );
}

export default async function SyllabusPage({ searchParams }: { searchParams: Promise<{ exam?: string; error?: string }> }) {
  await requireStaff("/admin/syllabus");
  const { exam: examParam, error } = await searchParams;
  const supabase = await createClient();

  const { data: examRows } = await supabase.from("exams").select("*").order("position");
  const exams = (examRows ?? []) as Exam[];
  const exam = exams.find((e) => e.code === examParam) ?? exams[0];

  let sections: Section[] = [], topics: Topic[] = [];
  const counts = new Map<string, number>();
  if (exam) {
    const { data: s } = await supabase.from("syllabus_sections").select("*").eq("exam_id", exam.id).order("position");
    sections = (s ?? []) as Section[];
    if (sections.length) {
      const { data: t } = await supabase.from("topics").select("*").in("section_id", sections.map((x) => x.id)).order("position");
      topics = (t ?? []) as Topic[];
      const { data: q } = await supabase.from("questions").select("topic_id").eq("exam_id", exam.id);
      (q ?? []).forEach((r) => counts.set(r.topic_id, (counts.get(r.topic_id) ?? 0) + 1));
    }
  }
  const total = (t: Topic) => (counts.get(t.id) ?? 0) + topics.filter((c) => c.parent_id === t.id).reduce((n, c) => n + (counts.get(c.id) ?? 0), 0);

  const TopicRow = ({ t, depth }: { t: Topic; depth: number }) => {
    const n = counts.get(t.id) ?? 0;
    const others = topics.filter((x) => x.id !== t.id);
    return (
      <li className={depth ? "ml-6 border-l border-line pl-4" : ""}>
        <div className="flex flex-wrap items-center gap-2 py-1.5">
          <form action={renameTopic} className="flex min-w-0 flex-1 items-center gap-2">
            <input type="hidden" name="id" value={t.id} /><input type="hidden" name="exam" value={exam.code} />
            <input name="name" defaultValue={t.name} aria-label="Topic name" className="min-w-0 flex-1 rounded-lg bg-transparent px-2 py-1.5 text-[15px] hover:bg-wash focus:bg-wash focus:outline-none" />
          </form>
          <Badge tone={n ? "violet" : "neutral"}>{depth ? n : total(t)} Q</Badge>
          <Move table="topics" id={t.id} exam={exam.code} />
          <details className="relative">
            <summary className="flex h-8 w-8 cursor-pointer list-none items-center justify-center rounded-lg text-ink-3 hover:bg-wash">⋯</summary>
            <div className="absolute right-0 z-10 mt-1 w-72 space-y-3 rounded-2xl border border-line bg-paper p-4 shadow-lift">
              {n > 0 && others.length > 0 && (
                <form action={moveTopicQuestions} className="space-y-2">
                  <input type="hidden" name="id" value={t.id} /><input type="hidden" name="exam" value={exam.code} />
                  <Label>Move {n} question(s) to</Label>
                  <Select name="to" defaultValue="">
                    <option value="" disabled>Choose topic…</option>
                    {others.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                  </Select>
                  <Button size="sm" variant="secondary" type="submit">Move</Button>
                </form>
              )}
              <form action={deleteTopic}>
                <input type="hidden" name="id" value={t.id} /><input type="hidden" name="exam" value={exam.code} />
                <Button size="sm" variant="danger" type="submit">Delete topic</Button>
              </form>
            </div>
          </details>
        </div>
        {topics.filter((c) => c.parent_id === t.id).length > 0 && (
          <ul>{topics.filter((c) => c.parent_id === t.id).map((c) => <TopicRow key={c.id} t={c} depth={depth + 1} />)}</ul>
        )}
      </li>
    );
  };

  return (
    <>
      <PageHeader title="Syllabus" subtitle="Exams, sections, topics and subtopics. Questions are tagged against these." />
      {error && <div className="mb-6"><Notice tone="error">{error}</Notice></div>}

      <div className="hide-scrollbar mb-6 flex gap-2 overflow-x-auto">
        {exams.map((e) => (
          <Link key={e.id} href={`/admin/syllabus?exam=${e.code}`}
            className={`whitespace-nowrap rounded-full px-5 py-2 text-sm font-medium ${e.id === exam?.id ? "bg-ink text-paper" : "bg-wash text-ink-2 hover:bg-line"}`}>
            {e.name}{!e.is_active && " (hidden)"}
          </Link>
        ))}
        <details className="relative">
          <summary className="cursor-pointer list-none whitespace-nowrap rounded-full border border-dashed border-line px-5 py-2 text-sm text-ink-3 hover:bg-wash">+ New exam</summary>
          <form action={addExam} className="absolute left-0 z-10 mt-2 w-80 space-y-3 rounded-2xl border border-line bg-paper p-4 shadow-lift">
            <label className="block"><Label hint="e.g. GATE_DA">Code</Label><Input name="code" required /></label>
            <label className="block"><Label>Name</Label><Input name="name" required /></label>
            <label className="block"><Label>Description</Label><Input name="description" /></label>
            <Button size="sm" type="submit">Add exam</Button>
          </form>
        </details>
      </div>

      {!exam ? <Card className="p-8 text-center text-ink-3">No exams yet. Add one above.</Card> : (
        <>
          <Card className="mb-6 p-5">
            <form action={updateExam} className="grid gap-4 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end">
              <input type="hidden" name="id" value={exam.id} /><input type="hidden" name="exam" value={exam.code} />
              <label className="block"><Label>Name</Label><Input name="name" defaultValue={exam.name} required /></label>
              <label className="block"><Label>Description</Label><Input name="description" defaultValue={exam.description ?? ""} /></label>
              <label className="flex h-11 items-center gap-2 text-sm"><input type="checkbox" name="is_active" defaultChecked={exam.is_active} className="size-4 accent-violet-600" />Visible to students</label>
              <Button type="submit" variant="secondary">Save</Button>
            </form>
          </Card>

          <div className="space-y-5">
            {sections.map((s) => (
              <Card key={s.id} className="p-5">
                <div className="flex items-center gap-2">
                  <form action={renameSection} className="flex-1">
                    <input type="hidden" name="id" value={s.id} /><input type="hidden" name="exam" value={exam.code} />
                    <input name="name" defaultValue={s.name} aria-label="Section name" className="w-full rounded-lg bg-transparent px-2 py-1.5 text-lg font-semibold tracking-tight hover:bg-wash focus:bg-wash focus:outline-none" />
                  </form>
                  <Move table="syllabus_sections" id={s.id} exam={exam.code} />
                  <form action={deleteSection}>
                    <input type="hidden" name="id" value={s.id} /><input type="hidden" name="exam" value={exam.code} />
                    <button className="h-8 rounded-lg px-3 text-sm text-bad hover:bg-bad/10">Delete</button>
                  </form>
                </div>
                <ul className="mt-2 divide-y divide-line/60">
                  {topics.filter((t) => t.section_id === s.id && !t.parent_id).map((t) => <TopicRow key={t.id} t={t} depth={0} />)}
                </ul>
                <form action={addTopic} className="mt-4 flex flex-wrap gap-2">
                  <input type="hidden" name="section_id" value={s.id} /><input type="hidden" name="exam" value={exam.code} />
                  <Input name="name" placeholder="Add a topic or subtopic…" required className="min-w-48 flex-1" />
                  <Select name="parent_id" defaultValue="" aria-label="Parent topic" className="w-full sm:w-56">
                    <option value="">Top-level topic</option>
                    {topics.filter((t) => t.section_id === s.id && !t.parent_id).map((t) => <option key={t.id} value={t.id}>Inside: {t.name}</option>)}
                  </Select>
                  <Button type="submit" variant="secondary">Add</Button>
                </form>
              </Card>
            ))}
          </div>

          <form action={addSection} className="mt-6 flex gap-2">
            <input type="hidden" name="exam_id" value={exam.id} /><input type="hidden" name="exam" value={exam.code} />
            <Input name="name" placeholder="New section (e.g. Algorithms, VARC)…" required className="max-w-md" />
            <Button type="submit">Add section</Button>
          </form>
        </>
      )}
    </>
  );
}
