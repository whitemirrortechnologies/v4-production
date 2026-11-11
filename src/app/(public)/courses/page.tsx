import Link from "next/link";
import { delay } from "@/lib/motion";
import clsx from "clsx";
import { CourseCard } from "@/components/course-card";
import { Button, Empty, Eyebrow, Input, Select } from "@/components/ui";
import { getCourses, getExams, getMine, priceOf } from "@/lib/catalog";
import { getViewer } from "@/lib/auth";

export const metadata = { title: "Courses" };
export const dynamic = "force-dynamic";

type SP = { q?: string; exam?: string; price?: string; sort?: string };

export default async function CoursesPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const viewer = await getViewer();
  const [all, exams, mine] = await Promise.all([getCourses(), getExams(), getMine(viewer?.user.id ?? null)]);
  const term = sp.q?.trim().toLowerCase();

  let list = all.filter((c) => (!sp.exam || c.exam.code.toLowerCase() === sp.exam.toLowerCase())
    && (!term || `${c.title} ${c.subtitle ?? ""}`.toLowerCase().includes(term))
    && (sp.price !== "free" || priceOf(c.product) === 0)
    && (sp.price !== "paid" || (priceOf(c.product) ?? 0) > 0));
  const owned = all.filter((c) => mine.courseIds.has(c.id));
  list = list.filter((c) => !mine.courseIds.has(c.id));
  if (sp.sort === "price-asc") list = [...list].sort((a, b) => (priceOf(a.product) ?? 0) - (priceOf(b.product) ?? 0));
  if (sp.sort === "price-desc") list = [...list].sort((a, b) => (priceOf(b.product) ?? 0) - (priceOf(a.product) ?? 0));

  const tab = (label: string, code?: string) => {
    const params = new URLSearchParams({ ...(sp.q ? { q: sp.q } : {}), ...(sp.price ? { price: sp.price } : {}), ...(sp.sort ? { sort: sp.sort } : {}), ...(code ? { exam: code.toLowerCase() } : {}) });
    const on = (sp.exam ?? "").toLowerCase() === (code ?? "").toLowerCase();
    return <Link key={label} href={`/courses?${params}`} className={clsx("rounded-md px-4 py-1.5 text-sm font-semibold", on ? "bg-ink text-white" : "text-ink-3 hover:text-ink")}>{label}</Link>;
  };

  return (
    <main id="main" className="mx-auto max-w-[90rem] px-4 py-16 sm:px-10">
      <Eyebrow>Courses</Eyebrow>
      <h1 className="h1 mt-3">{viewer ? "Your courses and more" : "Find your next course"}</h1>
      <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink-2">{viewer ? "Continue what you've started, or add another course to your preparation." : "Structured CAT courses for VARC, DILR and Quant. Search, filter and start with a free preview lecture."}</p>

      {owned.length > 0 && (
        <section className="mt-12">
          <h2 className="h2">Continue learning</h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {owned.map((c, i) => <div key={c.id} data-reveal style={delay((i % 3) * 70)}><CourseCard course={c} enrolled progress={mine.progress.get(c.id)} /></div>)}
          </div>
          <h2 className="h2 mt-16">Explore more</h2>
        </section>
      )}

      <form className="mt-10 flex flex-wrap items-end gap-3" action="/courses">
        {sp.exam && <input type="hidden" name="exam" value={sp.exam} />}
        <div className="relative min-w-60 flex-1">
          <svg aria-hidden viewBox="0 0 20 20" className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-ink-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="9" cy="9" r="6" /><path d="M14 14l4 4" /></svg>
          <Input name="q" defaultValue={sp.q} placeholder="Search courses, subjects…" aria-label="Search courses" className="pl-11" />
        </div>
        <label><span className="sr-only">Price</span><Select name="price" defaultValue={sp.price ?? ""} className="w-40"><option value="">Free &amp; paid</option><option value="free">Free</option><option value="paid">Paid</option></Select></label>
        <label><span className="sr-only">Sort</span><Select name="sort" defaultValue={sp.sort ?? ""} className="w-48"><option value="">Recommended</option><option value="price-asc">Price: low to high</option><option value="price-desc">Price: high to low</option></Select></label>
        <Button type="submit" variant="outline" size="lg">Apply</Button>
      </form>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-lg border border-line bg-wash p-1" role="tablist" aria-label="Exam">
          {tab("All")}{exams.map((e) => tab(e.code.split("_")[0], e.code))}
        </div>
        <p className="text-sm text-ink-3">{list.length} {list.length === 1 ? "course" : "courses"}</p>
      </div>

      <div className="mt-8">
        {list.length ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{list.map((c, i) => <div key={c.id} data-reveal style={delay((i % 3) * 70)}><CourseCard course={c} /></div>)}</div>
        ) : <Empty title={owned.length ? "You're enrolled in every course that matches" : "No courses match"}>{owned.length ? "Try another exam or clear the filters." : "Try clearing a filter or search term."}</Empty>}
      </div>
    </main>
  );
}
