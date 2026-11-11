import Link from "next/link";
import { notFound } from "next/navigation";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/site-header";
import { Button, Card, Input, Label, Notice } from "@/components/ui";
import { rupees } from "@/lib/format";
import { startCheckout } from "../actions";

export const metadata = { title: "Checkout" };

export default async function Checkout({ params, searchParams }: {
  params: Promise<{ productId: string }>; searchParams: Promise<{ coupon?: string; error?: string }>;
}) {
  const { productId } = await params;
  await requireViewer(`/checkout/${productId}`);
  const { coupon, error } = await searchParams;
  const supabase = await createClient();

  const { data: product } = await supabase
    .from("products")
    .select("id,type,title,course:courses(title,slug,subtitle),series:test_series(title)")
    .eq("id", productId).eq("is_active", true).maybeSingle();
  if (!product) notFound();
  const one = <T,>(v: T | T[] | null) => (Array.isArray(v) ? v[0] : v) ?? null;
  const course = one(product.course) as { title: string; slug: string; subtitle: string | null } | null;
  const title = course?.title ?? (one(product.series) as { title: string } | null)?.title ?? product.title ?? "Purchase";

  const { data: quote, error: quoteError } = await supabase.rpc("preview_price", { p_product: productId, p_coupon_code: coupon || null });
  const q = quote as { list_price_paise: number; discount_paise: number; amount_paise: number; coupon_applied: boolean } | null;
  const couponError = coupon && quoteError ? quoteError.message : null;
  const base = q ?? ((await supabase.rpc("preview_price", { p_product: productId, p_coupon_code: null })).data as typeof q);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-xl px-5 py-12">
        <h1 className="text-3xl font-semibold tracking-tight">Checkout</h1>
        <Card className="mt-6 p-6">
          <p className="text-sm text-ink-3">You&apos;re enrolling in</p>
          <p className="mt-1 text-xl font-semibold tracking-tight">{title}</p>
          {course?.subtitle && <p className="mt-1 text-ink-3">{course.subtitle}</p>}

          <form className="mt-6 flex gap-2" method="get">
            <Input name="coupon" defaultValue={coupon} placeholder="Coupon code" aria-label="Coupon code" className="uppercase" />
            <Button type="submit" variant="secondary">Apply</Button>
          </form>
          {couponError && <div className="mt-3"><Notice tone="error">{couponError}</Notice></div>}
          {q?.coupon_applied && <div className="mt-3"><Notice tone="success">Coupon applied.</Notice></div>}

          <dl className="mt-6 space-y-2 border-t border-line pt-5 text-[15px]">
            <div className="flex justify-between"><dt className="text-ink-3">Price</dt><dd>{base ? (base.list_price_paise === 0 ? "Free" : rupees(base.list_price_paise)) : "—"}</dd></div>
            {q && q.discount_paise > 0 && <div className="flex justify-between text-good"><dt>Discount</dt><dd>−{rupees(q.discount_paise)}</dd></div>}
            <div className="flex justify-between text-lg font-semibold"><dt>Total</dt><dd>{(q ?? base) ? ((q ?? base)!.amount_paise === 0 ? "Free" : rupees((q ?? base)!.amount_paise)) : "—"}</dd></div>
          </dl>

          {error && <div className="mt-4"><Notice tone="error">{error}</Notice></div>}
          <form action={startCheckout} className="mt-6">
            <input type="hidden" name="product_id" value={productId} />
            <input type="hidden" name="coupon" value={q?.coupon_applied ? coupon : ""} />
            <Button type="submit" size="lg" variant="violet" className="w-full">
              {(q ?? base)?.amount_paise === 0 ? "Enroll for free" : "Continue to payment"}
            </Button>
          </form>
          <p className="mt-4 text-center text-xs text-ink-3">Payments are in demo mode: no real money is charged.</p>
        </Card>
        <p className="mt-6 text-center text-sm"><Link className="text-ink-3 hover:text-ink" href={course ? `/courses/${course.slug}` : "/courses"}>← Back</Link></p>
      </main>
    </>
  );
}
