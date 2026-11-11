import { Loading, Sk } from "@/components/skeleton";

export default function AppLoading() {
  return (
    <>
      <div className="h-16 bg-night" />
      <main className="mx-auto max-w-[90rem] px-4 py-14 sm:px-10">
        <Loading />
        <Sk className="h-3 w-24" /><Sk className="mt-4 h-12 w-72" />
        <div className="mt-10 grid gap-4 md:grid-cols-2">{[0, 1].map((i) => <Sk key={i} className="h-44 rounded-2xl" />)}</div>
      </main>
    </>
  );
}
