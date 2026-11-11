import Link from "next/link";
import { notFound } from "next/navigation";
import { getViewer, requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, Input, Label, Select, Textarea } from "@/components/ui";
import { ActionForm, Submit } from "@/components/forms";
import { saveSeriesPricing, updateSeries } from "../../tests/actions";
import type { Product } from "@/lib/types";

export default async function SeriesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireStaff(`/admin/series/${id}`);
  const isAdmin = (await getViewer())?.profile.role === "admin";
  const supabase = await createClient();
  const [{ data: s }, { data: product }, { data: links }] = await Promise.all([
    supabase.from("test_series").select("*").eq("id", id).maybeSingle(),
    supabase.from("products").select("*").eq("test_series_id", id).maybeSingle<Product>(),
    supabase.from("test_series_tests").select("test:tests(id,title,status)").eq("series_id", id),
  ]);
  if (!s) notFound();
  const tests = (links ?? []).map((l) => (Array.isArray(l.test) ? l.test[0] : l.test) as { id: string; title: string; status: string } | null).filter(Boolean);
  return (
    <>
      <Link href="/admin/series" className="tap text-sm text-ink-3 hover:text-ink">← Test series</Link>
      <h1 className="h2 mb-8 mt-3">{s.title}</h1>
      <div className="grid max-w-5xl gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <ActionForm action={updateSeries} className="space-y-5">
            <input type="hidden" name="id" value={id} />
            <label className="block"><Label>Title</Label><Input name="title" defaultValue={s.title} required /></label>
            <label className="block"><Label>Description</Label><Textarea name="description" defaultValue={s.description ?? ""} rows={4} /></label>
            <label className="block"><Label>Status</Label><Select name="status" defaultValue={s.status}><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></Select></label>
            <Submit>Save</Submit>
          </ActionForm>
        </Card>
        <div className="space-y-6">
          {isAdmin && (
            <Card className="p-6">
              <p className="mb-4 font-semibold">Pricing</p>
              <ActionForm action={saveSeriesPricing} className="grid gap-4 sm:grid-cols-2">
                <input type="hidden" name="series_id" value={id} />
                <label className="block"><Label>Price (₹)</Label><Input name="price" type="number" min={0} defaultValue={product ? product.price_paise / 100 : ""} required /></label>
                <label className="block"><Label hint="optional">Sale (₹)</Label><Input name="sale_price" type="number" min={0} defaultValue={product?.sale_price_paise != null ? product.sale_price_paise / 100 : ""} /></label>
                <label className="block"><Label hint="blank = lifetime">Access days</Label><Input name="validity_days" type="number" min={1} defaultValue={product?.validity_days ?? ""} /></label>
                <label className="block"><Label>Access until</Label><Input name="access_until" type="date" defaultValue={product?.access_until ?? ""} /></label>
                <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" name="is_active" defaultChecked={product?.is_active ?? true} className="size-4 accent-violet-600" />On sale</label>
                <div className="sm:col-span-2"><Submit>Save pricing</Submit></div>
              </ActionForm>
            </Card>
          )}
          <Card className="p-6">
            <p className="mb-3 font-semibold">Tests in this series</p>
            <ul className="space-y-1.5 text-sm">{tests.map((t) => <li key={t!.id}><Link href={`/admin/tests/${t!.id}?tab=access`} className="hover:underline">{t!.title}</Link> <span className="text-ink-3">· {t!.status}</span></li>)}</ul>
            {!tests.length && <p className="text-sm text-ink-3">None yet. Open a test → Access → tick this series.</p>}
          </Card>
        </div>
      </div>
    </>
  );
}
