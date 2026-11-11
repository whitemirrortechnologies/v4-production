"use client";

import { memo, useEffect, useRef, useState } from "react";
import { clock } from "@/lib/format";

/**
 * A self-contained ticking clock. Only this tiny component re-renders each second,
 * not the screen around it (which holds heavy maths-formatted questions).
 * `deadline` and `serverNow` are ISO strings; the clock follows the server's time.
 */
export const Countdown = memo(function Countdown({ deadline, serverNow, onExpire, warnBelow = 300, className, warnClassName, prefix }: {
  deadline: string; serverNow: string; onExpire?: () => void; warnBelow?: number; className?: string; warnClassName?: string; prefix?: string;
}) {
  const skew = useRef(new Date(serverNow).getTime() - Date.now());
  const end = new Date(deadline).getTime();
  // First render uses the server's clock only, so server HTML and client hydration always agree.
  const [left, setLeft] = useState(() => Math.max(0, (end - new Date(serverNow).getTime()) / 1000));
  const fired = useRef(false);
  const cb = useRef(onExpire);
  cb.current = onExpire;

  useEffect(() => {
    const tick = () => {
      const l = Math.max(0, (end - (Date.now() + skew.current)) / 1000);
      setLeft((prev) => (Math.floor(prev) === Math.floor(l) ? prev : l)); // re-render only when the visible second changes
      if (l <= 0 && !fired.current) { fired.current = true; cb.current?.(); }
    };
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [end]);

  return <span className={left < warnBelow ? warnClassName ?? className : className} role="timer" aria-live="off">{prefix}{clock(left)}</span>;
});
