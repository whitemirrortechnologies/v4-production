import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Badge, Card, Empty, Input, Label, PageHeader, Select } from "@/components/ui";
import { ActionForm, Submit } from "@/components/forms";
import { createSeries } from "../tests/actions";

export const metadata = { title: "Test series · Admin" };

export default async function SeriesAdmin() {
  await requireStaff("/admin/series");
  const supabase = await createClient();
  const [{ data: series }, { data: exams }] = await Promise.all([
    supabase.from("test_series").select("id,title,status,exam:exams(name),test_series_tests(count),products(price_paise,sale_price_paise)").order("created_at", { ascending: false }),
    supabase.from("exams").select("id,name").eq("is_active", true).order("position"),
  ]);
  return (
    <>
      <Link href="/admin/tests" className="tap text-sm text-ink-3 hover:text-ink">← Tests</Link>
      <div className="mt-3"><PageHeader title="Test series" subtitle="Bundles of tests sold on their own. Add tests to a series from each test's Access tab." /></div>
      <Card className="mb-8 p-5">
        <ActionForm action={createSeries} className={`grid gap-4 ${(exams ?? []).length > 1 ? "sm:grid-cols-[1fr_14rem_auto]" : "sm:grid-cols-[1fr_auto]"} sm:items-end`}>
          <label className="block"><Label>New series title</Label><Input name="title" placeholder="CAT 2027 Mock Series" required /></label>
          {(exams ?? []).length > 1
            ? <label className="block"><Label>Exam</Label><Select name="exam_id">{(exams ?? []).map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}</Select></label>
            : <input type="hidden" name="exam_id" value={exams?.[0]?.id ?? ""} />}
          <Submit>Create</Submit>
        </ActionForm>
      </Card>
      {series?.length ? (
        <div className="overflow-hidden rounded-2xl border border-line bg-paper">
          {series.map((s) => {
            const exam = (Array.isArray(s.exam) ? s.exam[0] : s.exam) as { name: string } | null;
            const p = (Array.isArray(s.products) ? s.products[0] : s.products) as { price_paise: number; sale_price_paise: number | null } | null;
            return (
              <Link key={s.id} href={`/admin/series/${s.id}`} className="flex items-center justify-between gap-3 border-b border-line px-5 py-4 last:border-0 hover:bg-wash/60">
                <div><p className="font-semibold">{s.title}</p><p className="mt-1 text-sm text-ink-3">{exam?.name} · {(s.test_series_tests as { count: number }[])?.[0]?.count ?? 0} tests · {p ? `₹${((p.sale_price_paise ?? p.price_paise) / 100).toLocaleString("en-IN")}` : "no price"}</p></div>
                <Badge tone={s.status === "published" ? "good" : "neutral"}>{s.status}</Badge>
              </Link>
            );
          })}
        </div>
      ) : <Empty title="No test series yet" />}
    </>
  );
}
