"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import clsx from "clsx";
import { Logo } from "@/components/logo";
import { btn } from "@/components/ui";
import { signOut } from "@/app/(auth)/actions";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/exams", label: "Exams" },
  { href: "/courses", label: "Courses" },
  { href: "/app/practice", label: "Practice" },
];

export function HeaderClient({ name, signedIn, staff }: { name: string; signedIn: boolean; staff: boolean }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const active = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));

  return (
    <header className="sticky top-0 z-40 border-b border-night-line bg-night">
      <div className="mx-auto flex h-16 max-w-[90rem] items-center justify-between gap-4 px-4 sm:px-10">
        <Link href="/" aria-label={`${name} home`}><Logo name={name} /></Link>

        <nav aria-label="Main" className="hidden h-full items-stretch gap-1 md:flex">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} aria-current={active(l.href) ? "page" : undefined}
              className={clsx("relative flex items-center px-4 text-sm font-medium transition-colors",
                active(l.href) ? "text-white after:absolute after:inset-x-4 after:bottom-0 after:h-0.5 after:bg-violet-500" : "text-night-ink hover:text-white")}>
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {signedIn ? (
            <>
              {staff && <Link href="/admin" className="px-3 text-sm font-medium text-night-ink hover:text-white">Admin</Link>}
              <Link href="/app" className="px-3 text-sm font-medium text-night-ink hover:text-white">My learning</Link>
              <form action={signOut}><button className="px-3 text-sm font-medium text-night-ink hover:text-white">Sign out</button></form>
            </>
          ) : (
            <>
              <Link href="/login" className="px-3 text-sm font-semibold text-white">Log in</Link>
              <Link href="/signup" className={btn({ variant: "inverse", size: "sm" })}>Get started</Link>
            </>
          )}
        </div>

        <button type="button" aria-label="Menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}
          className="flex size-10 items-center justify-center rounded-lg text-white hover:bg-white/10 md:hidden">
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </div>

      {open && (
        <div className="border-t border-night-line bg-night px-4 pb-5 pt-2 md:hidden">
          <nav className="flex flex-col">
            {LINKS.map((l) => (
              <Link key={l.href} href={l.href} onClick={() => setOpen(false)}
                className={clsx("rounded-lg px-3 py-3 text-base font-medium", active(l.href) ? "text-white" : "text-night-ink")}>{l.label}</Link>
            ))}
          </nav>
          <div className="mt-3 flex flex-col gap-2 border-t border-night-line pt-4">
            {signedIn ? (
              <>
                {staff && <Link href="/admin" onClick={() => setOpen(false)} className={btn({ variant: "outlineDark" })}>Admin</Link>}
                <Link href="/app" onClick={() => setOpen(false)} className={btn({ variant: "inverse" })}>My learning</Link>
                <form action={signOut}><button className={clsx(btn({ variant: "outlineDark" }), "w-full")}>Sign out</button></form>
              </>
            ) : (
              <>
                <Link href="/login" onClick={() => setOpen(false)} className={btn({ variant: "outlineDark" })}>Log in</Link>
                <Link href="/signup" onClick={() => setOpen(false)} className={btn({ variant: "inverse" })}>Get started</Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
