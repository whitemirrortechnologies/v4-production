import { env } from "@/lib/env";

/** Shared layout for policy pages. Text in [brackets] must be filled in before launch. */
export function Legal({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <main id="main" className="mx-auto max-w-3xl px-4 py-16 sm:px-8">
      <p className="eyebrow">Legal</p>
      <h1 className="h1 mt-3">{title}</h1>
      <p className="mt-3 text-sm text-ink-3">Last updated: {updated} · {env.siteName}</p>
      <div className="mt-6 rounded-xl bg-warn/10 px-4 py-3 text-sm text-warn">Template: replace every [bracketed] item and have it reviewed before launch.</div>
      <div className="rich mt-10 text-[15px] text-ink-2 [&_h2]:mt-10 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-bold [&_h2]:tracking-tight [&_h2]:text-ink">{children}</div>
    </main>
  );
}
