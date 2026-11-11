import { Loading, Sk } from "@/components/skeleton";

export default function AdminLoading() {
  return (
    <div className="max-w-4xl">
      <Loading />
      <Sk className="h-3 w-20" /><Sk className="mt-4 h-10 w-64" /><Sk className="mt-4 h-4 w-96 max-w-full" />
      <div className="mt-10 space-y-4">{[0, 1, 2].map((i) => <Sk key={i} className="h-28 w-full rounded-2xl" />)}</div>
    </div>
  );
}
