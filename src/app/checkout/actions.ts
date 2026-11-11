"use server";

import { redirect } from "next/navigation";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { refresh } from "@/lib/action";

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const back = (productId: string, error: string, coupon?: string) =>
  redirect(`/checkout/${productId}?error=${encodeURIComponent(error)}${coupon ? `&coupon=${encodeURIComponent(coupon)}` : ""}`);

export async function startCheckout(f: FormData) {
  const productId = str(f, "product_id"), coupon = str(f, "coupon");
  await requireViewer(`/checkout/${productId}`);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_order", { p_product: productId, p_coupon_code: coupon || null, p_provider: "demo" });
  if (error) back(productId, error.message, coupon);
  const order = data as { order_id: string; status: string };
  refresh("/app");
  redirect(order.status === "paid" ? `/checkout/pay/${order.order_id}?paid=1` : `/checkout/pay/${order.order_id}`);
}

/** DEMO PAYMENT: confirms or fails a pending order. Replaced by a gateway webhook later. */
export async function settleDemoPayment(f: FormData) {
  const orderId = str(f, "order_id");
  const { user } = await requireViewer(`/checkout/pay/${orderId}`);
  const supabase = await createClient();
  // RLS: users can only see their own orders, so this also proves ownership.
  const { data: order } = await supabase.from("orders").select("id,status,user_id,provider").eq("id", orderId).maybeSingle();
  if (!order || order.user_id !== user.id || order.status !== "pending" || order.provider !== "demo") redirect("/app");

  const service = createServiceClient();
  if (f.get("outcome") === "fail") {
    await service.rpc("mark_order_failed", { p_order: orderId });
    redirect(`/checkout/pay/${orderId}`);
  }
  const { error } = await service.rpc("mark_order_paid", { p_order: orderId, p_provider_payment_id: `demo_${crypto.randomUUID()}` });
  if (error) redirect(`/checkout/pay/${orderId}?error=${encodeURIComponent(error.message)}`);
  refresh("/app", "/");
  redirect(`/checkout/pay/${orderId}?paid=1`);
}
