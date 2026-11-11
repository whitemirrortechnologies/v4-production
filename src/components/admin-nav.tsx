"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { IconBook, IconChart, IconTarget, IconVideo, IconCheckCircle, IconClock } from "@/components/icons";

const ICONS = { overview: IconChart, syllabus: IconTarget, courses: IconVideo, questions: IconBook, tests: IconClock, users: IconCheckCircle, orders: IconCheckCircle } as const;

export function AdminNav({ links }: { links: { href: string; label: string; icon: keyof typeof ICONS }[] }) {
  const path = usePathname();
  return (
    <nav aria-label="Admin" className="hide-scrollbar flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:pb-0">
      {links.map((l) => {
        const on = l.href === "/admin" ? path === "/admin" : path.startsWith(l.href);
        const I = ICONS[l.icon];
        return (
          <Link key={l.href} href={l.href} aria-current={on ? "page" : undefined}
            className={clsx("flex items-center gap-3 whitespace-nowrap rounded-lg px-3.5 py-2.5 text-sm font-medium transition-colors",
              on ? "bg-white/10 text-white" : "text-night-ink hover:bg-white/5 hover:text-white")}>
            <I size={16} className={on ? "text-violet-300" : ""} />{l.label}
          </Link>
        );
      })}
    </nav>
  );
}
