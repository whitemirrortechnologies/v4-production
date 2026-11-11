import { notFound } from "next/navigation";
import { CourseCard } from "@/components/course-card";
import { Empty, PageHeader } from "@/components/ui";
import { getCourses, getExams } from "@/lib/catalog";

export const revalidate = 60;

export default async function ExamPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const exam = (await getExams()).find((e) => e.code.toLowerCase() === code.toLowerCase());
  if (!exam) notFound();
  const courses = await getCourses(exam.code);
  return (
    <main className="mx-auto max-w-6xl px-5 py-12">
      <PageHeader title={exam.name} subtitle={exam.description ?? undefined} />
      {courses.length ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{courses.map((c) => <CourseCard key={c.id} course={c} />)}</div>
      ) : (
        <Empty title="Courses coming soon" />
      )}
    </main>
  );
}
