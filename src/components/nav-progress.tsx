"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Thin progress bar that appears the instant an internal link is clicked and completes when the
 * new page arrives, so navigation never feels frozen. No library; transform-only animation.
 */
export function NavProgress() {
  const path = usePathname();
  const search = useSearchParams().toString();
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement).closest("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin || (url.pathname === location.pathname && url.search === location.search)) return;
      clearTimeout(timer.current);
      setState("loading");
      timer.current = setTimeout(() => setState("idle"), 15000); // safety: never stay stuck
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  useEffect(() => {
    setState((s) => (s === "loading" ? "done" : s));
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setState("idle"), 400);
    return () => clearTimeout(timer.current);
  }, [path, search]);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-[200] h-0.5">
      <div
        className="h-full origin-left bg-violet-500 shadow-[0_0_10px_#635bff]"
        style={{
          transform: state === "idle" ? "scaleX(0)" : state === "loading" ? "scaleX(0.82)" : "scaleX(1)",
          opacity: state === "done" ? 0 : state === "idle" ? 0 : 1,
          transition: state === "loading" ? "transform 8s cubic-bezier(0.1, 0.8, 0.2, 1), opacity 0.1s" : state === "done" ? "transform 0.2s ease-out, opacity 0.35s 0.15s" : "none",
        }}
      />
    </div>
  );
}
