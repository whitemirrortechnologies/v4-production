import { CardGridSkeleton, Loading, Sk } from "@/components/skeleton";

export default function PublicLoading() {
  return (
    <main className="mx-auto max-w-[90rem] px-4 py-16 sm:px-10">
      <Loading />
      <Sk className="h-3 w-24" /><Sk className="mt-4 h-12 w-2/3 max-w-xl" /><Sk className="mt-5 h-5 w-1/2 max-w-lg" />
      <div className="mt-12"><CardGridSkeleton /></div>
    </main>
  );
}
