import Link from "next/link";
import { CourseCard } from "@/components/course-card";
import { HeroField } from "@/components/hero-field";
import type { CSSProperties } from "react";
const delay = (ms: number) => ({ "--d": `${ms}ms` }) as CSSProperties;
import { Arrow, btn, Eyebrow } from "@/components/ui";
import { getCourses, getExamSummaries } from "@/lib/catalog";
import { getViewer } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

const CHIPS: Record<string, string[]> = {
  GATE_CS: ["Concepts", "Courses", "Practice", "Tests", "Analytics"],
  CAT: ["Quant", "VARC", "DILR", "Mocks", "Analytics"],
};
const KICKER: Record<string, string> = { GATE_CS: "Engineering-focused preparation", CAT: "Aptitude-focused preparation" };
const SUB: Record<string, string> = { GATE_CS: "Graduate Aptitude Test in Engineering", CAT: "Common Admission Test" };

const LOOP = [
  ["01", "Learn", "Structured courses", "Subject → module → chapter → lecture. Always know what comes next, and resume exactly where you stopped."],
  ["02", "Practice", "Focused practice", "Topic-wise questions with instant explanations. Timed mode when you need pressure, untimed when you need depth."],
  ["03", "Test", "Real exam conditions", "Topic, sectional and full mock tests with the actual marking scheme, question palette and timers."],
  ["04", "Analyze", "Measured progress", "Accuracy by topic, section performance and one clear recommendation for what to do next."],
];
const FAQ = [
  ["Which exams does V4 support?", "GATE Computer Science & IT and CAT. Each has its own courses, syllabus-based practice and mock tests."],
  ["Is there free content?", "Yes. In most courses a few lectures, tests and practice questions are free so you can try before you buy. What is free is chosen per course."],
  ["How do payments work?", "Pick a course, apply a coupon if you have one, and enroll at checkout. Checkout currently runs in demo mode while the payment gateway is being connected."],
  ["Can I prepare on my phone?", "Yes. Every page is built mobile-first, and the lecture player remembers where you stopped on any device."],
  ["Do I have to finish lectures in order?", "No. The order is a recommendation. You can open any lecture you have access to."],
];

