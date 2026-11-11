import { LinkButton, PageHeader } from "@/components/ui";
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
    <div className="rounded-2xl border border-line bg-paper p-5"><p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-3">{label}</p><p className="mt-2 font-display text-3xl font-bold tracking-tight">{value}</p></div>
  );
  const days = activity as { day: string; active_users: number }[];
  return (
    <>
      <PageHeader eyebrow={`${profile.role} console`} title="Overview" subtitle={`Welcome back${profile.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}. Here's how V4 is doing.`}
        action={<div className="flex gap-2"><LinkButton href="/admin/courses" variant="outline" size="sm">Courses</LinkButton><LinkButton href="/admin/syllabus" size="sm">Syllabus</LinkButton></div>} />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        {isAdmin && stat("Students", students)}
        {stat("Courses", courses)}
        {stat("Lectures", lectures)}
        {stat("Questions", questions)}
        {stat("Tests", tests)}
        {isAdmin && stat("Revenue · 14d", revenue ? rupees(revenue) : "₹0")}
      </div>

      {isAdmin && (
        <div className="mt-6 rounded-2xl border border-line bg-paper p-6">
          <div className="flex items-baseline justify-between"><p className="font-semibold">Daily active students</p><p className="text-sm text-ink-3">Last 14 days</p></div>
          <div className="mt-6 flex h-40 items-stretch gap-1.5 sm:gap-2" role="img" aria-label="Daily active students, last 14 days">
            {days.map((d) => (
              <div key={d.day} className="group relative flex h-full flex-1 flex-col justify-end">
                <span className="pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 rounded-md bg-ink px-1.5 py-0.5 text-[11px] font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100">{d.active_users}</span>
                <div className="w-full rounded-t-md bg-violet-500/85 transition-colors group-hover:bg-violet-600" style={{ height: `${Math.max(3, (Number(d.active_users) / maxActive) * 100)}%` }} />
              </div>
            ))}
          </div>
          <div className="mt-2 flex justify-between text-[11px] text-ink-4">
            <span>{days[0] && new Date(days[0].day).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
            <span>{days.at(-1) && new Date(days.at(-1)!.day).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
          </div>
        </div>
      )}

      <div className="mt-6 rounded-2xl border border-line bg-paper p-6">
        <div className="flex items-baseline justify-between">
          <p className="font-semibold">Storage</p>
          <p className="text-sm text-ink-3">{bytes(used)} of {bytes(FREE_PLAN_BYTES)} (Supabase free plan)</p>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-wash">
          <div className="h-full rounded-full bg-violet-500" style={{ width: `${Math.min(100, (used / FREE_PLAN_BYTES) * 100)}%` }} />
        </div>
        <p className="mt-2 text-xs text-ink-3">Each video can be up to 50 MB on the free plan. Upgrade to Supabase Pro for 100 GB.</p>
      </div>
    </>
  );
}
