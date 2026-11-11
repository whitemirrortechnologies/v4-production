import Link from "next/link";
import { env } from "@/lib/env";
import { getViewer } from "@/lib/auth";
import { HeaderClient } from "@/components/header-client";
import { Logo } from "@/components/logo";
import { Credit } from "@/components/credit";
import { getExamInfo } from "@/lib/catalog";

export async function SiteHeader() {
  const [viewer, info] = await Promise.all([getViewer().catch(() => null), getExamInfo().catch(() => null)]);
  return <HeaderClient name={env.siteName} showExams={info ? !info.single : false} signedIn={!!viewer} staff={!!viewer && viewer.profile.role !== "student"}
    initial={(viewer?.profile.full_name ?? viewer?.profile.email ?? "?").trim().charAt(0).toUpperCase()} />;
}

export async function SiteFooter() {
  const [viewer, info] = await Promise.all([getViewer().catch(() => null), getExamInfo().catch(() => null)]);
  return (
    <footer className="border-t border-night-line bg-night text-night-ink">
      <div className="mx-auto grid max-w-[90rem] gap-10 px-4 py-14 sm:px-10 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Logo name={env.siteName} />
          <p className="mt-4 max-w-xs text-sm leading-relaxed">A structured preparation system for {info?.label ?? "your exam"}. Learn, practise, test and improve.</p>
        </div>
        <nav aria-label="Explore" className="flex flex-col gap-4 text-sm">
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-night-ink-2">Explore</p>
          {info && !info.single && <Link className="tap hover:text-white" href="/exams">Exams</Link>}
          <Link className="tap hover:text-white" href="/courses">Courses</Link>
          {info?.exams.map((e) => <Link key={e.id} className="tap hover:text-white" href={`/exams/${e.code.toLowerCase()}`}>{e.code.split("_")[0]}</Link>)}
        </nav>
        <nav aria-label="Account" className="flex flex-col gap-4 text-sm">
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-night-ink-2">Account</p>
          {viewer ? (
            <>
              <Link className="tap hover:text-white" href="/app">My learning</Link>
              <Link className="tap hover:text-white" href="/app/practice">Practice</Link>
              <Link className="tap hover:text-white" href="/app/tests">Tests</Link>
              <Link className="tap hover:text-white" href="/app/settings">Settings</Link>
            </>
          ) : (
            <>
              <Link className="tap hover:text-white" href="/login">Log in</Link>
              <Link className="tap hover:text-white" href="/signup">Create account</Link>
            </>
          )}
        </nav>
      </div>
      <div className="border-t border-night-line">
        <div className="mx-auto flex max-w-[90rem] flex-wrap items-center justify-between gap-3 px-4 py-5 text-xs text-night-ink-2 sm:px-10">
          <p>© {new Date().getFullYear()} {env.siteName}. All rights reserved.</p>
          <Credit dark className="order-last w-full sm:order-none sm:w-auto" />
          <nav aria-label="Legal" className="flex flex-wrap gap-5">
            <Link className="tap hover:text-white" href="/terms">Terms</Link><Link className="tap hover:text-white" href="/privacy">Privacy</Link>
            <Link className="tap hover:text-white" href="/refund-policy">Refunds</Link><Link className="tap hover:text-white" href="/contact">Contact</Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
