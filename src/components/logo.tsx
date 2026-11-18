import clsx from "clsx";

export function LogoMark({ className, light }: { className?: string; light?: boolean }) {
  return (
    <span aria-hidden className={clsx("relative inline-flex size-7 items-center justify-center rounded-lg text-[12px] font-extrabold tracking-tight", light ? "bg-ink text-white" : "bg-white text-ink", className)}>
      V4
      <span className="absolute -right-0.5 -top-0.5 size-1.5 rounded-full bg-violet-500" />
    </span>
  );
}
export function Logo({ name = "V4", light }: { name?: string; light?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark light={light} />
      <span className={clsx("font-display text-lg font-bold tracking-tight", light ? "text-ink" : "text-white")}>{name}</span>
    </span>
  );
}
