import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { env } from "@/lib/env";
import { Logo } from "@/components/logo";
import { AdminNav } from "@/components/admin-nav";

const links = [
  { href: "/admin", label: "Overview", icon: "overview" as const },
  { href: "/admin/syllabus", label: "Syllabus", icon: "syllabus" as const },
  { href: "/admin/courses", label: "Courses", icon: "courses" as const },
  { href: "/admin/users", label: "Users", icon: "users" as const, adminOnly: true },
  { href: "/admin/orders", label: "Orders", icon: "orders" as const, adminOnly: true },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireStaff();
  const nav = links.filter((l) => !l.adminOnly || profile.role === "admin");
  return (
    <div className="min-h-dvh bg-[#fafafa] lg:grid lg:grid-cols-[16rem_1fr]">
      <aside className="bg-night text-white lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col">
        <div className="flex items-center justify-between px-5 py-4 lg:block lg:px-6 lg:py-6">
          <Link href="/" aria-label="Home"><Logo name={env.siteName} /></Link>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-violet-300 lg:mt-3">{profile.role} console</p>
        </div>
        <AdminNav links={nav} />
        <div className="mt-auto hidden border-t border-night-line p-4 lg:block">
          <p className="truncate text-sm font-medium">{profile.full_name ?? profile.email}</p>
          <Link href="/app" className="mt-1 block text-xs text-night-ink hover:text-white">Switch to student view →</Link>
        </div>
      </aside>
      <div className="min-w-0 px-4 py-8 sm:px-8 lg:px-12 lg:py-10">{children}</div>
    </div>
  );
}
