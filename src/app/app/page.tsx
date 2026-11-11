import Link from "next/link";
import { delay } from "@/lib/motion";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/site-header";
import { CourseArt } from "@/components/course-art";
import { CourseCard } from "@/components/course-card";
import { Arrow, btn, Eyebrow } from "@/components/ui";
import { IconPlay } from "@/components/icons";
import { getCourses, getCurriculum, getExams, getMine } from "@/lib/catalog";
import { ActionForm, Submit } from "@/components/forms";
import { setTargetExam } from "./onboarding-actions";
import { duration } from "@/lib/format";

export const metadata = { title: "My learning" };

type C = { id: string; title: string; slug: string; subtitle: string | null; exam_id: string };

export default async function Dashboard() {
  const { user, profile } = await requireViewer("/app");
  const supabase = await createClient();

  const [mine, { data: watched }, all, exams] = await Promise.all([
    getMine(user.id),
    supabase.from("lecture_progress").select("watched_seconds, completed_at").eq("user_id", user.id),
    getCourses(),
    getExams(),
  ]);
  const target = exams.length === 1 ? exams[0] : exams.find((e) => e.id === profile.target_exam_id) ?? null;
  const owned = all.filter((c) => mine.courseIds.has(c.id));
  const ids = owned.map((c) => c.id);
  const progressOf = (id: string) => mine.progress.get(id);
  const latestId = [...mine.progress.entries()].filter(([, p]) => p.last).at(-1)?.[0] ?? owned[0]?.id;
  const latestCourse = owned.find((c) => c.id === latestId) ?? null;
  const latest = latestCourse ? progressOf(latestCourse.id) : undefined;
  // Lecture titles come from the cached curriculum, so no extra database call.
  const latestLecture = latestCourse && latest?.last
    ? (await getCurriculum(latestCourse.id)).flatMap((s) => s.modules.flatMap((m) => m.chapters.flatMap((c) => c.lectures))).find((l) => l.id === latest.last) ?? null
    : null;

  const secs = (watched ?? []).reduce((n, w) => n + (w.watched_seconds ?? 0), 0);
  const completed = (watched ?? []).filter((w) => w.completed_at).length;
  const examCode = (examId: string) => exams.find((e) => e.id === examId)?.code.split("_")[0] ?? "V4";
  const others = all.filter((c) => !ids.includes(c.id) && (!target || c.exam_id === target.id)).slice(0, 3);
  const first = profile.full_name?.split(" ")[0];
  const mineList = owned.map((course) => ({ course, expires: null as string | null }));

  return (
    <>
      <SiteHeader />
      <main id="main">
        <section className="on-night relative overflow-hidden bg-night text-white">
          <div className="grid-bg glow-top absolute inset-0" aria-hidden />
          <div className="relative mx-auto grid max-w-[90rem] items-end gap-10 px-4 py-12 sm:px-10 lg:grid-cols-[1fr_28rem] lg:py-16">
            <div>
              <Eyebrow dark>Dashboard</Eyebrow>
              <h1 className="h1 mt-4">{first ? `Hello, ${first}.` : "Welcome back."}</h1>
              <dl className="mt-8 flex flex-wrap gap-x-10 gap-y-4">
                {[["Courses", owned.length], ["Lectures completed", completed], ["Time learning", secs ? duration(secs) : "0m"]].map(([k, v]) => (
                  <div key={k as string}><dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-night-ink-2">{k}</dt><dd className="mt-1 font-display text-3xl font-bold">{v}</dd></div>
                ))}
              </dl>
            </div>
            {latestCourse ? (
              <Link href={`/app/learn/${latestCourse.slug}${latestLecture ? `/${latestLecture.id}` : ""}`}
                className="lift group rounded-2xl bg-white p-6 text-ink shadow-lift">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-violet-600">Continue learning</p>
                <p className="mt-3 font-display text-xl font-bold tracking-tight">{latestCourse.title}</p>
                {latestLecture && <p className="mt-1 truncate text-sm text-ink-3">Next up: {latestLecture.title}</p>}
                <div className="mt-5 flex items-center gap-4">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-ink text-white transition-transform duration-500 ease-spring group-hover:scale-110"><IconPlay size={16} /></span>
                  <div className="min-w-0 flex-1">
                    <div className="h-1.5 overflow-hidden rounded-full bg-wash"><div className="h-full rounded-full bg-violet-500" style={{ width: `${latest?.total ? (latest.done / latest.total) * 100 : 0}%` }} /></div>
                    <p className="mt-1.5 text-xs text-ink-3">{latest?.done ?? 0} of {latest?.total ?? 0} lectures</p>
                  </div>
                </div>
              </Link>
            ) : (
              <div className="rounded-2xl border border-night-line bg-night-3 p-6">
                <p className="font-display text-xl font-bold tracking-tight">Start with a free lecture</p>
                <p className="mt-2 text-sm text-night-ink">Every course has preview lectures you can watch before you buy.</p>
                <Link href="/courses" className={`${btn({ variant: "inverse" })} mt-5`}>Browse courses <Arrow /></Link>
              </div>
            )}
          </div>
        </section>

        <section className="mx-auto max-w-[90rem] px-4 pt-10 sm:px-10">
          <div className="grid gap-3 sm:grid-cols-3">
            {[["/courses", "Courses", "Your courses and more"], [`/app/practice${target ? `?exam=${target.code.toLowerCase()}` : ""}`, "Practice", target ? `Topic-wise ${target.code.split("_")[0]} questions` : "Topic-wise questions with solutions"], [`/app/tests${target ? `?exam=${target.code.toLowerCase()}` : ""}`, "Tests", target ? `${target.code.split("_")[0]} mocks under exam conditions` : "Mocks under real exam conditions"]].map(([href, t, d]) => (
              <Link key={href} href={href} className="lift group flex items-center justify-between rounded-2xl border border-line bg-paper p-5">
                <span><span className="block font-semibold">{t}</span><span className="text-sm text-ink-3">{d}</span></span><Arrow className="text-ink-3 transition-transform group-hover:translate-x-0.5" />
              </Link>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-[90rem] px-4 py-14 sm:px-10">
          <div className="flex items-end justify-between gap-4">
            <h2 className="h2">My courses</h2>
            <Link href="/courses" className="tap text-sm font-semibold text-violet-600 hover:underline">Browse all</Link>
          </div>
          {owned.length ? (
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {mineList.map(({ course, expires }, i) => {
                const p = progressOf(course.id);
                const s = course.stats;
                const total = Number(p?.total ?? s?.lecture_count ?? 0), doneN = Number(p?.done ?? 0);
                const pct = total ? Math.round((doneN / total) * 100) : 0;
                return (
                  <div key={course.id} data-reveal style={delay((i % 3) * 70)}><Link href={`/app/learn/${course.slug}${p?.last ? `/${p.last}` : ""}`}
                    className="lift group block h-full overflow-hidden rounded-2xl border border-line bg-paper">
                    <CourseArt title={course.title} slug={course.slug} tag={examCode(course.exam_id)} className="aspect-[16/7]" />
                    <div className="p-5">
                      <p className="font-display text-lg font-bold tracking-tight">{course.title}</p>
                      <p className="mt-1 text-sm text-ink-3">{doneN} of {total} lectures · {duration(s?.total_duration_seconds)}{expires && ` · until ${new Date(expires).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`}</p>
                      <div className="mt-4 flex items-center gap-3">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-wash"><div className="h-full rounded-full bg-violet-500" style={{ width: `${pct}%` }} /></div>
                        <span className="text-xs font-semibold tabular-nums">{pct}%</span>
                      </div>
                      <p className="mt-5 flex items-center gap-1.5 text-sm font-semibold">{doneN || p ? "Continue" : "Start learning"} <Arrow className="transition-transform group-hover:translate-x-0.5" /></p>
                    </div>
                  </Link></div>
                );
              })}
            </div>
          ) : (
            <div className="mt-8 rounded-2xl border border-dashed border-line-strong px-6 py-14 text-center">
              <p className="font-semibold">You haven&apos;t enrolled in a course yet</p>
              <p className="mt-1 text-sm text-ink-3">Pick a course and start with its free preview lectures.</p>
              <Link href="/courses" className={`${btn({})} mt-5`}>Browse courses</Link>
            </div>
          )}
        </section>

        {!target && exams.length > 1 && (
          <section className="mx-auto max-w-[90rem] px-4 pb-14 sm:px-10">
            <div data-reveal className="rounded-3xl border border-line bg-wash p-6 sm:p-8">
              <p className="eyebrow">Personalise V4</p>
              <h2 className="h2 mt-2">What are you preparing for?</h2>
              <p className="mt-2 text-ink-3">We&apos;ll recommend courses, practice and tests for your exam. You can change this any time in Settings.</p>
              <div className="mt-6 flex flex-wrap gap-3">
                {exams.map((e) => (
                  <ActionForm key={e.id} action={setTargetExam}>
                    <input type="hidden" name="exam_id" value={e.id} />
                    <Submit variant="outline" size="lg">{e.name}</Submit>
                  </ActionForm>
                ))}
              </div>
            </div>
          </section>
        )}

        {others.length > 0 && (
          <section className="mx-auto max-w-[90rem] px-4 pb-20 sm:px-10">
            <h2 className="h2">{target && exams.length > 1 ? `Recommended for ${target.code.split("_")[0]}` : "Explore more"}</h2>
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{others.map((c, i) => <div key={c.id} data-reveal style={delay(i * 70)}><CourseCard course={c} /></div>)}</div>
          </section>
        )}
      </main>
    </>
  );
}
