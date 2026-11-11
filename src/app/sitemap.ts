import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const fixed = ["", "/exams", "/courses", "/login", "/signup", "/terms", "/privacy", "/refund-policy", "/contact"].map((p) => ({ url: `${base}${p}`, changeFrequency: "weekly" as const }));
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return fixed;
  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const [{ data: courses }, { data: exams }] = await Promise.all([
    supabase.from("courses").select("slug,updated_at").eq("status", "published"),
    supabase.from("exams").select("code").eq("is_active", true),
  ]);
  return [
    ...fixed,
    ...(exams ?? []).map((e) => ({ url: `${base}/exams/${e.code.toLowerCase()}` })),
    ...(courses ?? []).map((c) => ({ url: `${base}/courses/${c.slug}`, lastModified: c.updated_at })),
  ];
}
