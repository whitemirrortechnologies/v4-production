import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Badge, Card, Empty, Input, Label, PageHeader, Select } from "@/components/ui";
import { ActionForm, Submit } from "@/components/forms";
import { createCourse } from "./actions";
import { duration } from "@/lib/format";

export const metadata = { title: "Courses · Admin" };

export default async function AdminCourses() {
  await requireStaff("/admin/courses");
  const supabase = await createClient();
  const [{ data: courses }, { data: exams }, { data: stats }] = await Promise.all([
    supabase.from("courses").select("id,title,slug,status,exam:exams(name)").order("created_at", { ascending: false }),
    supabase.from("exams").select("id,name").eq("is_active", true).order("position"),
    supabase.from("course_stats").select("*"),
  ]);
  return (
    <>
      <PageHeader eyebrow="Content" title="Courses" subtitle="Create courses and build their curriculum." />

      <Card className="mb-8 p-5">
        <ActionForm action={createCourse} className={`grid gap-4 ${(exams ?? []).length > 1 ? "sm:grid-cols-[1fr_14rem_auto]" : "sm:grid-cols-[1fr_auto]"} sm:items-end`}>
          <label className="block"><Label>New course title</Label><Input name="title" placeholder="Quant: Arithmetic Core" required /></label>
          {(exams ?? []).length > 1
            ? <label className="block"><Label>Exam</Label><Select name="exam_id" required>{(exams ?? []).map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}</Select></label>
            : <input type="hidden" name="exam_id" value={exams?.[0]?.id ?? ""} />}
          <Submit>Create course</Submit>
        </ActionForm>
      </Card>

      {courses?.length ? (
        <div className="space-y-3">
          {courses.map((c) => {
            const s = stats?.find((x) => x.course_id === c.id);
            const exam = (Array.isArray(c.exam) ? c.exam[0] : c.exam) as { name: string } | null;
            return (
              <Link key={c.id} href={`/admin/courses/${c.id}`}
                className="cv-auto flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line p-5 transition-colors hover:bg-wash">
                <div>
                  <p className="font-medium">{c.title}</p>
                  <p className="mt-1 text-sm text-ink-3">{exam?.name} · {s?.lecture_count ?? 0} lectures · {duration(s?.total_duration_seconds)}</p>
                </div>
                <Badge tone={c.status === "published" ? "good" : "neutral"}>{c.status}</Badge>
              </Link>
            );
          })}
        </div>
      ) : <Empty title="No courses yet">Create your first one above.</Empty>}
    </>
  );
}
