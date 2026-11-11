import Link from "next/link";
import { env } from "@/lib/env";
import { getViewer } from "@/lib/auth";
import { HeaderClient } from "@/components/header-client";
import { Logo } from "@/components/logo";
import { Credit } from "@/components/credit";

export async function SiteHeader() {
  const viewer = await getViewer().catch(() => null);
  return <HeaderClient name={env.siteName} signedIn={!!viewer} staff={!!viewer && viewer.profile.role !== "student"}
    initial={(viewer?.profile.full_name ?? viewer?.profile.email ?? "?").trim().charAt(0).toUpperCase()} />;
}

export async function SiteFooter() {
  const viewer = await getViewer().catch(() => null);
  return (
    <footer className="border-t border-night-line bg-night text-night-ink">
      <div className="mx-auto grid max-w-[90rem] gap-10 px-4 py-14 sm:px-10 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Logo name={env.siteName} />
          <p className="mt-4 max-w-xs text-sm leading-relaxed">A structured preparation system for GATE CS/IT and CAT. Learn, practise, test and improve.</p>
        </div>
        <nav aria-label="Explore" className="flex flex-col gap-2.5 text-sm">
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-night-ink-2">Explore</p>
          <Link className="hover:text-white" href="/exams">Exams</Link>
          <Link className="hover:text-white" href="/courses">Courses</Link>
          <Link className="hover:text-white" href="/exams/gate_cs">GATE</Link>
          <Link className="hover:text-white" href="/exams/cat">CAT</Link>
        </nav>
        <nav aria-label="Account" className="flex flex-col gap-2.5 text-sm">
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-night-ink-2">Account</p>
          {viewer ? (
            <>
              <Link className="hover:text-white" href="/app">My learning</Link>
              <Link className="hover:text-white" href="/app/practice">Practice</Link>
              <Link className="hover:text-white" href="/app/tests">Tests</Link>
              <Link className="hover:text-white" href="/app/settings">Settings</Link>
            </>
          ) : (
            <>
              <Link className="hover:text-white" href="/login">Log in</Link>
              <Link className="hover:text-white" href="/signup">Create account</Link>
            </>
          )}
        </nav>
      </div>
      <div className="border-t border-night-line">
        <div className="mx-auto flex max-w-[90rem] flex-wrap items-center justify-between gap-3 px-4 py-5 text-xs text-night-ink-2 sm:px-10">
          <p>© {new Date().getFullYear()} {env.siteName}. All rights reserved.</p>
          <Credit dark className="order-last w-full sm:order-none sm:w-auto" />
          <nav aria-label="Legal" className="flex flex-wrap gap-5">
            <Link className="hover:text-white" href="/terms">Terms</Link><Link className="hover:text-white" href="/privacy">Privacy</Link>
            <Link className="hover:text-white" href="/refund-policy">Refunds</Link><Link className="hover:text-white" href="/contact">Contact</Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
