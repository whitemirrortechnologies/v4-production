import Link from "next/link";
import clsx from "clsx";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Badge, Card, Input, Label, PageHeader, Select } from "@/components/ui";
import { ActionForm, IconSubmit, InlineEdit, Submit } from "@/components/forms";
import { IconDown, IconPlus, IconTrash, IconUp } from "@/components/icons";
import type { Exam, Section, Topic } from "@/lib/types";
import {
  addExam, addSection, addTopic, deleteSection, deleteTopic, moveItem, moveTopicQuestions,
  renameSection, renameTopic, updateExam,
} from "./actions";

export const metadata = { title: "Syllabus · Admin" };

function Move({ table, id }: { table: string; id: string }) {
  return (
    <>
      {[-1, 1].map((dir) => (
        <ActionForm action={moveItem} key={dir}>
          <input type="hidden" name="table" value={table} /><input type="hidden" name="id" value={id} /><input type="hidden" name="dir" value={dir} />
          <IconSubmit label={dir < 0 ? "Move up" : "Move down"}>{dir < 0 ? <IconUp size={15} /> : <IconDown size={15} />}</IconSubmit>
        </ActionForm>
      ))}
    </>
  );
}

export default async function SyllabusPage({ searchParams }: { searchParams: Promise<{ exam?: string }> }) {
  await requireStaff("/admin/syllabus");
  const { exam: examParam } = await searchParams;
  const supabase = await createClient();

  const { data: examRows } = await supabase.from("exams").select("*").order("position");
  const exams = (examRows ?? []) as Exam[];
  const exam = exams.find((e) => e.code === examParam) ?? exams[0];

  let sections: Section[] = [], topics: Topic[] = [];
  const counts = new Map<string, number>();
  if (exam) {
    const [{ data: s }, { data: q }] = await Promise.all([
      supabase.from("syllabus_sections").select("*, topics(*)").eq("exam_id", exam.id).order("position"),
      supabase.from("questions").select("topic_id").eq("exam_id", exam.id),
    ]);
    sections = (s ?? []) as Section[];
    topics = ((s ?? []) as (Section & { topics: Topic[] })[]).flatMap((x) => x.topics ?? []).sort((a, b) => a.position - b.position);
    (q ?? []).forEach((r) => counts.set(r.topic_id, (counts.get(r.topic_id) ?? 0) + 1));
  }
  const total = (t: Topic) => (counts.get(t.id) ?? 0) + topics.filter((c) => c.parent_id === t.id).reduce((n, c) => n + (counts.get(c.id) ?? 0), 0);

  const TopicRow = ({ t, depth }: { t: Topic; depth: number }) => {
    const n = counts.get(t.id) ?? 0;
    const others = topics.filter((x) => x.id !== t.id);
    const kids = topics.filter((c) => c.parent_id === t.id);
    return (
      <li className={depth ? "ml-5 border-l border-line pl-3" : ""}>
        <div className="group/row flex items-center gap-1 rounded-lg hover:bg-wash/70">
          <InlineEdit action={renameTopic} name="name" value={t.name} label="Topic name" fields={{ id: t.id }} className={depth ? "text-sm" : "text-[15px] font-medium"} />
          <Badge tone={(depth ? n : total(t)) ? "violet" : "neutral"}>{depth ? n : total(t)} Q</Badge>
          <span className="flex opacity-60 transition-opacity group-hover/row:opacity-100 focus-within:opacity-100">
            <Move table="topics" id={t.id} />
            {n > 0 ? (
              <details className="relative">
                <summary className="flex size-8 cursor-pointer items-center justify-center rounded-lg text-ink-4 hover:bg-bad/10 hover:text-bad" aria-label="Delete topic"><IconTrash size={15} /></summary>
                <div className="absolute right-0 z-20 mt-1 w-72 rounded-2xl border border-line bg-paper p-4 shadow-lift">
                  <p className="text-sm font-semibold">{n} question(s) use this topic</p>
                  <p className="mt-1 text-xs text-ink-3">Move them first, then delete the topic.</p>
                  <ActionForm action={moveTopicQuestions} className="mt-3 space-y-2">
                    <input type="hidden" name="id" value={t.id} />
                    <Select name="to" defaultValue="" required aria-label="Move questions to">
                      <option value="" disabled>Move to…</option>
                      {others.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                    </Select>
                    <Submit size="sm" variant="secondary">Move questions</Submit>
                  </ActionForm>
                </div>
              </details>
            ) : (
              <ActionForm action={deleteTopic} confirm={`Delete the topic "${t.name}"${kids.length ? " and its subtopics" : ""}?`}>
                <input type="hidden" name="id" value={t.id} /><IconSubmit label="Delete topic" danger><IconTrash size={15} /></IconSubmit>
              </ActionForm>
            )}
          </span>
        </div>
        {kids.length > 0 && <ul>{kids.map((c) => <TopicRow key={c.id} t={c} depth={depth + 1} />)}</ul>}
      </li>
    );
  };

  return (
    <>
      <PageHeader eyebrow="Content" title="Syllabus" subtitle="Exams, sections, topics and subtopics. Questions are tagged against these." />

      <div className="hide-scrollbar mb-6 flex items-center gap-2 overflow-x-auto pb-1">
        {exams.map((e) => (
          <Link key={e.id} href={`/admin/syllabus?exam=${e.code}`}
            className={clsx("whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold", e.id === exam?.id ? "bg-ink text-white" : "bg-wash text-ink-2 hover:bg-line")}>
            {e.name}{!e.is_active && " · hidden"}
          </Link>
        ))}
        <details className="relative">
          <summary className="flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-lg border border-dashed border-line-strong px-4 py-2 text-sm font-semibold text-ink-3 hover:bg-wash"><IconPlus size={14} />New exam</summary>
          <ActionForm action={addExam} resetOnSuccess className="absolute left-0 z-20 mt-2 w-80 space-y-3 rounded-2xl border border-line bg-paper p-5 shadow-lift">
            <label className="block"><Label hint="e.g. XAT">Code</Label><Input name="code" required /></label>
            <label className="block"><Label>Name</Label><Input name="name" required /></label>
            <label className="block"><Label>Description</Label><Input name="description" /></label>
            <Submit size="sm">Add exam</Submit>
          </ActionForm>
        </details>
      </div>

      {!exam ? <Card className="p-8 text-center text-ink-3">No exams yet. Add one above.</Card> : (
        <div className="max-w-4xl">
          <Card className="mb-6 p-5">
            <ActionForm action={updateExam} className="grid gap-4 sm:grid-cols-[1fr_1.4fr] sm:items-end">
              <input type="hidden" name="id" value={exam.id} />
              <label className="block"><Label>Exam name</Label><Input name="name" defaultValue={exam.name} required /></label>
              <label className="block"><Label>Description</Label><Input name="description" defaultValue={exam.description ?? ""} /></label>
              <label className="flex items-center gap-2.5 text-sm font-medium"><input type="checkbox" name="is_active" defaultChecked={exam.is_active} className="size-4 accent-violet-600" />Visible to students</label>
              <div className="sm:text-right"><Submit size="sm" variant="secondary">Save exam</Submit></div>
            </ActionForm>
          </Card>

          <div className="space-y-5">
            {sections.map((s) => (
              <Card key={s.id} className="p-4 sm:p-5">
                <div className="group/row flex items-center gap-1">
                  <InlineEdit action={renameSection} name="name" value={s.name} label="Section name" fields={{ id: s.id }} className="font-display text-lg font-bold tracking-tight" />
                  <span className="flex opacity-60 transition-opacity group-hover/row:opacity-100 focus-within:opacity-100">
                    <Move table="syllabus_sections" id={s.id} />
                    <ActionForm action={deleteSection} confirm={`Delete the section "${s.name}" and all its topics?`}>
                      <input type="hidden" name="id" value={s.id} /><IconSubmit label="Delete section" danger><IconTrash size={15} /></IconSubmit>
                    </ActionForm>
                  </span>
                </div>
                <ul className="mt-1 space-y-0.5">{topics.filter((t) => t.section_id === s.id && !t.parent_id).map((t) => <TopicRow key={t.id} t={t} depth={0} />)}</ul>
                <ActionForm action={addTopic} resetOnSuccess className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
                  <input type="hidden" name="section_id" value={s.id} />
                  <Input name="name" placeholder="New topic or subtopic…" required className="h-10 min-w-48 flex-1" />
                  <Select name="parent_id" defaultValue="" aria-label="Place under" className="h-10 w-full sm:w-56">
                    <option value="">Top-level topic</option>
                    {topics.filter((t) => t.section_id === s.id && !t.parent_id).map((t) => <option key={t.id} value={t.id}>Under: {t.name}</option>)}
                  </Select>
                  <Submit size="sm" variant="secondary" className="h-10">Add</Submit>
                </ActionForm>
              </Card>
            ))}
          </div>

          <Card className="mt-5 border-dashed p-4">
            <ActionForm action={addSection} resetOnSuccess className="flex gap-2">
              <input type="hidden" name="exam_id" value={exam.id} />
              <Input name="name" placeholder="New section (e.g. VARC, DILR, QA)…" required className="h-10" />
              <Submit size="sm" className="h-10">Add section</Submit>
            </ActionForm>
          </Card>
          <p className="mt-3 text-xs text-ink-3">Click any name to rename it. Changes save when you press Enter or click away.</p>
        </div>
      )}
    </>
  );
}
