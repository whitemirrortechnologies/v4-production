import Link from "next/link";
import { delay } from "@/lib/motion";
import { Arrow, btn, Eyebrow } from "@/components/ui";
import { getExamInfo, getExamSummaries } from "@/lib/catalog";
import { redirect } from "next/navigation";

export const metadata = { title: "Exams" };
export const dynamic = "force-dynamic";

export default async function ExamsPage() {
  const info = await getExamInfo();
  if (info.first && info.single) redirect(`/exams/${info.first.code.toLowerCase()}`);
  const exams = await getExamSummaries();
  return (
    <main id="main" className="mx-auto max-w-[90rem] px-4 py-16 sm:px-10">
      <Eyebrow>Exams</Eyebrow>
      <h1 className="h1 mt-3">Choose your exam</h1>
      <p className="mt-4 max-w-2xl text-lg text-ink-2">Every exam has its own courses, syllabus-based practice and mock tests.</p>
      <div className="mt-12 grid gap-6 lg:grid-cols-2">
        {exams.map((e, i) => (
          <div key={e.id} data-reveal style={delay(i * 90)} className="flex"><Link href={`/exams/${e.code.toLowerCase()}`} className="on-night lift group w-full relative overflow-hidden rounded-3xl bg-night p-8 text-white sm:p-11">
            <div className="grid-bg glow-top absolute inset-0" aria-hidden />
            <div className="relative">
              <p className="display" style={{ fontSize: "clamp(3.5rem, 2rem + 6vw, 6rem)" }}>{e.code.split("_")[0]}</p>
              <p className="mt-2 text-night-ink">{e.name}</p>
              {e.description && <p className="mt-4 max-w-md text-sm leading-relaxed text-night-ink-2">{e.description}</p>}
              <div className="mt-10 flex items-center justify-between">
                <p className="text-sm text-night-ink">{e.courses} courses · {e.sections} {e.code === "CAT" ? "sections" : "subjects"} · {e.tests} tests</p>
                <span className={btn({ variant: "inverse", size: "sm" })}>Explore <Arrow /></span>
              </div>
            </div>
          </Link></div>
        ))}
      </div>
    </main>
  );
}
