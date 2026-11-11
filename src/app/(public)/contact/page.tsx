import { Eyebrow } from "@/components/ui";
export const metadata = { title: "Contact" };
export default function Contact() {
  const email = process.env.NEXT_PUBLIC_SUPPORT_EMAIL;
  return (
    <main id="main" className="mx-auto max-w-3xl px-4 py-16 sm:px-8">
      <Eyebrow>Contact</Eyebrow>
      <h1 className="h1 mt-3">We&apos;re here to help</h1>
      <p className="mt-4 text-lg text-ink-2">Questions about a course, a payment or your account? Write to us and we&apos;ll reply within a working day.</p>
      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl bg-wash p-6"><p className="text-sm text-ink-3">Email</p>{email ? <a href={`mailto:${email}`} className="mt-1 block font-display text-lg font-bold text-violet-600">{email}</a> : <p className="mt-1 font-semibold">[support email]</p>}</div>
        <div className="rounded-2xl bg-wash p-6"><p className="text-sm text-ink-3">Address</p><p className="mt-1 font-semibold">[Business legal name], [address]</p></div>
      </div>
    </main>
  );
}
