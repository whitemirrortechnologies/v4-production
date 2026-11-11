import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/logo";
import { Credit } from "@/components/credit";
import { SimpleAuthForm } from "@/components/simple-auth-form";
import { getViewer } from "@/lib/auth";
import { env } from "@/lib/env";
import { setNewPassword } from "../actions";

export const metadata = { title: "Choose a new password" };

export default async function Page() {
  if (!(await getViewer())) redirect("/forgot-password?expired=1");
  return (
    <main className="flex min-h-dvh items-center justify-center px-5 py-12">
      <div className="rise w-full max-w-sm">
        <Link href="/" className="mb-10 inline-flex rounded-xl bg-night px-3 py-2"><Logo name={env.siteName} /></Link>
        <h1 className="h1" style={{ fontSize: "2.25rem" }}>Choose a new password</h1>
        <p className="mb-8 mt-2 text-ink-3">Pick something you haven't used before.</p>
        <SimpleAuthForm action={setNewPassword} kind="reset" />
        <p className="mt-6 text-center text-sm text-ink-3"><Link href="/login" className="font-semibold text-violet-600 hover:underline">Back to log in</Link></p>
        <Credit className="mt-12" />
      </div>
    </main>
  );
}
