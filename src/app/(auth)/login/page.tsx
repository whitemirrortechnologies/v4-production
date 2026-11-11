import { redirect } from "next/navigation";
import Link from "next/link";
import { AuthForm } from "@/components/auth-form";
import { SetupNotice } from "@/components/setup-notice";
import { Logo } from "@/components/logo";
import { Notice } from "@/components/ui";
import { Credit } from "@/components/credit";
import { isSupabaseConfigured, env } from "@/lib/env";
import { getViewer } from "@/lib/auth";
import { signIn } from "../actions";

export const metadata = { title: "Log in" };

export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  if (!isSupabaseConfigured) return <SetupNotice />;
  const { next, error } = await searchParams;
  const safe = next && next.startsWith("/") && !next.startsWith("//") ? next : "/app";
  if (await getViewer()) redirect(safe);
  return (
    <main className="grid min-h-dvh lg:grid-cols-2">
      <section className="on-night relative hidden overflow-hidden bg-night text-white lg:flex lg:flex-col lg:justify-between">
        <div className="grid-bg absolute inset-0" aria-hidden />
        <div className="glow-bottom absolute inset-0" aria-hidden />
        <Link href="/" className="relative p-10"><Logo name={env.siteName} /></Link>
        <div className="relative p-10 pb-16">
          <p className="eyebrow eyebrow-night">{env.siteName}</p>
          <p className="display mt-5" style={{ fontSize: "clamp(3rem, 2rem + 3vw, 5rem)" }}>Learn.<br />Practice.<br />Test.<br /><span className="text-violet-300">Improve.</span></p>
          <p className="mt-6 max-w-sm leading-relaxed text-night-ink">One preparation system for CAT: your courses, practice, mocks and progress in one place.</p>
        </div>
      </section>
      <section className="flex items-center justify-center px-5 py-12">
        <div className="rise w-full max-w-sm">
          <Link href="/" className="mb-10 flex lg:hidden"><span className="rounded-xl bg-night px-3 py-2"><Logo name={env.siteName} /></span></Link>
          <h1 className="h1" style={{ fontSize: "2.25rem" }}>Welcome back</h1>
          <p className="mb-8 mt-2 text-ink-3">Log in to continue your preparation.</p>
          {error === "blocked" && <div className="mb-4"><Notice tone="error">This account has been suspended.</Notice></div>}
          {error === "link" && <div className="mb-4"><Notice tone="error">That link is invalid or has expired. Try again.</Notice></div>}
          <AuthForm mode="login" action={signIn} next={safe} />
          <Credit className="mt-12" />
        </div>
      </section>
    </main>
  );
}
