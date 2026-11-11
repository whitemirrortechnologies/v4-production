"use client";

import { usePathname } from "next/navigation";

/** Renders children except on routes starting with any of `paths` (e.g. the full-screen exam). */
export function HideOn({ paths, children }: { paths: string[]; children: React.ReactNode }) {
  const p = usePathname();
  return paths.some((x) => p.startsWith(x)) ? null : <>{children}</>;
}
