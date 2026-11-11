import Link from "next/link";
import { delay } from "@/lib/motion";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/site-header";
import { CourseArt } from "@/components/course-art";
import { CourseCard } from "@/components/course-card";
import { Arrow, btn, Eyebrow } from "@/components/ui";
import { IconPlay } from "@/components/icons";
import { getCourses } from "@/lib/catalog";
import { duration } from "@/lib/format";

export const metadata = { title: "My learning" };

type C = { id: string; title: string; slug: string; subtitle: string | null; exam_id: string };

export default async function Dashboard() {
  const { user, profile } = await requireViewer("/app");
  const supabase = await createClient();
  const one = <T,>(v: T | T[] | null | undefined) => (Array.isArray(v) ? v[0] : v) ?? null;

  const [{ data: enr }, { data: watched }, all] = await Promise.all([
    supabase.from("enrollments").select("expires_at, product:products(type, course:courses(id,title,slug,subtitle,exam_id))").eq("user_id", user.id).eq("is_active", true),
    supabase.from("lecture_progress").select("watched_seconds, completed_at").eq("user_id", user.id),
    getCourses(),
  ]);
  const mine = (enr ?? [])
    .filter((e) => !e.expires_at || new Date(e.expires_at) > new Date())
    .map((e) => ({ course: one(one(e.product as { course: C | C[] | null } | { course: C | C[] | null }[] | null)?.course), expires: e.expires_at }))
    .filter((x): x is { course: C; expires: string | null } => !!x.course);

  const ids = mine.map((m) => m.course.id);
  const [{ data: progress }, { data: stats }] = await Promise.all([
    ids.length ? supabase.from("course_progress").select("*").eq("user_id", user.id).in("course_id", ids) : Promise.resolve({ data: [] as never[] }),
    ids.length ? supabase.from("course_stats").select("*").in("course_id", ids) : Promise.resolve({ data: [] as never[] }),
  ]);
  const latest = [...(progress ?? [])].sort((a, b) => String(b.last_activity_at).localeCompare(String(a.last_activity_at)))[0];
  const latestCourse = latest && mine.find((m) => m.course.id === latest.course_id)?.course;
  const { data: latestLecture } = latest?.last_lecture_id
    ? await supabase.from("lectures").select("id,title").eq("id", latest.last_lecture_id).maybeSingle()
    : { data: null };

  const secs = (watched ?? []).reduce((n, w) => n + (w.watched_seconds ?? 0), 0);
  const completed = (watched ?? []).filter((w) => w.completed_at).length;
  const examCode = (examId: string) => all.find((c) => c.exam_id === examId)?.exam.code.split("_")[0] ?? "V4";
  const others = all.filter((c) => !ids.includes(c.id)).slice(0, 3);
  const first = profile.full_name?.split(" ")[0];

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
                {[["Courses", mine.length], ["Lectures completed", completed], ["Time learning", secs ? duration(secs) : "0m"]].map(([k, v]) => (
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
                    <div className="h-1.5 overflow-hidden rounded-full bg-wash"><div className="h-full rounded-full bg-violet-500" style={{ width: `${Number(latest.total_lectures) ? (Number(latest.completed_lectures) / Number(latest.total_lectures)) * 100 : 0}%` }} /></div>
                    <p className="mt-1.5 text-xs text-ink-3">{latest.completed_lectures} of {latest.total_lectures} lectures</p>
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
            {[["/courses", "Courses", "Browse every course"], ["/app/practice", "Practice", "Topic-wise questions with solutions"], ["/app/tests", "Tests", "Mocks under real exam conditions"]].map(([href, t, d]) => (
              <Link key={href} href={href} className="lift group flex items-center justify-between rounded-2xl border border-line bg-paper p-5">
                <span><span className="block font-semibold">{t}</span><span className="text-sm text-ink-3">{d}</span></span><Arrow className="text-ink-3 transition-transform group-hover:translate-x-0.5" />
              </Link>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-[90rem] px-4 py-14 sm:px-10">
          <div className="flex items-end justify-between gap-4">
            <h2 className="h2">My courses</h2>
            <Link href="/courses" className="text-sm font-semibold text-violet-600 hover:underline">Browse all</Link>
          </div>
          {mine.length ? (
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {mine.map(({ course, expires }, i) => {
                const p = progress?.find((x) => x.course_id === course.id);
                const s = stats?.find((x) => x.course_id === course.id);
                const total = Number(p?.total_lectures ?? s?.lecture_count ?? 0), doneN = Number(p?.completed_lectures ?? 0);
                const pct = total ? Math.round((doneN / total) * 100) : 0;
                return (
                  <div key={course.id} data-reveal style={delay((i % 3) * 70)}><Link href={`/app/learn/${course.slug}${p?.last_lecture_id ? `/${p.last_lecture_id}` : ""}`}
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

        {others.length > 0 && (
          <section className="mx-auto max-w-[90rem] px-4 pb-20 sm:px-10">
            <h2 className="h2">Explore more</h2>
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{others.map((c, i) => <div key={c.id} data-reveal style={delay(i * 70)}><CourseCard course={c} /></div>)}</div>
          </section>
        )}
      </main>
    </>
  );
}
