import Link from "next/link";
import { CourseCard } from "@/components/course-card";
import type { CSSProperties } from "react";
import { Arrow, btn, Eyebrow } from "@/components/ui";
import { getCourses, getExamInfo, getExamSummaries } from "@/lib/catalog";
import { getViewer } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

const delay = (ms: number) => ({ "--d": `${ms}ms` }) as CSSProperties;

const CHIPS: Record<string, string[]> = { CAT: ["VARC", "DILR", "Quant"] };
const SUB: Record<string, string> = { CAT: "Common Admission Test · IIMs and top B-schools" };

const LOOP = [
  ["Learn", "Structured courses", "Subject → chapter → lecture, and resume exactly where you stopped."],
  ["Practice", "Topic-wise practice", "Instant explanations. Timed mode for pressure, untimed for depth."],
  ["Test", "Real exam conditions", "Sectional and full mocks with the real marking scheme and timers."],
  ["Analyze", "Measured progress", "Accuracy by topic and one clear recommendation for what to do next."],
];
const FAQ = [
  ["Is there free content?", "Yes. Most courses have a few free lectures, tests and practice questions so you can try before you buy."],
  ["How do payments work?", "Pick a course, apply a coupon if you have one, and enroll at checkout. Checkout currently runs in demo mode while the payment gateway is being connected."],
  ["Can I prepare on my phone?", "Yes. Every page works on mobile, and the lecture player remembers where you stopped on any device."],
  ["Do I have to finish lectures in order?", "No. The order is a recommendation. You can open any lecture you have access to."],
];

