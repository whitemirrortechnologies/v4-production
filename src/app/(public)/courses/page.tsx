import { CourseCard } from "@/components/course-card";
import { Empty, PageHeader } from "@/components/ui";
import { getCourses } from "@/lib/catalog";

export const metadata = { title: "Courses" };
export const revalidate = 60;

export default async function CoursesPage() {
  const courses = await getCourses();
  return (
    <main className="mx-auto max-w-6xl px-5 py-12">
      <PageHeader title="Courses" subtitle="Everything you need for GATE CS/IT and CAT." />
      {courses.length ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{courses.map((c) => <CourseCard key={c.id} course={c} />)}</div>
      ) : (
        <Empty title="No courses yet">New courses are on their way.</Empty>
      )}
    </main>
  );
}
