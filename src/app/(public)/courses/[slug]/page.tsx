import { notFound } from "next/navigation";
import { Badge, Card, Eyebrow, LinkButton } from "@/components/ui";
import { IconChevron, IconLock, IconPlay, IconCheck } from "@/components/icons";
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
    <main id="main">
      <section className="on-night relative overflow-hidden bg-night text-white">
        <div className="grid-bg glow-top absolute inset-0" aria-hidden />
        <div className="relative mx-auto grid max-w-[90rem] gap-10 px-4 py-14 sm:px-10 lg:grid-cols-[1fr_24rem] lg:py-20">
          <div>
            <Eyebrow dark dot>{course.exam.name}</Eyebrow>
            <h1 className="h1 mt-5 !text-[clamp(2.2rem,1.6rem+2.6vw,4rem)] text-white">{course.title}</h1>
            {course.subtitle && <p className="mt-5 max-w-2xl text-lg leading-relaxed text-[#cfcfcf]">{course.subtitle}</p>}
            <dl className="mt-8 flex flex-wrap gap-x-10 gap-y-4">
              {[["Lectures", course.stats?.lecture_count ?? 0], ["Duration", duration(course.stats?.total_duration_seconds)], ["Tests", course.stats?.test_count ?? 0]].map(([k, v]) => (
                <div key={k as string}><dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-night-ink-2">{k}</dt><dd className="mt-1 font-display text-2xl font-bold">{v}</dd></div>
              ))}
            </dl>
          </div>
          <Card className="h-fit border-night-line bg-white p-6 text-ink shadow-lift lg:sticky lg:top-24">
            <p className="font-display text-4xl font-bold tracking-tight">
              {price == null ? "Not on sale" : rupees(price)}
              {sale && <span className="ml-2 text-base font-normal text-ink-3 line-through">{rupees(course.product!.price_paise)}</span>}
            </p>
            {course.product?.validity_days && <p className="mt-1 text-sm text-ink-3">{course.product.validity_days} days of access</p>}
            <div className="mt-5">
              {enrolled ? (
                <LinkButton href={`/app/learn/${course.slug}`} size="lg" variant="violet" className="w-full">Continue learning</LinkButton>
              ) : course.product ? (
                <LinkButton href={`/checkout/${course.product.id}`} size="lg" variant="violet" className="w-full">{price === 0 ? "Enroll for free" : "Enroll now"}</LinkButton>
              ) : null}
            </div>
            <ul className="mt-5 space-y-2.5 text-sm text-ink-2">
              <li className="flex items-center gap-2"><IconCheck size={15} className="text-violet-600" />All lectures, notes and course tests</li>
              <li className="flex items-center gap-2"><IconCheck size={15} className="text-violet-600" />Topic-wise practice for {course.exam.name}</li>
              {(course.stats?.free_preview_count ?? 0) > 0 && <li className="flex items-center gap-2"><IconCheck size={15} className="text-violet-600" />{course.stats!.free_preview_count} free preview lecture(s)</li>}
            </ul>
          </Card>
        </div>
      </section>

      <div className="mx-auto max-w-[90rem] px-4 py-14 sm:px-10">
        {course.description && (
          <div className="mb-12 max-w-3xl whitespace-pre-line text-ink-2">{course.description}</div>
        )}
        <h2 className="h2">Curriculum</h2>
        <div className="mt-6 space-y-6">
          {tree.map((s) => (
            <section key={s.id}>
              <h3 className="mb-3 text-lg font-semibold">{s.title}</h3>
              <div className="space-y-3">
                {s.modules.map((m) => (
                  <details key={m.id} className="group rounded-2xl border border-line" open={tree.length === 1 && s.modules.length === 1}>
                    <summary className="flex cursor-pointer items-center px-5 py-4 font-semibold">
                      <IconChevron size={15} className="mr-2 inline-block text-ink-4 transition-transform group-open:rotate-90" />{m.title}
                    </summary>
                    <div className="border-t border-line px-5 py-3">
                      {m.chapters.map((c) => (
                        <div key={c.id} className="py-2">
                          <p className="text-sm font-medium text-ink-2">{c.title}</p>
                          <ul className="mt-1">
                            {c.lectures.filter(published).map((l) => (
                              <li key={l.id} className="cv-auto flex items-center justify-between gap-3 border-b border-line/60 py-2.5 text-sm last:border-0">
                                <span className="flex items-center gap-2">
                                  <span className="text-ink-4">{enrolled || l.is_free_preview ? <IconPlay size={13} className="text-violet-600" /> : <IconLock size={14} />}</span>
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
