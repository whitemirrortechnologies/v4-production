import Link from "next/link";
import { CourseCard } from "@/components/course-card";
import { LinkButton } from "@/components/ui";
import { getCourses, getExams } from "@/lib/catalog";

export const revalidate = 60;

export default async function Home() {
  const [exams, courses] = await Promise.all([getExams(), getCourses()]);
  return (
    <main>
      <section className="glow-violet">
        <div className="mx-auto max-w-4xl px-5 pb-24 pt-20 text-center sm:pt-28">
          <p className="rise text-sm font-medium text-violet-600">GATE CS/IT · CAT</p>
          <h1 className="rise mt-4 text-5xl font-semibold leading-[1.05] tracking-tight sm:text-7xl" style={{ animationDelay: "60ms" }}>
            Learn. Practice.<br /><span className="text-grade">Crack it.</span>
          </h1>
          <p className="rise mx-auto mt-6 max-w-xl text-lg text-ink-2" style={{ animationDelay: "120ms" }}>
            Video courses, topic-wise practice and full-length mock tests, in one calm place.
          </p>
          <div className="rise mt-9 flex flex-wrap justify-center gap-3" style={{ animationDelay: "180ms" }}>
            <LinkButton href="/courses" size="lg">Browse courses</LinkButton>
            <LinkButton href="/signup" size="lg" variant="secondary">Create free account</LinkButton>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-16">
        <h2 className="text-3xl font-semibold tracking-tight">Pick your exam</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {exams.map((e) => (
            <Link
              key={e.id}
              href={`/exams/${e.code.toLowerCase()}`}
              className="group rounded-[var(--radius-card)] border border-line bg-wash p-8 transition-[box-shadow,transform] duration-300 ease-[var(--ease-apple)] hover:-translate-y-0.5 hover:shadow-lift"
            >
              <p className="text-4xl font-semibold tracking-tight">{e.code.replace("_", " ")}</p>
              <p className="mt-2 text-ink-2">{e.name}</p>
              <p className="mt-6 text-sm font-medium text-violet-600">Explore →</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-8">
        <div className="grid gap-px overflow-hidden rounded-[var(--radius-card)] border border-line bg-line sm:grid-cols-3">
          {[
            ["Learn", "Distraction-free video lectures that remember where you stopped."],
            ["Practice", "Topic-wise questions with past-year papers. Timed or untimed."],
            ["Test", "Full-length mocks under real exam conditions, with detailed analysis."],
          ].map(([t, d]) => (
            <div key={t} className="bg-paper p-8">
              <p className="text-xl font-semibold tracking-tight">{t}</p>
              <p className="mt-2 text-ink-3">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {courses.length > 0 && (
        <section className="mx-auto max-w-6xl px-5 py-16">
          <div className="flex items-end justify-between">
            <h2 className="text-3xl font-semibold tracking-tight">Latest courses</h2>
            <Link href="/courses" className="text-sm font-medium text-violet-600">View all →</Link>
          </div>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {courses.slice(0, 6).map((c) => <CourseCard key={c.id} course={c} />)}
          </div>
        </section>
      )}
    </main>
  );
}
