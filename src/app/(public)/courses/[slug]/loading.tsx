import { Loading, Sk, SkNight } from "@/components/skeleton";

export default function CourseLoading() {
  return (
    <main>
      <Loading label="Loading course" />
      <section className="bg-night">
        <div className="mx-auto grid max-w-[90rem] gap-10 px-4 py-14 sm:px-10 lg:grid-cols-[1fr_24rem] lg:py-20">
          <div><SkNight className="h-3 w-40" /><SkNight className="mt-6 h-14 w-3/4" /><SkNight className="mt-5 h-5 w-1/2" /><SkNight className="mt-10 h-10 w-80" /></div>
          <div className="rounded-2xl bg-white p-6"><Sk className="h-10 w-32" /><Sk className="mt-6 h-12 w-full" /><Sk className="mt-5 h-3 w-2/3" /><Sk className="mt-3 h-3 w-1/2" /></div>
        </div>
      </section>
      <div className="mx-auto max-w-[90rem] space-y-3 px-4 py-14 sm:px-10">{[0, 1, 2].map((i) => <Sk key={i} className="h-14 w-full max-w-3xl" />)}</div>
    </main>
  );
}
