"use client";

import { useEffect, useRef } from "react";
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

/** Pointer-follow tilt driven by a real spring simulation (rAF only while moving). */
export function Tilt({ children, className, max = 7 }: { children: React.ReactNode; className?: string; max?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || matchMedia("(prefers-reduced-motion: reduce), (pointer: coarse)").matches) return;
    const host = el.closest("section") ?? el;
    const s = { x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0 };
    let raf = 0, last = 0;
    const K = 120, C = 14; // stiffness, damping
    const step = (t: number) => {
      const dt = Math.min(0.032, (t - (last || t)) / 1000) || 0.016; last = t;
      s.vx += (K * (s.tx - s.x) - C * s.vx) * dt; s.x += s.vx * dt;
      s.vy += (K * (s.ty - s.y) - C * s.vy) * dt; s.y += s.vy * dt;
      el.style.transform = `perspective(1200px) rotateX(${(-s.y * max).toFixed(3)}deg) rotateY(${(s.x * max).toFixed(3)}deg) translate3d(${(s.x * 10).toFixed(2)}px, ${(s.y * 10).toFixed(2)}px, 0)`;
      const moving = Math.abs(s.tx - s.x) + Math.abs(s.ty - s.y) + Math.abs(s.vx) + Math.abs(s.vy) > 0.0008;
      raf = moving ? requestAnimationFrame(step) : 0;
      if (!moving) last = 0;
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(step); };
    const onMove = (e: PointerEvent) => {
      const r = host.getBoundingClientRect();
      s.tx = ((e.clientX - r.left) / r.width - 0.5) * 2; s.ty = ((e.clientY - r.top) / r.height - 0.5) * 2; kick();
    };
    const onLeave = () => { s.tx = 0; s.ty = 0; kick(); };
    host.addEventListener("pointermove", onMove, { passive: true });
    host.addEventListener("pointerleave", onLeave, { passive: true });
    return () => { cancelAnimationFrame(raf); host.removeEventListener("pointermove", onMove); host.removeEventListener("pointerleave", onLeave); };
  }, [max]);
  return <div ref={ref} className={className} style={{ willChange: "transform" }}>{children}</div>;
}
