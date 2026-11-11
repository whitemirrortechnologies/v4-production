import Link from "next/link";
import { notFound } from "next/navigation";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/site-header";
import { PracticeSession, type PSession } from "@/components/practice-session";

export const metadata = { title: "Practice session" };

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireViewer(`/app/practice/${id}`);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_practice_session", { p_session: id });
  if (error || !data) notFound();
  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto max-w-6xl px-4 py-8 sm:px-8 lg:py-12">
        <Link href="/app/practice" className="tap text-sm text-ink-3 hover:text-ink">← Practice</Link>
        <div className="mt-5"><PracticeSession data={data as PSession} /></div>
      </main>
    </>
  );
}
