import Link from "next/link";
import { AuthForm } from "@/components/auth-form";
import { SetupNotice } from "@/components/setup-notice";
import { Notice } from "@/components/ui";
import { isSupabaseConfigured, env } from "@/lib/env";
import { signIn } from "../actions";

export const metadata = { title: "Sign in" };

export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  if (!isSupabaseConfigured) return <SetupNotice />;
  const { next, error } = await searchParams;
  const safe = next && next.startsWith("/") && !next.startsWith("//") ? next : "/app";
  return (
    <main className="glow-violet flex min-h-dvh items-center justify-center px-5 py-12">
      <div className="rise w-full max-w-sm">
        <Link href="/" className="mb-8 block text-center text-2xl font-semibold tracking-tight">{env.siteName}</Link>
        <div className="rounded-[var(--radius-card)] border border-line bg-paper p-7 shadow-soft">
          <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
          <p className="mb-6 mt-1 text-ink-3">Sign in to continue learning.</p>
          {error === "blocked" && <div className="mb-4"><Notice tone="error">This account has been suspended.</Notice></div>}
          <AuthForm mode="login" action={signIn} next={safe} />
        </div>
      </div>
    </main>
  );
}
