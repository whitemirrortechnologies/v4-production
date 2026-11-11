import { Loading, Sk } from "@/components/skeleton";

export default function LearnLoading() {
  return (
    <div>
      <Loading label="Loading lecture" />
      <div className="h-14 bg-night" />
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-6 lg:grid-cols-[1fr_22rem]">
        <div><div className="aspect-video w-full animate-pulse rounded-2xl bg-night-4" /><Sk className="mt-6 h-7 w-2/3" /><Sk className="mt-3 h-4 w-40" /></div>
        <div className="space-y-2">{Array.from({ length: 8 }).map((_, i) => <Sk key={i} className="h-10 w-full" />)}</div>
      </div>
    </div>
  );
}
