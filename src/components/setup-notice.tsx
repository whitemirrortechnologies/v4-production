import { Card } from "@/components/ui";

/** Shown instead of crashing when Supabase env vars are missing (e.g. first Vercel deploy). */
export function SetupNotice() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl items-center px-5">
      <Card className="w-full p-8">
        <h1 className="text-2xl font-semibold tracking-tight">Almost there</h1>
        <p className="mt-3 text-ink-2">Connect your Supabase project by adding these environment variables (Vercel → Settings → Environment Variables), then redeploy:</p>
        <ul className="mt-4 space-y-1 font-mono text-sm text-ink-2">
          <li>NEXT_PUBLIC_SUPABASE_URL</li>
          <li>NEXT_PUBLIC_SUPABASE_ANON_KEY</li>
          <li>SUPABASE_SERVICE_ROLE_KEY</li>
        </ul>
      </Card>
    </main>
  );
}
