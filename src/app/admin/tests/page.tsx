import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Badge, Card, Empty, Input, Label, LinkButton, PageHeader, Select } from "@/components/ui";
import { ActionForm, Submit } from "@/components/forms";
import { createTest } from "./actions";

export const metadata = { title: "Tests · Admin" };
const KIND = { full_mock: "Full mock", sectional: "Sectional", topic_test: "Topic test", pyq_paper: "PYQ paper" } as const;

export default async function TestsAdmin() {
  await requireStaff("/admin/tests");
  const supabase = await createClient();
  const [{ data: tests }, { data: exams }] = await Promise.all([
    supabase.from("tests").select("id,title,kind,status,duration_minutes,is_free,exam:exams(name),test_questions(count)").order("created_at", { ascending: false }),
    supabase.from("exams").select("id,name").eq("is_active", true).order("position"),
  ]);
  return (
    <>
      <PageHeader eyebrow="Content" title="Tests" subtitle="Mocks, sectionals, topic tests and past papers." action={<LinkButton href="/admin/series" variant="outline" size="sm">Test series</LinkButton>} />
      <Card className="mb-8 p-5">
        <ActionForm action={createTest} className={`grid gap-4 ${(exams ?? []).length > 1 ? "sm:grid-cols-[1fr_12rem_10rem_8rem_auto]" : "sm:grid-cols-[1fr_10rem_8rem_auto]"} sm:items-end`}>
          <label className="block"><Label>New test title</Label><Input name="title" placeholder="CAT Full Mock 1" required /></label>
          {(exams ?? []).length > 1
            ? <label className="block"><Label>Exam</Label><Select name="exam_id">{(exams ?? []).map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}</Select></label>
            : <input type="hidden" name="exam_id" value={exams?.[0]?.id ?? ""} />}
          <label className="block"><Label>Type</Label><Select name="kind">{Object.entries(KIND).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></label>
          <label className="block"><Label hint="min">Duration</Label><Input name="duration_minutes" type="number" min={1} placeholder="120" /></label>
          <Submit>Create</Submit>
        </ActionForm>
      </Card>
      {tests?.length ? (
        <div className="overflow-hidden rounded-2xl border border-line bg-paper">
          {tests.map((t) => {
            const exam = (Array.isArray(t.exam) ? t.exam[0] : t.exam) as { name: string } | null;
            const n = (t.test_questions as { count: number }[])?.[0]?.count ?? 0;
            return (
              <Link key={t.id} href={`/admin/tests/${t.id}`} className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4 last:border-0 hover:bg-wash/60">
                <div>
                  <p className="font-semibold">{t.title}</p>
                  <p className="mt-1 text-sm text-ink-3">{exam?.name} · {KIND[t.kind as keyof typeof KIND]} · {n} questions · {t.duration_minutes} min</p>
                </div>
                <span className="flex gap-2">{t.is_free && <Badge tone="violet">Free</Badge>}<Badge tone={t.status === "published" ? "good" : "neutral"}>{t.status}</Badge></span>
              </Link>
            );
          })}
        </div>
      ) : <Empty title="No tests yet">Create your first one above.</Empty>}
    </>
  );
}
