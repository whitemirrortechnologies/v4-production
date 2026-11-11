import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { env } from "@/lib/env";
import { Logo } from "@/components/logo";

const links = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/syllabus", label: "Syllabus" },
  { href: "/admin/courses", label: "Courses" },
  { href: "/admin/users", label: "Users", adminOnly: true },
  { href: "/admin/orders", label: "Orders", adminOnly: true },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireStaff();
  const nav = links.filter((l) => !l.adminOnly || profile.role === "admin");
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[15rem_1fr]">
      <aside className="bg-night text-white lg:sticky lg:top-0 lg:h-dvh">
        <div className="flex items-center justify-between px-5 py-4 lg:block lg:py-6">
          <Link href="/" aria-label="Home"><Logo name={env.siteName} /></Link>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-violet-300 lg:mt-3">{profile.role}</p>
        </div>
        <nav className="hide-scrollbar flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:pb-0">
          {nav.map((l) => (
            <Link key={l.href} href={l.href} className="whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-medium text-night-ink transition-colors hover:bg-white/10 hover:text-white">
              {l.label}
            </Link>
          ))}
          <Link href="/app" className="whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-medium text-night-ink-2 hover:bg-white/10 hover:text-white lg:mt-8">← Student view</Link>
        </nav>
      </aside>
      <div className="min-w-0 px-4 py-8 sm:px-8 lg:px-12">{children}</div>
    </div>
  );
}
