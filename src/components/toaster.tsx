"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import type { ToastMsg } from "@/lib/toast";
import { IconAlert, IconCheckCircle } from "@/components/icons";

export function Toaster() {
  const [items, setItems] = useState<ToastMsg[]>([]);
  useEffect(() => {
    let n = 0;
    const on = (e: Event) => {
      const d = (e as CustomEvent<Omit<ToastMsg, "id">>).detail;
      const id = ++n;
      setItems((xs) => [...xs.slice(-2), { ...d, id }]);
      setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), d.tone === "error" ? 6000 : 2800);
    };
    window.addEventListener("v4:toast", on);
    return () => window.removeEventListener("v4:toast", on);
  }, []);
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-5 z-[100] flex flex-col items-center gap-2 px-4">
      {items.map((t) => (
        <div key={t.id} role={t.tone === "error" ? "alert" : "status"}
          className={clsx("rise pointer-events-auto flex max-w-md items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-medium shadow-lift",
            t.tone === "error" ? "bg-bad text-white" : "bg-ink text-white")}>
          {t.tone === "error" ? <IconAlert size={16} /> : <IconCheckCircle size={16} className="text-[#4ade80]" />}
          {t.text}
        </div>
      ))}
    </div>
  );
}
