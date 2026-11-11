import { notFound } from "next/navigation";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SiteFooter, SiteHeader } from "@/components/site-header";
import { Button, Card, LinkButton, Notice } from "@/components/ui";
import { rupees } from "@/lib/format";
import { IconCheck } from "@/components/icons";
import { settleDemoPayment } from "../../actions";

export const metadata = { title: "Payment" };

export default async function PayPage({ params, searchParams }: {
  params: Promise<{ orderId: string }>; searchParams: Promise<{ paid?: string; error?: string }>;
}) {
  const { orderId } = await params;
  await requireViewer(`/checkout/pay/${orderId}`);
  const { error } = await searchParams;
  const supabase = await createClient();
  const { data: order } = await supabase
    .from("orders").select("id,status,amount_paise,product:products(course:courses(title,slug))").eq("id", orderId).maybeSingle();
  if (!order) notFound();
  const one = <T,>(v: T | T[] | null) => (Array.isArray(v) ? v[0] : v) ?? null;
  const product = one(order.product as { course: unknown } | { course: unknown }[] | null);
  const course = one(product?.course as { title: string; slug: string } | { title: string; slug: string }[] | null);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-md px-5 py-16 text-center">
        {order.status === "paid" ? (
          <Card className="rise p-8">
            <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-good/10 text-good"><IconCheck size={26} /></div>
            <h1 className="mt-5 text-2xl font-semibold tracking-tight">You&apos;re in</h1>
            <p className="mt-2 text-ink-3">{course ? `You now have access to ${course.title}.` : "Your purchase is complete."}</p>
            <div className="mt-6 flex flex-col gap-2">
              {course && <LinkButton href={`/app/learn/${course.slug}`} variant="violet" size="lg">Start learning</LinkButton>}
              <LinkButton href="/app" variant="secondary">Go to dashboard</LinkButton>
            </div>
          </Card>
        ) : (
          <Card className="p-8 text-left">
            <h1 className="text-2xl font-semibold tracking-tight">Demo payment</h1>
            <p className="mt-2 text-ink-3">No real gateway is connected yet. Choose an outcome to simulate.</p>
            <p className="mt-5 text-3xl font-semibold tracking-tight">{rupees(order.amount_paise)}</p>
            {order.status === "failed" && <div className="mt-4"><Notice tone="error">That payment failed. Start again from the course page.</Notice></div>}
            {error && <div className="mt-4"><Notice tone="error">{error}</Notice></div>}
            {order.status === "pending" && (
              <form action={settleDemoPayment} className="mt-6 flex flex-col gap-2">
                <input type="hidden" name="order_id" value={order.id} />
                <Button name="outcome" value="success" size="lg" variant="violet" type="submit">Simulate successful payment</Button>
                <Button name="outcome" value="fail" variant="secondary" type="submit">Simulate failure</Button>
              </form>
            )}
          </Card>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
