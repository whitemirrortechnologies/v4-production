import Link from "next/link";
import { env } from "@/lib/env";
import { getViewer } from "@/lib/auth";
import { signOut } from "@/app/(auth)/actions";
import { LinkButton, Button } from "@/components/ui";

export async function SiteHeader() {
  const viewer = await getViewer().catch(() => null);
  const staff = viewer && viewer.profile.role !== "student";
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/95">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Link href="/" className="text-xl font-semibold tracking-tight">
          {env.siteName}
        </Link>
        <nav className="hidden items-center gap-1 text-[15px] text-ink-2 sm:flex">
          <Link className="rounded-full px-4 py-2 hover:bg-wash" href="/exams/gate_cs">GATE</Link>
          <Link className="rounded-full px-4 py-2 hover:bg-wash" href="/exams/cat">CAT</Link>
          <Link className="rounded-full px-4 py-2 hover:bg-wash" href="/courses">Courses</Link>
        </nav>
        <div className="flex items-center gap-2">
          {viewer ? (
            <>
              {staff && <LinkButton href="/admin" variant="secondary" size="sm">Admin</LinkButton>}
              <LinkButton href="/app" variant="secondary" size="sm">My learning</LinkButton>
              <form action={signOut}>
                <Button variant="ghost" size="sm" type="submit">Sign out</Button>
              </form>
            </>
          ) : (
            <>
              <LinkButton href="/login" variant="ghost" size="sm">Sign in</LinkButton>
              <LinkButton href="/signup" size="sm">Get started</LinkButton>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-10 text-sm text-ink-3">
        <p>© {new Date().getFullYear()} {env.siteName}. Learn. Practice. Test.</p>
        <p>GATE CS/IT · CAT</p>
      </div>
    </footer>
  );
}
