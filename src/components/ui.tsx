import clsx from "clsx";
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type BtnProps = { variant?: "primary" | "secondary" | "ghost" | "violet" | "danger"; size?: "sm" | "md" | "lg" };
const btn = ({ variant = "primary", size = "md" }: BtnProps) =>
  clsx(
    "inline-flex items-center justify-center gap-2 rounded-full font-medium whitespace-nowrap select-none",
    "transition-[background-color,transform,box-shadow] duration-200 ease-[var(--ease-apple)] active:scale-[0.98]",
    "disabled:opacity-40 disabled:pointer-events-none",
    size === "sm" && "h-9 px-4 text-sm",
    size === "md" && "h-11 px-6 text-[15px]",
    size === "lg" && "h-14 px-8 text-base",
    variant === "primary" && "bg-ink text-paper hover:opacity-85",
    variant === "violet" && "bg-violet-600 text-white hover:bg-violet-500 shadow-soft",
    variant === "secondary" && "bg-wash text-ink hover:bg-line",
    variant === "ghost" && "text-ink-2 hover:bg-wash",
    variant === "danger" && "bg-bad/10 text-bad hover:bg-bad/20",
  );

export function Button({ variant, size, className, ...p }: ComponentProps<"button"> & BtnProps) {
  return <button className={clsx(btn({ variant, size }), className)} {...p} />;
}
export function LinkButton({ variant, size, className, ...p }: ComponentProps<typeof Link> & BtnProps) {
  return <Link className={clsx(btn({ variant, size }), className)} {...p} />;
}

export function Card({ className, ...p }: ComponentProps<"div">) {
  return <div className={clsx("rounded-[var(--radius-card)] border border-line bg-paper", className)} {...p} />;
}

export function Badge({ tone = "neutral", children }: { tone?: "neutral" | "violet" | "good" | "bad"; children: ReactNode }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        tone === "neutral" && "bg-wash text-ink-2",
        tone === "violet" && "bg-violet-100 text-violet-600",
        tone === "good" && "bg-good/10 text-good",
        tone === "bad" && "bg-bad/10 text-bad",
      )}
    >
      {children}
    </span>
  );
}

const field = "w-full rounded-xl border border-line bg-paper px-4 text-[15px] text-ink placeholder:text-ink-3 transition-colors focus:border-violet-500 focus:outline-none";
export function Input({ className, ...p }: ComponentProps<"input">) {
  return <input className={clsx(field, "h-11", className)} {...p} />;
}
export function Textarea({ className, ...p }: ComponentProps<"textarea">) {
  return <textarea className={clsx(field, "py-3 min-h-24", className)} {...p} />;
}
export function Select({ className, ...p }: ComponentProps<"select">) {
  return <select className={clsx(field, "h-11 pr-8", className)} {...p} />;
}
export function Label({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <span className="mb-1.5 block text-sm font-medium text-ink-2">
      {children}
      {hint && <span className="ml-2 font-normal text-ink-3">{hint}</span>}
    </span>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-2 max-w-2xl text-ink-3">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-dashed border-line px-6 py-14 text-center">
      <p className="font-medium">{title}</p>
      {children && <div className="mt-2 text-sm text-ink-3">{children}</div>}
    </div>
  );
}

export function Notice({ tone = "info", children }: { tone?: "info" | "error" | "success"; children: ReactNode }) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={clsx(
        "rounded-xl px-4 py-3 text-sm",
        tone === "info" && "bg-violet-50 text-violet-600",
        tone === "error" && "bg-bad/10 text-bad",
        tone === "success" && "bg-good/10 text-good",
      )}
    >
      {children}
    </div>
  );
}
