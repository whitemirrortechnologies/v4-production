"use client";

import Link from "next/link";
import { useEffect } from "react";
import { btn } from "@/components/ui";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <main className="flex min-h-[70dvh] items-center justify-center px-5">
      <div className="max-w-md text-center">
        <p className="eyebrow">Something went wrong</p>
        <h1 className="h1 mt-3">We hit a snag.</h1>
        <p className="mt-4 text-ink-3">This page couldn&apos;t load. Try again, and if it keeps happening, let us know.{error.digest && <span className="mt-2 block font-mono text-xs">Ref: {error.digest}</span>}</p>
        <div className="mt-8 flex justify-center gap-3">
          <button onClick={reset} className={btn({ size: "lg" })}>Try again</button>
          <Link href="/" className={btn({ variant: "outline", size: "lg" })}>Go home</Link>
        </div>
      </div>
    </main>
  );
}
