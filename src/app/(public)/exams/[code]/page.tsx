import { notFound } from "next/navigation";
import { delay } from "@/lib/motion";
import { CourseCard } from "@/components/course-card";
import { Empty, Eyebrow } from "@/components/ui";
import { getCourses, getExams } from "@/lib/catalog";

export const revalidate = 60;

export default async function ExamPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const exam = (await getExams()).find((e) => e.code.toLowerCase() === code.toLowerCase());
  if (!exam) notFound();
  const courses = await getCourses(exam.code);
  return (
    <main id="main">
      <section className="on-night relative overflow-hidden bg-night text-white">
        <div className="grid-bg glow-top absolute inset-0" aria-hidden />
        <div className="relative mx-auto max-w-[90rem] px-4 py-16 sm:px-10 lg:py-24">
          <Eyebrow dark dot>{exam.code.split("_")[0]} preparation</Eyebrow>
          <h1 className="display mt-5">{exam.name}</h1>
          {exam.description && <p className="mt-6 max-w-2xl text-lg leading-relaxed text-[#cfcfcf]">{exam.description}</p>}
        </div>
      </section>
      <section className="mx-auto max-w-[90rem] px-4 py-16 sm:px-10">
        <h2 className="h2">Courses</h2>
        <div className="mt-8">
          {courses.length ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{courses.map((c, i) => <div key={c.id} data-reveal style={delay((i % 3) * 70)}><CourseCard course={c} /></div>)}</div>
          ) : <Empty title="Courses coming soon" />}
        </div>
      </section>
    </main>
  );
}
