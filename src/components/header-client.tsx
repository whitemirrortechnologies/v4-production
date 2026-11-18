"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import clsx from "clsx";
import { Logo } from "@/components/logo";
import { btn } from "@/components/ui";
import { signOut } from "@/app/(auth)/actions";

const GUEST_LINKS = [
  { href: "/", label: "Home" },
  { href: "/exams", label: "Exams" },
  { href: "/courses", label: "Courses" },
];
const USER_LINKS = [
  { href: "/app", label: "Dashboard" },
  { href: "/courses", label: "Courses" },
  { href: "/app/practice", label: "Practice" },
  { href: "/app/tests", label: "Tests" },
];

export function HeaderClient({ name, signedIn, staff, showExams = false, initial = "?" }: { name: string; signedIn: boolean; staff: boolean; showExams?: boolean; initial?: string }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const LINKS = signedIn ? USER_LINKS : GUEST_LINKS.filter((l) => showExams || l.href !== "/exams");
  const active = (href: string) => (href === "/" || href === "/app" ? path === href || (href === "/app" && path.startsWith("/app/learn")) : path.startsWith(href));

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white/85 backdrop-blur-md supports-[backdrop-filter]:bg-white/75">
      <div className="mx-auto flex h-[4.5rem] max-w-[90rem] items-center justify-between gap-4 px-4 sm:px-10">
        <Link href={signedIn ? "/app" : "/"} aria-label={`${name} home`} className="flex items-center"><Logo name={name} className="h-14" /></Link>

        <nav aria-label="Main" className="hidden h-full items-stretch gap-1 md:flex">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} aria-current={active(l.href) ? "page" : undefined}
              className={clsx("relative flex items-center px-4 text-sm font-medium transition-colors",
                active(l.href) ? "text-ink after:absolute after:inset-x-4 after:bottom-0 after:h-0.5 after:bg-violet-600" : "text-ink-3 hover:text-ink")}>
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {signedIn ? (
            <details className="relative" onToggle={(e) => setMenu((e.currentTarget as HTMLDetailsElement).open)} open={menu}>
              <summary aria-label="Account menu" className="flex size-9 cursor-pointer items-center justify-center rounded-full bg-violet-600 text-sm font-bold text-white hover:bg-violet-500">{initial}</summary>
              <div className="pop absolute right-0 mt-2 w-52 origin-top-right overflow-hidden rounded-xl border border-line bg-white py-1.5 text-sm shadow-lift" onClick={() => setMenu(false)}>
                <Link href="/app" className="block px-4 py-2 text-ink-2 hover:bg-wash hover:text-ink">My learning</Link>
                <Link href="/app/settings" className="block px-4 py-2 text-ink-2 hover:bg-wash hover:text-ink">Settings</Link>
                {staff && <Link href="/admin" className="block px-4 py-2 text-ink-2 hover:bg-wash hover:text-ink">Admin console</Link>}
                <form action={signOut} className="mt-1 border-t border-line pt-1"><button className="block w-full px-4 py-2 text-left text-ink-2 hover:bg-wash hover:text-ink">Sign out</button></form>
              </div>
            </details>
          ) : (
            <>
              <Link href="/login" className="inline-flex h-10 items-center px-3 text-sm font-semibold text-ink hover:text-violet-600">Log in</Link>
              <Link href="/signup" className={btn({ variant: "violet", size: "sm" })}>Get started</Link>
            </>
          )}
        </div>

        <button type="button" aria-label="Menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}
          className="flex size-10 items-center justify-center rounded-lg text-ink hover:bg-wash md:hidden">
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </div>

      {open && (
        <div className="border-t border-line bg-white px-4 pb-5 pt-2 md:hidden">
          <nav className="flex flex-col">
            {LINKS.map((l) => (
              <Link key={l.href} href={l.href} onClick={() => setOpen(false)}
                className={clsx("rounded-lg px-3 py-3 text-base font-medium", active(l.href) ? "bg-violet-50 text-violet-600" : "text-ink-2")}>{l.label}</Link>
            ))}
          </nav>
          <div className="mt-3 flex flex-col gap-2 border-t border-line pt-4">
            {signedIn ? (
              <>
                {staff && <Link href="/admin" onClick={() => setOpen(false)} className={btn({ variant: "outline" })}>Admin</Link>}
                <Link href="/app" onClick={() => setOpen(false)} className={btn({ variant: "violet" })}>My learning</Link>
                <Link href="/app/settings" onClick={() => setOpen(false)} className={btn({ variant: "outline" })}>Settings</Link>
                <form action={signOut}><button className={clsx(btn({ variant: "outline" }), "w-full")}>Sign out</button></form>
              </>
            ) : (
              <>
                <Link href="/login" onClick={() => setOpen(false)} className={btn({ variant: "outline" })}>Log in</Link>
                <Link href="/signup" onClick={() => setOpen(false)} className={btn({ variant: "violet" })}>Get started</Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
