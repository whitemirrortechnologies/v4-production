import Link from "next/link";
import clsx from "clsx";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Badge, Button, Empty, Input, LinkButton, PageHeader, Select } from "@/components/ui";
import { IconPlus } from "@/components/icons";
import { TYPE_SHORT } from "@/lib/marking";
import type { Exam, QuestionType } from "@/lib/types";

export const metadata = { title: "Questions · Admin" };
const PAGE = 40;
type SP = { exam?: string; type?: string; difficulty?: string; status?: string; pyq?: string; q?: string; section?: string; page?: string };

const plain = (s: string) => s.replace(/\$\$?[^$]*\$\$?/g, "[math]").replace(/[#*_`>!\[\]()]/g, "").replace(/\s+/g, " ").trim();

export default async function QuestionsPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requireStaff("/admin/questions");
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: examRows } = await supabase.from("exams").select("*").eq("is_active", true).order("position");
  const exams = (examRows ?? []) as Exam[];
  const exam = exams.find((e) => e.code === sp.exam) ?? exams[0];
  const page = Math.max(1, Number(sp.page) || 1);

  const { data: sections } = exam ? await supabase.from("syllabus_sections").select("id,name,topics(id)").eq("exam_id", exam.id).order("position") : { data: [] };
  let query = supabase.from("questions")
    .select("id,type,difficulty,stem,status,is_pyq,pyq_year,is_free_practice,marks,updated_at,topic:topics(name)", { count: "exact" })
    .order("updated_at", { ascending: false })
    .range((page - 1) * PAGE, page * PAGE - 1);
  if (exam) query = query.eq("exam_id", exam.id);
  if (sp.type) query = query.eq("type", sp.type);
  if (sp.difficulty) query = query.eq("difficulty", sp.difficulty);
  if (sp.status) query = query.eq("status", sp.status);
  if (sp.pyq === "1") query = query.eq("is_pyq", true);
  const term = sp.q?.replace(/[%,()]/g, "").trim();
  if (term) query = query.ilike("stem", `%${term}%`);
  const section = (sections ?? []).find((s) => s.id === sp.section);
  if (section) query = query.in("topic_id", (section.topics as { id: string }[]).map((t) => t.id).concat("00000000-0000-0000-0000-000000000000"));
  const { data: rows, count } = await query;
  const pages = Math.max(1, Math.ceil((count ?? 0) / PAGE));
  const qs = (patch: Partial<SP>) => `?${new URLSearchParams(Object.entries({ ...sp, ...patch }).filter(([, v]) => v) as [string, string][])}`;

  return (
    <>
      <PageHeader eyebrow="Content" title="Questions" subtitle="The bank used by practice and tests. Past-year questions carry their year."
        action={<div className="flex gap-2"><LinkButton href={`/admin/questions/groups?exam=${exam?.code ?? ""}`} variant="outline" size="sm">Passages</LinkButton><LinkButton href="/admin/questions/new" size="sm"><IconPlus size={14} />New question</LinkButton></div>} />

      <div className="hide-scrollbar mb-5 flex gap-2 overflow-x-auto">
        {exams.map((e) => <Link key={e.id} href={`?exam=${e.code}`} className={clsx("whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold", e.id === exam?.id ? "bg-ink text-white" : "bg-wash text-ink-2 hover:bg-line")}>{e.name}</Link>)}
      </div>

      <form className="mb-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_0.8fr_0.8fr_0.8fr_auto_auto]">
        <input type="hidden" name="exam" value={exam?.code ?? ""} />
        <Input name="q" defaultValue={sp.q} placeholder="Search question text…" aria-label="Search" className="h-11" />
        <Select name="section" defaultValue={sp.section ?? ""} aria-label="Section" className="h-11"><option value="">All sections</option>{(sections ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select>
        <Select name="type" defaultValue={sp.type ?? ""} aria-label="Type" className="h-11"><option value="">All types</option>{(["mcq", "msq", "nat", "tita"] as QuestionType[]).map((t) => <option key={t} value={t}>{TYPE_SHORT[t]}</option>)}</Select>
        <Select name="difficulty" defaultValue={sp.difficulty ?? ""} aria-label="Difficulty" className="h-11"><option value="">Any level</option><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option></Select>
        <Select name="status" defaultValue={sp.status ?? ""} aria-label="Status" className="h-11"><option value="">Any status</option><option value="published">Published</option><option value="draft">Draft</option><option value="archived">Archived</option></Select>
        <label className="flex h-11 items-center gap-2 whitespace-nowrap px-1 text-sm font-medium"><input type="checkbox" name="pyq" value="1" defaultChecked={sp.pyq === "1"} className="size-4 accent-violet-600" />PYQ only</label>
        <Button type="submit" variant="outline" className="h-11">Filter</Button>
      </form>

      <p className="mb-3 text-sm text-ink-3">{count ?? 0} question{count === 1 ? "" : "s"}</p>
      {rows?.length ? (
        <div className="overflow-hidden rounded-2xl border border-line bg-paper">
          {rows.map((r) => {
            const topic = (Array.isArray(r.topic) ? r.topic[0] : r.topic) as { name: string } | null;
            return (
              <Link key={r.id} href={`/admin/questions/${r.id}`} className="cv-auto flex items-start gap-4 border-b border-line px-5 py-4 last:border-0 hover:bg-wash/60">
                <span className="mt-0.5 w-12 shrink-0 font-mono text-xs font-bold text-violet-600">{TYPE_SHORT[r.type as QuestionType]}</span>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-[15px]">{plain(r.stem) || "Untitled question"}</p>
                  <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-3">
                    <span>{topic?.name}</span><span className="capitalize">{r.difficulty}</span><span>+{r.marks}</span>
                    {r.is_pyq && <span className="font-semibold text-ink-2">PYQ {r.pyq_year}</span>}
                    {r.is_free_practice && <span className="font-semibold text-violet-600">Free practice</span>}
                  </p>
                </div>
                <Badge tone={r.status === "published" ? "good" : "neutral"}>{r.status}</Badge>
              </Link>
            );
          })}
        </div>
      ) : <Empty title="No questions here yet"><LinkButton href="/admin/questions/new" size="sm" className="mt-3">Write the first one</LinkButton></Empty>}

      {pages > 1 && (
        <nav className="mt-6 flex items-center justify-center gap-2" aria-label="Pages">
          {page > 1 && <LinkButton href={qs({ page: String(page - 1) })} variant="outline" size="sm">← Previous</LinkButton>}
          <span className="px-3 text-sm text-ink-3">Page {page} of {pages}</span>
          {page < pages && <LinkButton href={qs({ page: String(page + 1) })} variant="outline" size="sm">Next →</LinkButton>}
        </nav>
      )}
    </>
  );
}
