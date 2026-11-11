import { Card } from "@/components/ui";

/** Shown instead of crashing when Supabase env vars are missing (e.g. first Vercel deploy).
 *  Lists which variables the running build can see (names only, never values). */
export function SetupNotice() {
  const vars: [string, boolean][] = [
    ["NEXT_PUBLIC_SUPABASE_URL", Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL)],
    ["NEXT_PUBLIC_SUPABASE_ANON_KEY", Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)],
    ["SUPABASE_SERVICE_ROLE_KEY", Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)],
  ];
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl items-center px-5">
      <Card className="w-full p-8">
        <h1 className="text-2xl font-semibold tracking-tight">Almost there</h1>
        <p className="mt-3 text-ink-2">
          This deployment can&apos;t see all of its Supabase settings. Add the missing ones in Vercel → Settings →
          Environment Variables (tick Production and Preview), then <strong>redeploy</strong>. Variables only apply to
          deployments created after they were saved.
        </p>
        <ul className="mt-5 space-y-2 font-mono text-sm">
          {vars.map(([name, ok]) => (
            <li key={name} className="flex items-center justify-between gap-3">
              <span className="text-ink-2">{name}</span>
              <span className={ok ? "text-good" : "text-bad"}>{ok ? "found" : "missing"}</span>
            </li>
          ))}
        </ul>
      </Card>
    </main>
  );
}
