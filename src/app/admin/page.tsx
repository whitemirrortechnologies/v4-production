import { Card, PageHeader } from "@/components/ui";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { bytes, rupees } from "@/lib/format";

export const metadata = { title: "Admin" };
const FREE_PLAN_BYTES = 1073741824; // Supabase Free: 1 GB storage

export default async function AdminHome() {
  const { profile } = await requireStaff();
  const supabase = await createClient();
  const count = async (table: string, f?: (q: any) => any) => {
    const q = supabase.from(table).select("*", { count: "exact", head: true });
    return (f ? await f(q) : await q).count ?? 0;
  };
  const isAdmin = profile.role === "admin";
  const [courses, lectures, questions, tests, students] = await Promise.all([
    count("courses"), count("lectures"), count("questions"), count("tests"),
    isAdmin ? count("profiles", (q) => q.eq("role", "student")) : Promise.resolve(0),
  ]);
  const activity = isAdmin ? (await supabase.rpc("admin_daily_activity", { p_days: 14 })).data ?? [] : [];
  const storage = (await supabase.rpc("admin_storage_usage")).data ?? [];
  const used = (storage as { total_bytes: number }[]).reduce((n, r) => n + Number(r.total_bytes), 0);
  const revenue = (activity as { revenue_paise: number }[]).reduce((n, r) => n + Number(r.revenue_paise), 0);
  const maxActive = Math.max(1, ...(activity as { active_users: number }[]).map((d) => Number(d.active_users)));

  const stat = (label: string, value: string | number) => (
    <Card className="p-5"><p className="text-sm text-ink-3">{label}</p><p className="mt-1 text-3xl font-semibold tracking-tight">{value}</p></Card>
  );
  return (
    <>
      <PageHeader title="Overview" subtitle={`Welcome back${profile.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}.`} />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {isAdmin && stat("Students", students)}
        {stat("Courses", courses)}
        {stat("Lectures", lectures)}
        {stat("Questions", questions)}
        {stat("Tests", tests)}
        {isAdmin && stat("Revenue (14 days)", rupees(revenue) === "Free" ? "₹0" : rupees(revenue))}
      </div>

      {isAdmin && (
        <Card className="mt-6 p-6">
          <p className="font-medium">Daily active students · last 14 days</p>
          <div className="mt-5 flex h-32 items-end gap-1.5" role="img" aria-label="Daily active students">
            {(activity as { day: string; active_users: number }[]).map((d) => (
              <div key={d.day} className="flex flex-1 flex-col items-center gap-1" title={`${d.day}: ${d.active_users}`}>
                <div className="w-full rounded-t-md bg-violet-500" style={{ height: `${Math.max(4, (Number(d.active_users) / maxActive) * 100)}%` }} />
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card className="mt-6 p-6">
        <div className="flex items-baseline justify-between">
          <p className="font-medium">Storage (Supabase free plan)</p>
          <p className="text-sm text-ink-3">{bytes(used)} of {bytes(FREE_PLAN_BYTES)}</p>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-wash">
          <div className="h-full rounded-full bg-violet-500" style={{ width: `${Math.min(100, (used / FREE_PLAN_BYTES) * 100)}%` }} />
        </div>
        <p className="mt-2 text-xs text-ink-3">Each video can be up to 50 MB on the free plan.</p>
      </Card>
    </>
  );
}
