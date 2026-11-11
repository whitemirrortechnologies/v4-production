"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Scroll reveals for every [data-reveal] element. Uses IntersectionObserver only (no scroll
 * listeners), so scrolling stays native and smooth. Elements already on screen are shown
 * immediately, so nothing flashes on load.
 */
export function Motion() {
  const path = usePathname();
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const html = document.documentElement;
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    const scan = (root: ParentNode) => {
      const vh = innerHeight;
      root.querySelectorAll<HTMLElement>("[data-reveal]:not(.in)").forEach((el) => {
        if (el.getBoundingClientRect().top < vh * 0.92) el.classList.add("in");
        else io.observe(el);
      });
    };
    scan(document);
    html.classList.add("motion-ready");
    const mo = new MutationObserver(() => scan(document));
    mo.observe(document.body, { childList: true, subtree: true });
    return () => { io.disconnect(); mo.disconnect(); };
  }, [path]);
  return null;
}