export default async function Home() {
  // Signed-in students get their personal dashboard instead of the marketing page.
  if (await getViewer()) redirect("/app");
  const [exams, courses, info] = await Promise.all([getExamSummaries(), getCourses(), getExamInfo()]);
  const first = exams[0];
  const code = (c: string) => c.split("_")[0];
  return (
    <main id="main">
      {/* ------- Hero ------- */}
      <section className="hero-light relative overflow-hidden border-b border-line">
        <div className="mx-auto grid max-w-[90rem] items-center gap-10 px-4 py-12 sm:px-10 sm:py-16 lg:grid-cols-[1.15fr_1fr] lg:py-24">
          <div>
            <div className="rise"><Eyebrow dot>Preparation system for {info.label}</Eyebrow></div>
            <h1 className="display rise mt-5" style={{ animationDelay: "60ms", fontSize: "clamp(2.25rem, 1.4rem + 4vw, 4.5rem)" }}>
              Prepare with purpose.<br /><span className="text-violet-600">Perform with confidence.</span>
            </h1>
            <p className="rise mt-5 max-w-xl text-base leading-relaxed text-ink-2 sm:text-lg" style={{ animationDelay: "120ms" }}>
              Structured courses, topic-wise practice and full-length mocks{info.single && info.first?.code === "CAT" ? " for VARC, DILR and Quant" : ""}, in one calm place.
            </p>
            <div className="rise mt-7 flex flex-col gap-3 sm:flex-row" style={{ animationDelay: "180ms" }}>
              {info.single ? (
                <>
                  <Link href="/courses" className={btn({ variant: "violet", size: "lg" })}>Browse courses <Arrow /></Link>
                  <Link href="/signup" className={btn({ variant: "outline", size: "lg" })}>Create free account</Link>
                </>
              ) : (
                info.exams.slice(0, 2).map((e, i) => (
                  <Link key={e.id} href={`/exams/${e.code.toLowerCase()}`} className={btn({ variant: i === 0 ? "violet" : "outline", size: "lg" })}>Explore {code(e.code)}</Link>
                ))
              )}
            </div>
            {first && (
              <dl className="rise mt-9 grid max-w-md grid-cols-3 gap-4 border-t border-line pt-6" style={{ animationDelay: "240ms" }}>
                {[["Courses", first.courses], [first.code === "CAT" ? "Sections" : "Subjects", first.sections], ["Tests", first.tests]].map(([k, v]) => (
                  <div key={k as string}>
                    <dd className="font-display text-2xl font-bold sm:text-3xl">{v}</dd>
                    <dt className="mt-0.5 text-xs font-medium uppercase tracking-[0.12em] text-ink-3">{k}</dt>
                  </div>
                ))}
              </dl>
            )}
          </div>

          {/* Product glimpse (desktop only, keeps the phone view short) */}
          <div className="hidden lg:block" aria-hidden>
            <div className="rise relative rounded-3xl border border-line bg-white p-6 shadow-lift" style={{ animationDelay: "160ms" }}>
              <div className="flex items-center justify-between">
                <p className="font-display text-lg font-bold">{first ? code(first.code) : "Your exam"}</p>
                <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-600">Learn · Practice · Test</span>
              </div>
              <p className="mt-1 text-sm text-ink-3">{(first && SUB[first.code]) || "Everything in one place"}</p>
              <ul className="mt-6 space-y-3">
                {((first ? CHIPS[first.code] : undefined) ?? ["Courses", "Practice", "Tests"]).map((c, i) => (
                  <li key={c} className="flex items-center gap-4 rounded-2xl border border-line bg-wash px-4 py-3.5">
                    <span className="flex size-10 items-center justify-center rounded-xl bg-violet-600 font-display text-sm font-bold text-white">{i + 1}</span>
                    <div className="flex-1"><p className="font-semibold">{c}</p><p className="text-xs text-ink-3">Lectures · Practice · Mocks</p></div>
                    <Arrow className="size-4 text-ink-4" />
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ------- Multi-exam picker (only when more than one exam is on) ------- */}
      {exams.length > 1 && (
        <section className="mx-auto max-w-[90rem] px-4 py-12 sm:px-10 lg:py-16">
          <div data-reveal suppressHydrationWarning><Eyebrow>Choose your exam</Eyebrow><h2 className="h2 mt-2">What are you preparing for?</h2></div>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {exams.map((e, i) => (
              <Link key={e.id} href={`/exams/${e.code.toLowerCase()}`} data-reveal suppressHydrationWarning style={delay(i * 80)} className="lift group flex items-center justify-between gap-4 rounded-2xl border border-line bg-white p-6">
                <div><p className="font-display text-3xl font-bold">{code(e.code)}</p><p className="mt-1 text-sm text-ink-3">{SUB[e.code] ?? e.name}</p></div>
                <span className="flex size-10 items-center justify-center rounded-full bg-violet-50 text-violet-600"><Arrow /></span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ------- The loop ------- */}
      <section id="how" className="mx-auto max-w-[90rem] px-4 py-10 sm:px-10 sm:py-14 lg:py-16">
        <div data-reveal suppressHydrationWarning className="max-w-2xl">
          <Eyebrow>Why V4</Eyebrow>
          <h2 className="h2 mt-2">Not a video library. A preparation loop.</h2>
          <p className="mt-3 text-ink-2">Learning, practice, testing and analysis connected, so every session moves your score.</p>
        </div>
        <ol className="mt-6 grid gap-3 sm:mt-8 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
          {LOOP.map(([name, title, body], i) => (
            <li key={name} data-reveal suppressHydrationWarning style={delay(i * 70)} className="flex gap-4 rounded-2xl border border-line bg-white p-4 transition-colors hover:border-violet-300 sm:block sm:p-6">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-violet-50 font-display text-sm font-bold text-violet-600">{i + 1}</span>
              <div className="sm:mt-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-violet-600">{name}</p>
                <p className="mt-0.5 font-display text-base font-bold leading-snug sm:mt-1 sm:text-lg">{title}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-3">{body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* ------- Featured courses ------- */}
      {courses.length > 0 && (
        <section className="bg-wash py-12 lg:py-20">
          <div className="mx-auto max-w-[90rem] px-4 sm:px-10">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div data-reveal suppressHydrationWarning><Eyebrow>Start learning</Eyebrow><h2 className="h2 mt-2">Featured courses</h2></div>
              <Link href="/courses" className={btn({ variant: "outline", size: "sm" })}>All courses <Arrow /></Link>
            </div>
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{courses.slice(0, 3).map((c, i) => <div key={c.id} data-reveal suppressHydrationWarning style={delay(i * 70)}><CourseCard course={c} /></div>)}</div>
          </div>
        </section>
      )}

      {/* ------- FAQ ------- */}
      <section className="mx-auto grid max-w-[90rem] gap-6 px-4 py-10 sm:px-10 sm:py-14 lg:grid-cols-[1fr_1.7fr] lg:gap-12 lg:py-16">
        <div data-reveal suppressHydrationWarning><Eyebrow>FAQ</Eyebrow><h2 className="h2 mt-2">Good questions</h2></div>
        <div data-reveal suppressHydrationWarning className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white">
          {FAQ.map(([q, a]) => (
            <details key={q} className="group">
              <summary className="flex cursor-pointer items-center justify-between gap-4 px-5 py-4 font-semibold">
                {q}
                <svg aria-hidden viewBox="0 0 16 16" className="size-4 shrink-0 text-ink-3 transition-transform duration-200 group-open:rotate-45" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M8 3v10M3 8h10" /></svg>
              </summary>
              <p className="max-w-2xl px-5 pb-5 text-sm leading-relaxed text-ink-3">{a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ------- Closing call to action ------- */}
      <section className="mx-auto max-w-[90rem] px-4 pb-10 sm:px-10 sm:pb-14 lg:pb-16">
        <div data-reveal suppressHydrationWarning className="cta-band flex flex-col items-start justify-between gap-6 rounded-3xl px-6 py-10 text-white sm:flex-row sm:items-center sm:px-12">
          <div>
            <h2 className="h2">Start with a free lecture.</h2>
            <p className="mt-2 max-w-md text-violet-100">Create a free account and try a lecture, a test and practice questions before you buy anything.</p>
          </div>
          <Link href="/signup" className={btn({ variant: "inverse", size: "lg" })}>Create free account <Arrow /></Link>
        </div>
      </section>
    </main>
  );
}