export default async function Home() {
  // Signed-in students get their personal dashboard instead of the marketing page.
  if (await getViewer()) redirect("/app");
  const [exams, courses] = await Promise.all([getExamSummaries(), getCourses()]);
  return (
    <main id="main">
      {/* ------- Hero ------- */}
      {/* Hero fills exactly the first screen (below the 65px header) at every window size. */}
      <section className="on-night relative flex min-h-[calc(100svh-65px)] flex-col overflow-hidden bg-night text-white">
        {/* fallback / base light, then the animated field, then a scrim that keeps text readable */}
        <div className="absolute inset-0 bg-[radial-gradient(70rem_30rem_at_50%_105%,#635bff38,transparent_70%)]" aria-hidden />
        <HeroField />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,#050505e6_0%,#050505b3_35%,transparent_60%)] lg:bg-[linear-gradient(100deg,#050505f2_0%,#050505bf_30%,#05050540_55%,transparent_75%)]" aria-hidden />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-night to-transparent" aria-hidden />
        <div className="relative mx-auto flex w-full max-w-[90rem] flex-1 items-center px-4 py-14 sm:px-10 lg:py-20">
          <div className="max-w-3xl">
            <div className="rise"><Eyebrow dark dot>Preparation system for GATE &amp; CAT</Eyebrow></div>
            <h1 className="display rise mt-6 text-white" style={{ animationDelay: "60ms" }}>
              Prepare with purpose.<br /><span className="text-[#7a7a7a]">Perform with confidence.</span>
            </h1>
            <p className="rise mt-7 max-w-xl text-lg leading-relaxed text-[#d4d4d4]" style={{ animationDelay: "120ms" }}>
              A structured preparation system for GATE, CAT and the exams you&apos;re targeting.
            </p>
            <div className="rise mt-9 flex flex-wrap gap-3" style={{ animationDelay: "180ms" }}>
              <Link href="/exams/gate_cs" className={btn({ variant: "inverse", size: "lg" })}>Explore GATE</Link>
              <Link href="/exams/cat" className={`${btn({ variant: "outlineDark", size: "lg" })} bg-night/40 backdrop-blur-sm`}>Explore CAT</Link>
            </div>
            <a href="#how" className="rise mt-8 inline-flex items-center gap-2 text-sm font-medium text-night-ink hover:text-white" style={{ animationDelay: "240ms" }}>
              See how V4 works <svg aria-hidden viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3v10M4 9l4 4 4-4" /></svg>
            </a>
          </div>
        </div>
        <div className="relative mx-auto w-full max-w-[90rem] px-4 sm:px-10">
          <ol className="hide-scrollbar flex gap-6 overflow-x-auto border-t border-night-line py-4 font-mono text-xs text-night-ink-2 sm:gap-8">
            {["Learn", "Practice", "Test", "Analyze", "Improve"].map((s, i) => (
              <li key={s} className="whitespace-nowrap"><span className="mr-2">0{i + 1}</span>{s}</li>
            ))}
          </ol>
        </div>
      </section>

      {/* ------- Exams ------- */}
      <section className="mx-auto max-w-[90rem] px-4 py-20 sm:px-10 lg:py-28">
        <div data-reveal><Eyebrow>Choose your exam</Eyebrow>
        <h2 className="h1 mt-3">What are you preparing for?</h2></div>
        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          {exams.map((e, i) => (
            <div key={e.id} data-reveal style={delay(i * 90)} className="flex">
            <article className="on-night lift relative flex w-full flex-col overflow-hidden rounded-3xl bg-night p-8 text-white sm:p-11">
              <div className="grid-bg glow-top absolute inset-0 opacity-90" aria-hidden />
              <div className="relative flex flex-1 flex-col">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-night-ink-2">{KICKER[e.code] ?? "Exam preparation"}</p>
                <p className="display mt-6" style={{ fontSize: "clamp(3.5rem, 2rem + 6vw, 6rem)" }}>{e.code.split("_")[0]}</p>
                <p className="mt-2 text-night-ink">{SUB[e.code] ?? e.name}</p>
                <ul className="mt-7 flex flex-wrap items-center gap-2 text-sm">
                  {(CHIPS[e.code] ?? ["Courses", "Practice", "Tests"]).map((c, i) => (
                    <li key={c} className="flex items-center gap-2">
                      {i > 0 && <span aria-hidden className="text-night-ink-2">→</span>}
                      <span className="rounded-full border border-night-line-2 bg-night-3 px-3.5 py-1.5 text-white">{c}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-auto flex flex-wrap items-end justify-between gap-6 pt-12">
                  <dl className="flex gap-8">
                    {[["Courses", e.courses], [e.code === "CAT" ? "Sections" : "Subjects", e.sections], ["Tests", e.tests]].map(([k, v]) => (
                      <div key={k as string}><dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-night-ink-2">{k}</dt><dd className="mt-1 font-display text-2xl font-bold">{v}</dd></div>
                    ))}
                  </dl>
                  <Link href={`/exams/${e.code.toLowerCase()}`} className={btn({ variant: "inverse" })}>Explore {e.code.split("_")[0]} <Arrow /></Link>
                </div>
              </div>
            </article>
            </div>
          ))}
        </div>
      </section>

      {/* ------- Why V4 ------- */}
      <section className="bg-wash py-20 lg:py-28">
        <div className="mx-auto grid max-w-[90rem] gap-12 px-4 sm:px-10 lg:grid-cols-[1fr_1.5fr]">
          <div data-reveal>
            <Eyebrow>Why V4</Eyebrow>
            <h2 className="h1 mt-3">Not a video library.<br />A preparation loop.</h2>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-ink-2">
              Most platforms give you content. V4 connects learning, practice, testing and analysis so every session moves your score, and you can see it move.
            </p>
          </div>
          <ol className="border-t border-line-strong">
            {LOOP.map(([n, name, title, body], i) => (
              <li key={n} data-reveal style={delay(i * 70)} className="group grid grid-cols-[6.5rem_1fr_auto] items-start gap-4 border-b border-line-strong py-7 sm:grid-cols-[9rem_1fr_auto]">
                <p className="font-mono text-lg font-bold"><span className="mr-2">{n}</span><span className="font-display">{name}</span></p>
                <div><p className="font-semibold">{title}</p><p className="mt-1.5 max-w-lg text-sm leading-relaxed text-ink-3">{body}</p></div>
                <Arrow className="mt-1 size-5 text-ink-3 transition-transform duration-500 ease-spring group-hover:translate-x-1" />
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ------- Featured courses ------- */}
      {courses.length > 0 && (
        <section className="mx-auto max-w-[90rem] px-4 py-20 sm:px-10 lg:py-28">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div data-reveal><Eyebrow>Start learning</Eyebrow><h2 className="h1 mt-3">Featured courses</h2></div>
            <Link href="/courses" className={btn({ variant: "outline" })}>All courses <Arrow /></Link>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{courses.slice(0, 6).map((c, i) => <div key={c.id} data-reveal style={delay(i * 70)}><CourseCard course={c} /></div>)}</div>
        </section>
      )}

      {/* ------- How it works ------- */}
      <section id="how" className="on-night bg-night py-20 text-white lg:py-28">
        <div className="mx-auto max-w-[90rem] px-4 sm:px-10">
          <div data-reveal><Eyebrow dark>How V4 works</Eyebrow>
          <h2 className="h1 mt-3">Three steps. Then repeat.</h2></div>
          <ol className="mt-14 grid gap-0 md:grid-cols-3">
            {[["01", "Choose your exam", "Pick GATE or CAT. V4 shapes courses, practice and tests around that goal."],
              ["02", "Follow a clear path", "Work through structured lectures, then practise each topic while it is fresh."],
              ["03", "Measure and improve", "Take tests, see exactly where marks are lost, and let V4 point you to the next step."]].map(([n, t, d]) => (
              <li key={n} data-reveal style={delay(Number(n) * 80)} className="border-t border-night-line pb-8 md:border-l md:px-8 md:first:border-l-0 md:first:pl-0">
                <span aria-hidden className="-mt-px mb-8 block h-0.5 w-12 bg-violet-500" />
                <p className="font-display text-6xl font-bold text-transparent [-webkit-text-stroke:1px_#3a3a3a]">{n}</p>
                <h3 className="mt-6 text-xl font-bold tracking-tight">{t}</h3>
                <p className="mt-2 max-w-xs leading-relaxed text-night-ink">{d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ------- FAQ ------- */}
      <section className="mx-auto grid max-w-[90rem] gap-12 px-4 py-20 sm:px-10 lg:grid-cols-[1fr_1.7fr] lg:py-28">
        <div data-reveal><Eyebrow>FAQ</Eyebrow><h2 className="h1 mt-3">Good questions</h2></div>
        <div data-reveal className="border-t border-line-strong">
          {FAQ.map(([q, a]) => (
            <details key={q} className="group border-b border-line-strong">
              <summary className="flex cursor-pointer items-center justify-between gap-4 py-5 font-semibold">
                {q}
                <svg aria-hidden viewBox="0 0 16 16" className="size-4 shrink-0 text-ink-3 transition-transform duration-200 group-open:rotate-45" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M8 3v10M3 8h10" /></svg>
              </summary>
              <p className="max-w-2xl pb-5 leading-relaxed text-ink-3">{a}</p>
            </details>
          ))}
        </div>
      </section>
    </main>
  );
}
