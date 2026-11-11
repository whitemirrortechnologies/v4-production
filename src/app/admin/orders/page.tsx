import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Badge, Card, Empty, PageHeader } from "@/components/ui";
import { rupees } from "@/lib/format";

export const metadata = { title: "Orders · Admin" };

export default async function OrdersPage() {
  await requireAdmin("/admin/orders");
  const supabase = await createClient();
  const { data } = await supabase
    .from("orders")
    .select("id,status,amount_paise,discount_paise,provider,created_at,user:profiles(full_name,email),product:products(type,course:courses(title),series:test_series(title),title)")
    .order("created_at", { ascending: false })
    .limit(100);
  const one = <T,>(v: T | T[] | null) => (Array.isArray(v) ? v[0] : v) ?? null;
  return (
    <>
      <PageHeader title="Orders" subtitle="Payments are in demo mode until a real gateway is connected." />
      {data?.length ? (
        <div className="space-y-2">
          {data.map((o) => {
            const u = one(o.user) as { full_name: string | null; email: string | null } | null;
            const p = one(o.product) as { title: string | null; course: unknown; series: unknown } | null;
            const name = (one(p?.course as { title: string }) as { title: string } | null)?.title
              ?? (one(p?.series as { title: string }) as { title: string } | null)?.title ?? p?.title ?? "—";
            return (
              <Card key={o.id} className="cv-auto flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="truncate font-medium">{name}</p>
                  <p className="truncate text-sm text-ink-3">{u?.full_name || u?.email} · {new Date(o.created_at).toLocaleString("en-IN")}</p>
                </div>
                <div className="flex items-center gap-3">
                  {o.discount_paise > 0 && <span className="text-xs text-ink-3">−{rupees(o.discount_paise)}</span>}
                  <span className="font-semibold">{o.amount_paise === 0 ? "₹0" : rupees(o.amount_paise)}</span>
                  <Badge tone={o.status === "paid" ? "good" : o.status === "failed" ? "bad" : "neutral"}>{o.status}</Badge>
                </div>
              </Card>
            );
          })}
        </div>
      ) : <Empty title="No orders yet" />}
    </>
  );
}
