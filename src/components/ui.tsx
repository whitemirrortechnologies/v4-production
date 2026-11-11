import clsx from "clsx";
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type BtnProps = {
  variant?: "primary" | "secondary" | "ghost" | "violet" | "danger" | "inverse" | "outline" | "outlineDark";
  size?: "sm" | "md" | "lg";
};
export const btn = ({ variant = "primary", size = "md" }: BtnProps) =>
  clsx(
    "inline-flex items-center justify-center gap-2 rounded-lg font-semibold whitespace-nowrap select-none",
    "transition-[background-color,border-color,transform,box-shadow] duration-500 ease-spring active:scale-[0.96] active:duration-100 active:ease-out",
    "disabled:opacity-40 disabled:pointer-events-none",
    size === "sm" && "h-9 px-4 text-[13px]",
    size === "md" && "h-11 px-5 text-sm",
    size === "lg" && "h-12 px-6 text-[15px]",
    variant === "primary" && "bg-ink text-white hover:bg-[#222]",
    variant === "inverse" && "bg-white text-ink hover:bg-line",
    variant === "violet" && "bg-violet-600 text-white hover:bg-violet-500 hover:shadow-glow",
    variant === "secondary" && "bg-wash text-ink hover:bg-line",
    variant === "outline" && "border border-line-strong bg-paper text-ink hover:bg-wash",
    variant === "outlineDark" && "border border-night-line-2 text-white hover:bg-white/10",
    variant === "ghost" && "text-ink-2 hover:bg-wash",
    variant === "danger" && "bg-bad/10 text-bad hover:bg-bad/20",
  );

export function Button({ variant, size, className, ...p }: ComponentProps<"button"> & BtnProps) {
  return <button className={clsx(btn({ variant, size }), className)} {...p} />;
}
export function LinkButton({ variant, size, className, ...p }: ComponentProps<typeof Link> & BtnProps) {
  return <Link className={clsx(btn({ variant, size }), className)} {...p} />;
}

export function Arrow({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 16 16" className={clsx("size-4", className)} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 8h10M9 4l4 4-4 4" />
    </svg>
  );
}

export function Card({ className, ...p }: ComponentProps<"div">) {
  return <div className={clsx("rounded-2xl border border-line bg-paper", className)} {...p} />;
}

export function Eyebrow({ children, dark, dot }: { children: ReactNode; dark?: boolean; dot?: boolean }) {
  return (
    <p className={clsx("eyebrow flex items-center gap-2", dark && "eyebrow-night")}>
      {dot && <span aria-hidden className="size-2 rounded-full bg-violet-500 shadow-[0_0_0_4px_#635bff33]" />}
      {children}
    </p>
  );
}

export function Badge({ tone = "neutral", children }: { tone?: "neutral" | "violet" | "good" | "bad" | "dark"; children: ReactNode }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        tone === "neutral" && "bg-wash text-ink-2",
        tone === "violet" && "bg-violet-50 text-violet-600",
        tone === "good" && "bg-good/10 text-good",
        tone === "bad" && "bg-bad/10 text-bad",
        tone === "dark" && "border border-night-line-2 bg-night-3 text-white",
      )}
    >
      {children}
    </span>
  );
}

const field =
  "w-full rounded-xl border border-line-strong bg-paper px-4 text-[15px] text-ink placeholder:text-ink-4 transition-[border-color,box-shadow] focus:border-violet-500 focus:shadow-[0_0_0_3px_#635bff26] focus:outline-none";
export function Input({ className, ...p }: ComponentProps<"input">) {
  return <input className={clsx(field, "h-12", className)} {...p} />;
}
export function Textarea({ className, ...p }: ComponentProps<"textarea">) {
  return <textarea className={clsx(field, "min-h-24 py-3", className)} {...p} />;
}
export function Select({ className, ...p }: ComponentProps<"select">) {
  return <select className={clsx(field, "h-12 pr-8", className)} {...p} />;
}
export function Label({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <span className="mb-1.5 block text-sm font-semibold text-ink">
      {children}
      {hint && <span className="ml-2 font-normal text-ink-3">{hint}</span>}
    </span>
  );
}

export function PageHeader({ title, subtitle, action, eyebrow }: { title: string; subtitle?: string; action?: ReactNode; eyebrow?: string }) {
  return (
    <div className="mb-10 flex flex-wrap items-end justify-between gap-5">
      <div>
        {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
        <h1 className="h1">{title}</h1>
        {subtitle && <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink-2">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-line-strong px-6 py-14 text-center">
      <p className="font-semibold">{title}</p>
      {children && <div className="mt-2 text-sm text-ink-3">{children}</div>}
    </div>
  );
}

export function Notice({ tone = "info", children }: { tone?: "info" | "error" | "success"; children: ReactNode }) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={clsx(
        "rounded-xl px-4 py-3 text-sm font-medium",
        tone === "info" && "bg-violet-50 text-violet-600",
        tone === "error" && "bg-bad/10 text-bad",
        tone === "success" && "bg-good/10 text-good",
      )}
    >
      {children}
    </div>
  );
}
