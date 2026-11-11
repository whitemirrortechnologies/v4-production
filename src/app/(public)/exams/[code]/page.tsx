import { notFound } from "next/navigation";
import { delay } from "@/lib/motion";
import { CourseCard } from "@/components/course-card";
import { Empty, Eyebrow } from "@/components/ui";
import { getCourses, getExams, getMine } from "@/lib/catalog";
import { getViewer } from "@/lib/auth";
import Link from "next/link";
import { btn } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function ExamPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const exam = (await getExams()).find((e) => e.code.toLowerCase() === code.toLowerCase());
  if (!exam) notFound();
  const viewer = await getViewer();
  const [courses, mine] = await Promise.all([getCourses(exam.code), getMine(viewer?.user.id ?? null)]);
  const owned = courses.filter((c) => mine.courseIds.has(c.id));
  const short = exam.code.split("_")[0];
  return (
    <main id="main">
      <section className="on-night relative overflow-hidden bg-night text-white">
        <div className="grid-bg glow-top absolute inset-0" aria-hidden />
        <div className="relative mx-auto max-w-[90rem] px-4 py-16 sm:px-10 lg:py-24">
          <Eyebrow dark dot>{exam.code.split("_")[0]} preparation</Eyebrow>
          <h1 className="display mt-5">{exam.name}</h1>
          {exam.description && <p className="mt-6 max-w-2xl text-lg leading-relaxed text-[#cfcfcf]">{exam.description}</p>}
          {viewer ? (
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href={`/app/practice?exam=${short.toLowerCase()}`} className={btn({ variant: "inverse", size: "lg" })}>Practise {short}</Link>
              <Link href={`/app/tests?exam=${short.toLowerCase()}`} className={btn({ variant: "outlineDark", size: "lg" })}>{short} tests</Link>
              {owned.length > 0 && <p className="self-center text-sm text-night-ink">You&apos;re enrolled in {owned.length} {short} course{owned.length === 1 ? "" : "s"}.</p>}
            </div>
          ) : (
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href={`/signup?next=/exams/${exam.code.toLowerCase()}`} className={btn({ variant: "inverse", size: "lg" })}>Start free</Link>
              <Link href="/login" className={btn({ variant: "outlineDark", size: "lg" })}>Log in</Link>
            </div>
          )}
        </div>
      </section>
      <section className="mx-auto max-w-[90rem] px-4 py-16 sm:px-10">
        <h2 className="h2">Courses</h2>
        <div className="mt-8">
          {courses.length ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{[...owned, ...courses.filter((c) => !mine.courseIds.has(c.id))].map((c, i) => <div key={c.id} data-reveal style={delay((i % 3) * 70)}><CourseCard course={c} enrolled={mine.courseIds.has(c.id)} progress={mine.progress.get(c.id)} /></div>)}</div>
          ) : <Empty title="Courses coming soon" />}
        </div>
      </section>
    </main>
  );
}
