import { notFound } from "next/navigation";
import { Badge, Card, LinkButton } from "@/components/ui";
import { getCourseBySlug, getCurriculum, priceOf } from "@/lib/catalog";
import { getViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { clock, duration, rupees } from "@/lib/format";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const course = await getCourseBySlug((await params).slug);
  return { title: course?.title ?? "Course" };
}

export default async function CoursePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const course = await getCourseBySlug(slug);
  if (!course) notFound();
  const [tree, viewer] = await Promise.all([getCurriculum(course.id), getViewer()]);

  let enrolled = false;
  if (viewer) {
    const supabase = await createClient();
    const { data } = await supabase.rpc("has_course_access", { p_course: course.id });
    enrolled = data === true && viewer.profile.role === "student";
  }
  const price = priceOf(course.product);
  const sale = course.product?.sale_price_paise != null && course.product.sale_price_paise < course.product.price_paise;
  const published = (l: { status: string }) => l.status === "published";

  return (
    <main>
      <section className="glow-violet border-b border-line">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 lg:grid-cols-[1fr_22rem]">
          <div>
            <Badge tone="violet">{course.exam.name}</Badge>
            <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">{course.title}</h1>
            {course.subtitle && <p className="mt-4 max-w-2xl text-lg text-ink-2">{course.subtitle}</p>}
            <p className="mt-6 text-sm text-ink-3">
              {course.stats?.lecture_count ?? 0} lectures · {duration(course.stats?.total_duration_seconds)}
              {(course.stats?.test_count ?? 0) > 0 && <> · {course.stats!.test_count} tests</>}
            </p>
          </div>
          <Card className="h-fit p-6 shadow-lift lg:sticky lg:top-24">
            <p className="text-3xl font-semibold tracking-tight">
              {price == null ? "Not on sale" : rupees(price)}
              {sale && <span className="ml-2 text-base font-normal text-ink-3 line-through">{rupees(course.product!.price_paise)}</span>}
            </p>
            {course.product?.validity_days && <p className="mt-1 text-sm text-ink-3">{course.product.validity_days} days of access</p>}
            <div className="mt-5">
              {enrolled ? (
                <LinkButton href={`/app/learn/${course.slug}`} size="lg" variant="violet" className="w-full">Continue learning</LinkButton>
              ) : course.product ? (
                <LinkButton href={`/checkout/${course.product.id}`} size="lg" variant="violet" className="w-full">
                  {price === 0 ? "Enroll for free" : "Enroll now"}
                </LinkButton>
              ) : null}
            </div>
            <ul className="mt-5 space-y-2 text-sm text-ink-2">
              <li>All lectures, notes and course tests</li>
              <li>Topic-wise practice for {course.exam.name}</li>
              {(course.stats?.free_preview_count ?? 0) > 0 && <li>{course.stats!.free_preview_count} free preview lecture(s)</li>}
            </ul>
          </Card>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-5 py-12">
        {course.description && (
          <div className="mb-12 max-w-3xl whitespace-pre-line text-ink-2">{course.description}</div>
        )}
        <h2 className="text-2xl font-semibold tracking-tight">Curriculum</h2>
        <div className="mt-6 space-y-6">
          {tree.map((s) => (
            <section key={s.id}>
              <h3 className="mb-3 text-lg font-semibold">{s.title}</h3>
              <div className="space-y-3">
                {s.modules.map((m) => (
                  <details key={m.id} className="group rounded-2xl border border-line" open={tree.length === 1 && s.modules.length === 1}>
                    <summary className="cursor-pointer list-none px-5 py-4 font-medium marker:hidden">
                      <span className="mr-2 inline-block text-ink-3 transition-transform group-open:rotate-90">›</span>{m.title}
                    </summary>
                    <div className="border-t border-line px-5 py-3">
                      {m.chapters.map((c) => (
                        <div key={c.id} className="py-2">
                          <p className="text-sm font-medium text-ink-2">{c.title}</p>
                          <ul className="mt-1">
                            {c.lectures.filter(published).map((l) => (
                              <li key={l.id} className="cv-auto flex items-center justify-between gap-3 border-b border-line/60 py-2.5 text-sm last:border-0">
                                <span className="flex items-center gap-2">
                                  <span aria-hidden className="text-ink-3">{enrolled || l.is_free_preview ? "▶" : "🔒"}</span>
                                  {enrolled || l.is_free_preview ? (
                                    <a className="hover:underline" href={`/app/learn/${course.slug}/${l.id}`}>{l.title}</a>
                                  ) : l.title}
                                  {l.is_free_preview && <Badge tone="violet">Free</Badge>}
                                </span>
                                <span className="text-ink-3">{l.duration_seconds ? clock(l.duration_seconds) : ""}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </details>
                ))}
              </div>
            </section>
          ))}
          {!tree.length && <p className="text-ink-3">The curriculum will appear here soon.</p>}
        </div>
      </div>
    </main>
  );
}
