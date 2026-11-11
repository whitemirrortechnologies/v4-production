import Link from "next/link";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/site-header";
import { Card, Empty, LinkButton, PageHeader } from "@/components/ui";
import { getCourses } from "@/lib/catalog";
import { CourseCard } from "@/components/course-card";
import { duration } from "@/lib/format";

export const metadata = { title: "My learning" };

export default async function Dashboard() {
  const { user, profile } = await requireViewer("/app");
  const supabase = await createClient();

  const { data: enr } = await supabase
    .from("enrollments").select("expires_at, product:products(type, course:courses(id,title,slug,subtitle))")
    .eq("user_id", user.id).eq("is_active", true);
  const one = <T,>(v: T | T[] | null | undefined) => (Array.isArray(v) ? v[0] : v) ?? null;
  type C = { id: string; title: string; slug: string; subtitle: string | null };
  const mine = (enr ?? [])
    .filter((e) => !e.expires_at || new Date(e.expires_at) > new Date())
    .map((e) => ({ course: one(one(e.product as { course: C | C[] | null } | { course: C | C[] | null }[] | null)?.course), expires: e.expires_at }))
    .filter((x): x is { course: C; expires: string | null } => !!x.course);

  const ids = mine.map((m) => m.course.id);
  const [{ data: progress }, { data: stats }, all] = await Promise.all([
    ids.length ? supabase.from("course_progress").select("*").eq("user_id", user.id).in("course_id", ids) : Promise.resolve({ data: [] }),
    ids.length ? supabase.from("course_stats").select("*").in("course_id", ids) : Promise.resolve({ data: [] }),
    getCourses(),
  ]);
  const others = all.filter((c) => !ids.includes(c.id)).slice(0, 3);

  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto max-w-[90rem] px-4 py-14 sm:px-10">
        <PageHeader eyebrow="Dashboard" title={`Hello${profile.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}`} subtitle="Pick up where you left off." />

        <div className="grid gap-3 sm:grid-cols-3">
          {[["Courses", "/courses", "Browse everything"]].map(([t, href, d]) => (
            <Link key={t} href={href} className="rounded-2xl bg-wash p-5 transition-colors hover:bg-line">
              <p className="font-semibold">{t}</p><p className="text-sm text-ink-3">{d}</p>
            </Link>
          ))}
        </div>

        <h2 className="h2 mb-6 mt-14">My courses</h2>
        {mine.length ? (
          <div className="grid gap-4 md:grid-cols-2">
            {mine.map(({ course, expires }) => {
              const p = progress?.find((x) => x.course_id === course.id);
              const s = stats?.find((x) => x.course_id === course.id);
              const total = Number(p?.total_lectures ?? s?.lecture_count ?? 0), doneN = Number(p?.completed_lectures ?? 0);
              const pct = total ? Math.round((doneN / total) * 100) : 0;
              return (
                <Card key={course.id} className="p-6">
                  <p className="text-lg font-semibold tracking-tight">{course.title}</p>
                  <p className="mt-1 text-sm text-ink-3">{doneN} of {total} lectures · {duration(s?.total_duration_seconds)}{expires && ` · until ${new Date(expires).toLocaleDateString("en-IN")}`}</p>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-wash" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                    <div className="h-full rounded-full bg-violet-500" style={{ width: `${pct}%` }} />
                  </div>
                  <LinkButton href={`/app/learn/${course.slug}${p?.last_lecture_id ? `/${p.last_lecture_id}` : ""}`} variant="violet" size="sm" className="mt-5">
                    {doneN || p ? "Continue" : "Start learning"}
                  </LinkButton>
                </Card>
              );
            })}
          </div>
        ) : <Empty title="You haven't enrolled in a course yet"><LinkButton href="/courses" className="mt-3">Browse courses</LinkButton></Empty>}

        {others.length > 0 && (
          <>
            <h2 className="h2 mb-6 mt-16">Explore more</h2>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{others.map((c) => <CourseCard key={c.id} course={c} />)}</div>
          </>
        )}
      </main>
    </>
  );
}
