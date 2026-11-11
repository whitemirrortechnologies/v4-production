"use client";

import { useRef, useState, useTransition, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import clsx from "clsx";
import { btn } from "@/components/ui";
import { toast } from "@/lib/toast";
import { IconSpinner } from "@/components/icons";
import type { Result } from "@/lib/result";

type Action = (fd: FormData) => Promise<Result>;

/**
 * Form that runs a server action without a page reload: no scroll jump, a spinner on the
 * submit button, a toast for the outcome and an optional confirm dialog first.
 */
export function ActionForm({
  action, children, className, confirm, confirmLabel = "Delete", success, onDone, resetOnSuccess,
}: {
  action: Action; children: ReactNode; className?: string; confirm?: string; confirmLabel?: string;
  success?: string; onDone?: (r: Result) => void; resetOnSuccess?: boolean;
}) {
  const form = useRef<HTMLFormElement>(null);
  const confirmed = useRef(false);
  const [asking, setAsking] = useState(false);

  async function run(fd: FormData) {
    let r: Result;
    try {
      r = await action(fd);
    } catch (e) {
      // Redirects are thrown by design; anything else is a real failure (offline, timeout, server error).
      const msg = String((e as { digest?: string; message?: string })?.digest ?? (e as Error)?.message ?? "");
      if (msg.includes("NEXT_REDIRECT")) throw e;
      toast(navigator.onLine ? "That took too long or failed. Please try again." : "You're offline. Check your connection and try again.", "error");
      return;
    }
    if (r?.error) toast(r.error, "error");
    else {
      const msg = r?.ok ?? success;
      if (msg) toast(msg);
      if (resetOnSuccess) form.current?.reset();
    }
    onDone?.(r);
  }

  return (
    <>
      <form ref={form} className={className} action={run}
        onSubmit={(e) => { if (confirm && !confirmed.current) { e.preventDefault(); setAsking(true); } confirmed.current = false; }}>
        {children}
      </form>
      {asking && (
        <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/40 p-4 sm:items-center" onClick={() => setAsking(false)}>
          <div role="alertdialog" aria-modal className="pop w-full max-w-sm rounded-2xl bg-paper p-6 shadow-lift" onClick={(e) => e.stopPropagation()}>
            <p className="font-display text-lg font-bold tracking-tight">Are you sure?</p>
            <p className="mt-2 text-sm leading-relaxed text-ink-3">{confirm}</p>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" className={btn({ variant: "outline", size: "sm" })} onClick={() => setAsking(false)} autoFocus>Cancel</button>
              <button type="button" className={clsx(btn({ size: "sm" }), "bg-bad hover:bg-bad/90")}
                onClick={() => { setAsking(false); confirmed.current = true; form.current?.requestSubmit(); }}>{confirmLabel}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/** Submit button that shows a spinner while its form's action runs. */
export function Submit({ children, variant, size, className, ...p }: React.ComponentProps<"button"> & Parameters<typeof btn>[0]) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending || p.disabled} className={clsx(btn({ variant, size }), className)} {...p}>
      {pending && <IconSpinner size={14} />}{children}
    </button>
  );
}

/** Icon-only submit with spinner. */
export function IconSubmit({ label, children, danger }: { label: string; children: ReactNode; danger?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" aria-label={label} title={label} disabled={pending}
      className={clsx("flex size-8 items-center justify-center rounded-lg text-ink-4 transition-colors", danger ? "hover:bg-bad/10 hover:text-bad" : "hover:bg-wash hover:text-ink")}>
      {pending ? <IconSpinner size={14} /> : children}
    </button>
  );
}

/**
 * Click-to-edit text that saves on Enter or when you click away, then shows a quiet check.
 * `fields` are extra hidden inputs sent with the action.
 */
export function InlineEdit({ action, name, value, fields, className, label }: {
  action: Action; name: string; value: string; fields: Record<string, string>; className?: string; label: string;
}) {
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const [, start] = useTransition();
  const last = useRef(value);
  function save(el: HTMLInputElement) {
    const v = el.value.trim();
    if (!v) { el.value = last.current; return; }
    if (v === last.current) return;
    const fd = new FormData();
    Object.entries(fields).forEach(([k, val]) => fd.set(k, val));
    fd.set(name, v);
    setState("saving");
    start(async () => {
      try {
        const r = await action(fd);
        if (r?.error) { toast(r.error, "error"); el.value = last.current; setState("idle"); return; }
        last.current = v; setState("saved"); setTimeout(() => setState("idle"), 1500);
      } catch {
        toast("Couldn't save. Check your connection.", "error"); el.value = last.current; setState("idle");
      }
    });
  }
  return (
    <span className="relative flex min-w-0 flex-1 items-center">
      <input aria-label={label} defaultValue={value}
        onBlur={(e) => save(e.currentTarget)}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); e.currentTarget.blur(); } if (e.key === "Escape") { e.currentTarget.value = last.current; e.currentTarget.blur(); } }}
        className={clsx("w-full min-w-0 rounded-lg border border-transparent bg-transparent px-2 py-1.5 transition-colors hover:border-line focus:border-violet-500 focus:bg-paper focus:outline-none", className)} />
      <span className="pointer-events-none absolute right-2 text-ink-4" aria-live="polite">
        {state === "saving" && <IconSpinner size={14} />}
        {state === "saved" && <span className="text-xs font-semibold text-good">Saved</span>}
      </span>
    </span>
  );
}
