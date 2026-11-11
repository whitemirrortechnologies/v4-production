import Link from "next/link";
import { notFound } from "next/navigation";
import { getViewer, requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { QuestionEditor } from "@/components/question-editor";
import { ActionForm, Submit } from "@/components/forms";
import { deleteQuestion } from "../actions";
import type { Exam, Question, QuestionGroup, QuestionKey, QuestionOption, Section, Topic } from "@/lib/types";

export const metadata = { title: "Question · Admin" };

export default async function QuestionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireStaff(`/admin/questions/${id}`);
  const isAdmin = (await getViewer())?.profile.role === "admin";
  const supabase = await createClient();
  const isNew = id === "new";

  const [{ data: exams }, { data: sections }, { data: groups }, q] = await Promise.all([
    supabase.from("exams").select("*").order("position"),
    supabase.from("syllabus_sections").select("*, topics(*)").order("position"),
    supabase.from("question_groups").select("id,exam_id,title,content").order("created_at", { ascending: false }),
    isNew ? Promise.resolve(null) : Promise.all([
      supabase.from("questions").select("*").eq("id", id).maybeSingle<Question>(),
      supabase.from("question_options").select("*").eq("question_id", id).order("position"),
      supabase.from("question_keys").select("*").eq("question_id", id).maybeSingle<QuestionKey>(),
    ]),
  ]);
  if (!isNew && !q?.[0].data) notFound();
  const topics = ((sections ?? []) as (Section & { topics: Topic[] })[]).flatMap((s) => s.topics ?? []).sort((a, b) => a.position - b.position);

  return (
    <>
      <Link href="/admin/questions" className="text-sm text-ink-3 hover:text-ink">← Questions</Link>
      <div className="mb-8 mt-3 flex flex-wrap items-center justify-between gap-3">
        <h1 className="h2">{isNew ? "New question" : "Edit question"}</h1>
        {!isNew && (
          <ActionForm action={deleteQuestion} confirm="Delete this question? If it's used in a test, archive it instead." confirmLabel="Delete">
            <input type="hidden" name="id" value={id} /><Submit size="sm" variant="danger">Delete</Submit>
          </ActionForm>
        )}
      </div>
      <QuestionEditor
        key={id}
        exams={(exams ?? []) as Exam[]} sections={(sections ?? []) as Section[]} topics={topics} groups={(groups ?? []) as QuestionGroup[]}
        question={q?.[0].data ?? null} options={(q?.[1].data ?? []) as QuestionOption[]} keyRow={q?.[2].data ?? null} isAdmin={isAdmin} />
    </>
  );
}
