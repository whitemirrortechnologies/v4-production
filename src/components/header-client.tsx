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

export function HeaderClient({ name, signedIn, staff, initial = "?" }: { name: string; signedIn: boolean; staff: boolean; initial?: string }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const LINKS = signedIn ? USER_LINKS : GUEST_LINKS;
  const active = (href: string) => (href === "/" || href === "/app" ? path === href || (href === "/app" && path.startsWith("/app/learn")) : path.startsWith(href));

  return (
    <header className="sticky top-0 z-40 border-b border-night-line bg-night">
      <div className="mx-auto flex h-16 max-w-[90rem] items-center justify-between gap-4 px-4 sm:px-10">
        <Link href={signedIn ? "/app" : "/"} aria-label={`${name} home`}><Logo name={name} /></Link>

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
            <details className="relative" onToggle={(e) => setMenu((e.currentTarget as HTMLDetailsElement).open)} open={menu}>
              <summary aria-label="Account menu" className="flex size-9 cursor-pointer items-center justify-center rounded-full bg-white text-sm font-bold text-ink hover:bg-line">{initial}</summary>
              <div className="pop absolute right-0 mt-2 w-52 origin-top-right overflow-hidden rounded-xl border border-night-line bg-night-3 py-1.5 text-sm shadow-lift" onClick={() => setMenu(false)}>
                <Link href="/app" className="block px-4 py-2 text-night-ink hover:bg-white/5 hover:text-white">My learning</Link>
                <Link href="/app/settings" className="block px-4 py-2 text-night-ink hover:bg-white/5 hover:text-white">Settings</Link>
                {staff && <Link href="/admin" className="block px-4 py-2 text-night-ink hover:bg-white/5 hover:text-white">Admin console</Link>}
                <form action={signOut} className="mt-1 border-t border-night-line pt-1"><button className="block w-full px-4 py-2 text-left text-night-ink hover:bg-white/5 hover:text-white">Sign out</button></form>
              </div>
            </details>
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
                <Link href="/app/settings" onClick={() => setOpen(false)} className={btn({ variant: "outlineDark" })}>Settings</Link>
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
