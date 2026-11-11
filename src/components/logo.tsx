import clsx from "clsx";

export function LogoMark({ className }: { className?: string }) {
  return (
    <span aria-hidden className={clsx("relative inline-flex size-7 items-center justify-center rounded-lg bg-white text-[12px] font-extrabold tracking-tight text-ink", className)}>
      V4
      <span className="absolute -right-0.5 -top-0.5 size-1.5 rounded-full bg-violet-500" />
    </span>
  );
}
export function Logo({ name = "V4" }: { name?: string }) {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark />
      <span className="font-display text-lg font-bold tracking-tight text-white">{name}</span>
    </span>
  );
}
