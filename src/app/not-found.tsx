import Link from "next/link";
import { btn } from "@/components/ui";

export default function NotFound() {
  return (
    <main className="on-night relative flex min-h-dvh items-center justify-center overflow-hidden bg-night px-5 text-white">
      <div className="grid-bg glow-top absolute inset-0" aria-hidden />
      <div className="relative text-center">
        <p className="eyebrow eyebrow-night">Error 404</p>
        <h1 className="display mt-4">Page not found.</h1>
        <p className="mx-auto mt-5 max-w-md text-night-ink">The page you&apos;re looking for doesn&apos;t exist or has moved.</p>
        <div className="mt-9 flex justify-center gap-3">
          <Link href="/" className={btn({ variant: "inverse", size: "lg" })}>Go home</Link>
          <Link href="/courses" className={btn({ variant: "outlineDark", size: "lg" })}>Browse courses</Link>
        </div>
      </div>
    </main>
  );
}
