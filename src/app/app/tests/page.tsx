import Link from "next/link";
import clsx from "clsx";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/site-header";
import { Badge, Empty, Eyebrow } from "@/components/ui";
import { IconClock, IconLock, IconChevron } from "@/components/icons";
import { getExams } from "@/lib/catalog";

export const metadata = { title: "Tests" };
const KIND: Record<string, string> = { full_mock: "Full mock", sectional: "Sectional", topic_test: "Topic test", pyq_paper: "Past paper" };

export default async function TestsHome({ searchParams }: { searchParams: Promise<{ exam?: string }> }) {
  const { user, profile } = await requireViewer("/app/tests");
  const sp = await searchParams;
  const exams = await getExams();
  const exam = exams.find((e) => e.code.toLowerCase() === sp.exam?.toLowerCase()) ?? exams.find((e) => e.id === profile.target_exam_id) ?? exams[0];
  const supabase = await createClient();
  const [{ data: tests }, { data: attempts }] = await Promise.all([
    exam ? supabase.from("tests").select("id,title,kind,duration_minutes,is_free,max_attempts,available_from,available_until,test_sections(name,duration_minutes)").eq("exam_id", exam.id).eq("status", "published").order("created_at") : Promise.resolve({ data: [] }),
    supabase.from("test_attempts").select("id,test_id,status,score,max_score,attempt_no,submitted_at").eq("user_id", user.id).order("started_at", { ascending: false }),
  ]);
  const access = Object.fromEntries(await Promise.all((tests ?? []).map(async (t) => [t.id, (await supabase.rpc("has_test_access", { p_test: t.id })).data === true] as const)));

  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto max-w-[90rem] px-4 py-14 sm:px-10">
        <Eyebrow>Tests{exam ? ` · ${exam.code.split("_")[0]}` : ""}</Eyebrow>
        <h1 className="h1 mt-3">Test under real conditions</h1>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink-2">The real marking scheme, question palette and timers, followed by a detailed analysis.</p>
        <div className="mt-8 inline-flex rounded-lg border border-line bg-wash p-1">
          {exams.map((e) => <Link key={e.id} href={`?exam=${e.code.toLowerCase()}`} className={clsx("rounded-md px-5 py-1.5 text-sm font-semibold", e.id === exam?.id ? "bg-ink text-white" : "text-ink-3 hover:text-ink")}>{e.code.split("_")[0]}</Link>)}
        </div>

        <div className="mt-8 space-y-3">
          {(tests ?? []).map((t) => {
            const mine = (attempts ?? []).filter((a) => a.test_id === t.id);
            const open = mine.find((a) => a.status === "in_progress");
            const last = mine.find((a) => a.status !== "in_progress");
            const ok = access[t.id];
            const secs = (t.test_sections as { name: string; duration_minutes: number | null }[]) ?? [];
            const timed = secs.length > 0 && secs.every((s) => s.duration_minutes);
            return (
              <Link key={t.id} href={open ? `/app/tests/attempt/${open.id}` : `/app/tests/${t.id}`}
                className="cv-auto group flex flex-wrap items-center gap-5 rounded-2xl border border-line bg-paper p-5 transition-[box-shadow,border-color] hover:border-line-strong hover:shadow-soft sm:flex-nowrap">
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-xs font-semibold text-ink-3">
                    <span className="uppercase tracking-[0.12em]">{KIND[t.kind]}</span>
                    {t.is_free && <Badge tone="violet">Free</Badge>}
                    {!ok && <span className="flex items-center gap-1"><IconLock size={12} />Locked</span>}
                  </p>
                  <p className="mt-1.5 font-display text-lg font-bold tracking-tight">{t.title}</p>
                  <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-3">
                    <span className="flex items-center gap-1.5"><IconClock size={14} />{timed ? `${secs.reduce((n, s) => n + (s.duration_minutes ?? 0), 0)} min` : `${t.duration_minutes} min`}</span>
                    <span>{secs.map((s) => s.name).join(" · ")}</span>
                  </p>
                </div>
                {last && <div className="text-right"><p className="font-display text-2xl font-bold">{Number(last.score)}<span className="text-sm font-medium text-ink-3">/{Number(last.max_score)}</span></p><p className="text-xs text-ink-3">last score</p></div>}
                <span className={clsx("flex h-10 items-center gap-1.5 rounded-lg px-4 text-sm font-semibold", open ? "bg-violet-600 text-white" : ok ? "bg-ink text-white" : "bg-wash text-ink-2")}>
                  {open ? "Resume" : !ok ? "View" : mine.length ? "Retake" : "Start"}<IconChevron size={14} />
                </span>
              </Link>
            );
          })}
          {!tests?.length && <Empty title="No tests published for this exam yet" />}
        </div>
      </main>
    </>
  );
}
