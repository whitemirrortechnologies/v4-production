import clsx from "clsx";
import { CREDIT } from "@/lib/brand";

/** "Developed by Whitemirror Technologies" tag. `dark` for black surfaces. */
export function Credit({ dark, className }: { dark?: boolean; className?: string }) {
  const name = <span className={clsx("font-semibold", dark ? "text-white" : "text-ink")}>{CREDIT.name}</span>;
  return (
    <p className={clsx("text-center text-xs tracking-wide", dark ? "text-night-ink-2" : "text-ink-3", className)}>
      {CREDIT.text}{" "}
      {CREDIT.href ? <a href={CREDIT.href} target="_blank" rel="noreferrer" className="underline-offset-4 hover:underline">{name}</a> : name}
    </p>
  );
}
