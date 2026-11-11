import Link from "next/link";
import { Logo } from "@/components/logo";
import { Credit } from "@/components/credit";
import { SimpleAuthForm } from "@/components/simple-auth-form";
import { env } from "@/lib/env";
import { requestReset } from "../actions";

export const metadata = { title: "Reset your password" };

export default async function Page() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-5 py-12">
      <div className="rise w-full max-w-sm">
        <Link href="/" className="mb-10 inline-flex rounded-xl bg-night px-3 py-2"><Logo name={env.siteName} /></Link>
        <h1 className="h1" style={{ fontSize: "2.25rem" }}>Reset your password</h1>
        <p className="mb-8 mt-2 text-ink-3">We'll email you a link to set a new one.</p>
        <SimpleAuthForm action={requestReset} kind="forgot" />
        <p className="mt-6 text-center text-sm text-ink-3"><Link href="/login" className="font-semibold text-violet-600 hover:underline">Back to log in</Link></p>
        <Credit className="mt-12" />
      </div>
    </main>
  );
}
