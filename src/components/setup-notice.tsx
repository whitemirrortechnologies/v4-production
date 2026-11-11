/** Shown instead of crashing when Supabase env vars are missing (e.g. first Vercel deploy).
 *  Lists which variables the running build can see (names only, never values). */
export function SetupNotice() {
  const vars: [string, boolean][] = [
    ["NEXT_PUBLIC_SUPABASE_URL", Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL)],
    ["NEXT_PUBLIC_SUPABASE_ANON_KEY", Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)],
    ["SUPABASE_SERVICE_ROLE_KEY", Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)],
  ];
  return (
    <main className="on-night relative flex min-h-dvh items-center justify-center overflow-hidden bg-night px-5 text-white">
      <div className="grid-bg glow-top absolute inset-0" aria-hidden />
      <div className="relative w-full max-w-xl rounded-3xl border border-night-line bg-night-2 p-8">
        <p className="eyebrow eyebrow-night">Setup</p>
        <h1 className="h2 mt-3">Almost there</h1>
        <p className="mt-3 leading-relaxed text-night-ink">
          This deployment can&apos;t see all of its Supabase settings. Add the missing ones in Vercel → Settings → Environment Variables
          (tick Production and Preview), then <strong className="text-white">redeploy</strong>.
        </p>
        <ul className="mt-6 space-y-3 font-mono text-sm">
          {vars.map(([name, ok]) => (
            <li key={name} className="flex items-center justify-between gap-3 border-b border-night-line pb-3 last:border-0">
              <span className="text-night-ink">{name}</span>
              <span className={ok ? "text-[#4ade80]" : "text-[#f87171]"}>{ok ? "found" : "missing"}</span>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
