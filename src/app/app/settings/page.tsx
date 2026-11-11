import { requireViewer } from "@/lib/auth";
import { SiteHeader } from "@/components/site-header";
import { Card, Input, Label, PageHeader, Select } from "@/components/ui";
import { ActionForm, Submit } from "@/components/forms";
import { getExams } from "@/lib/catalog";
import { createClient } from "@/lib/supabase/server";
import { changePassword, updateProfile } from "./actions";

export const metadata = { title: "Settings" };

export default async function Settings() {
  const { user, profile } = await requireViewer("/app/settings");
  const exams = await getExams();
  const supabase = await createClient();
  const { data: orders } = await supabase.from("orders").select("id,status,amount_paise,created_at,product:products(type,course:courses(title),series:test_series(title),title)").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20);
  const one = <T,>(v: T | T[] | null | undefined) => (Array.isArray(v) ? v[0] : v) ?? null;
  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto max-w-3xl px-4 py-14 sm:px-8">
        <PageHeader eyebrow="Account" title="Settings" />
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="mb-5 font-display text-lg font-bold tracking-tight">Profile</h2>
            <ActionForm action={updateProfile} className="grid gap-5 sm:grid-cols-2">
              <label className="block sm:col-span-2"><Label>Full name</Label><Input name="full_name" defaultValue={profile.full_name ?? ""} autoComplete="name" required /></label>
              <label className="block"><Label>Email</Label><Input value={user.email ?? ""} disabled readOnly className="bg-wash text-ink-3" /></label>
              <label className="block"><Label hint="optional">Phone</Label><Input name="phone" type="tel" defaultValue={(profile as { phone?: string }).phone ?? ""} autoComplete="tel" /></label>
              <label className="block sm:col-span-2"><Label>Preparing for</Label>
                <Select name="target_exam_id" defaultValue={profile.target_exam_id ?? ""}><option value="">Not decided</option>{exams.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}</Select>
              </label>
              <div><Submit>Save profile</Submit></div>
            </ActionForm>
          </Card>
          <Card className="p-6">
            <h2 className="mb-5 font-display text-lg font-bold tracking-tight">Change password</h2>
            <ActionForm action={changePassword} resetOnSuccess className="grid gap-5 sm:grid-cols-2">
              <label className="block"><Label hint="6+ characters">New password</Label><Input name="password" type="password" autoComplete="new-password" minLength={6} required /></label>
              <label className="block"><Label>Confirm</Label><Input name="confirm" type="password" autoComplete="new-password" minLength={6} required /></label>
              <div><Submit variant="outline">Update password</Submit></div>
            </ActionForm>
          </Card>
          <Card className="p-6">
            <h2 className="mb-4 font-display text-lg font-bold tracking-tight">Purchases</h2>
            {orders?.length ? (
              <ul className="divide-y divide-line text-sm">
                {orders.map((o) => {
                  const p = one(o.product as never) as { title: string | null; course: unknown; series: unknown } | null;
                  const name = (one(p?.course as never) as { title: string } | null)?.title ?? (one(p?.series as never) as { title: string } | null)?.title ?? p?.title ?? "—";
                  return <li key={o.id} className="flex justify-between gap-3 py-3"><span>{name}<span className="block text-xs text-ink-3">{new Date(o.created_at).toLocaleDateString("en-IN")} · {o.status}</span></span><span className="font-semibold">₹{(o.amount_paise / 100).toLocaleString("en-IN")}</span></li>;
                })}
              </ul>
            ) : <p className="text-sm text-ink-3">No purchases yet.</p>}
          </Card>
        </div>
      </main>
    </>
  );
}
