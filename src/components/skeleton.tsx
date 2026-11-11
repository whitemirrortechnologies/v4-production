import clsx from "clsx";

export function Sk({ className }: { className?: string }) {
  return <div aria-hidden className={clsx("animate-pulse rounded-lg bg-wash", className)} />;
}
export function SkNight({ className }: { className?: string }) {
  return <div aria-hidden className={clsx("animate-pulse rounded-lg bg-night-4", className)} />;
}
export function CardGridSkeleton({ n = 6 }: { n?: number }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-2xl border border-line">
          <Sk className="aspect-[16/9] rounded-none" />
          <div className="space-y-3 p-5"><Sk className="h-3 w-24" /><Sk className="h-5 w-3/4" /><Sk className="h-3 w-1/2" /><Sk className="mt-6 h-5 w-20" /></div>
        </div>
      ))}
    </div>
  );
}
export function Loading({ label = "Loading" }: { label?: string }) {
  return <span className="sr-only" role="status">{label}…</span>;
}
