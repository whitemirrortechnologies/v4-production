import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { env } from "@/lib/env";
import { Badge } from "@/components/ui";

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
      <aside className="border-b border-line lg:sticky lg:top-0 lg:h-dvh lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between px-5 py-4 lg:block">
          <Link href="/" className="text-lg font-semibold tracking-tight">{env.siteName}</Link>
          <div className="lg:mt-1"><Badge tone="violet">{profile.role}</Badge></div>
        </div>
        <nav className="hide-scrollbar flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:px-3 lg:pb-0">
          {nav.map((l) => (
            <Link key={l.href} href={l.href} className="whitespace-nowrap rounded-xl px-4 py-2.5 text-[15px] text-ink-2 hover:bg-wash hover:text-ink">
              {l.label}
            </Link>
          ))}
          <Link href="/app" className="whitespace-nowrap rounded-xl px-4 py-2.5 text-[15px] text-ink-3 hover:bg-wash lg:mt-6">← Student view</Link>
        </nav>
      </aside>
      <div className="min-w-0 px-5 py-8 sm:px-8 lg:px-12">{children}</div>
    </div>
  );
}
