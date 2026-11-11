import Link from "next/link";
import clsx from "clsx";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, Input, Label, PageHeader, Textarea } from "@/components/ui";
import { ActionForm, Submit } from "@/components/forms";
import { Rich } from "@/components/rich";
import { deleteGroup, saveGroup } from "../actions";
import type { Exam, QuestionGroup } from "@/lib/types";

export const metadata = { title: "Passages · Admin" };

export default async function GroupsPage({ searchParams }: { searchParams: Promise<{ exam?: string }> }) {
  await requireStaff("/admin/questions/groups");
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: examRows } = await supabase.from("exams").select("*").order("position");
  const exams = (examRows ?? []) as Exam[];
  const exam = exams.find((e) => e.code === sp.exam) ?? exams[0];
  const { data } = exam ? await supabase.from("question_groups").select("*").eq("exam_id", exam.id).order("created_at", { ascending: false }) : { data: [] };
  const groups = (data ?? []) as QuestionGroup[];

  return (
    <>
      <Link href="/admin/questions" className="text-sm text-ink-3 hover:text-ink">← Questions</Link>
      <div className="mt-3"><PageHeader title="Passages & data sets" subtitle="Shared text for reading comprehension, DILR sets or common-data questions. Attach questions to them in the question editor." /></div>
      <div className="mb-6 flex gap-2">{exams.map((e) => <Link key={e.id} href={`?exam=${e.code}`} className={clsx("rounded-lg px-4 py-2 text-sm font-semibold", e.id === exam?.id ? "bg-ink text-white" : "bg-wash text-ink-2 hover:bg-line")}>{e.name}</Link>)}</div>
      {exam && (
        <div className="grid max-w-5xl gap-5">
          <Card className="p-5">
            <p className="mb-4 font-semibold">New passage</p>
            <ActionForm action={saveGroup} resetOnSuccess className="space-y-4">
              <input type="hidden" name="exam_id" value={exam.id} />
              <label className="block"><Label hint="internal name">Title</Label><Input name="title" placeholder="RC — Climate policy (CAT 2023 Slot 1)" required /></label>
              <label className="block"><Label hint="Markdown + LaTeX">Text</Label><Textarea name="content" rows={6} required className="font-mono text-sm" /></label>
              <Submit>Add passage</Submit>
            </ActionForm>
          </Card>
          {groups.map((g) => (
            <Card key={g.id} className="p-5">
              <details>
                <summary className="flex cursor-pointer items-center justify-between gap-3"><span className="font-semibold">{g.title}</span><span className="text-sm text-violet-600">Edit</span></summary>
                <ActionForm action={saveGroup} className="mt-4 space-y-4">
                  <input type="hidden" name="id" value={g.id} />
                  <Input name="title" defaultValue={g.title} required aria-label="Title" />
                  <Textarea name="content" defaultValue={g.content} rows={8} required aria-label="Text" className="font-mono text-sm" />
                  <Submit size="sm">Save</Submit>
                </ActionForm>
                <ActionForm action={deleteGroup} confirm="Delete this passage? Questions attached to it keep their text but lose the passage." className="mt-3">
                  <input type="hidden" name="id" value={g.id} /><Submit size="sm" variant="danger">Delete</Submit>
                </ActionForm>
              </details>
              <div className="mt-3 max-h-40 overflow-hidden text-sm text-ink-2 [mask-image:linear-gradient(to_bottom,black_60%,transparent)]"><Rich text={g.content} /></div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
