"use server";

import { redirect } from "next/navigation";
import { requireAdmin, requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { dbMessage, refresh, str } from "@/lib/action";
import { slugify } from "@/lib/format";
import type { Result } from "@/lib/result";

const E = (e: { code?: string; message: string }): Result => ({ error: dbMessage(e) });
const page = (id: string) => `/admin/tests/${id}`;
const num = (f: FormData, k: string) => (str(f, k) === "" ? null : Number(str(f, k)));

export async function createTest(f: FormData): Promise<Result> {
  const { user } = await requireStaff();
  const title = str(f, "title");
  if (!title) return { error: "Enter a test title" };
  const supabase = await createClient();
  let slug = slugify(title);
  const { data: clash } = await supabase.from("tests").select("id").eq("slug", slug).maybeSingle();
  if (clash) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
  const kind = str(f, "kind") || "full_mock";
  const examId = str(f, "exam_id");
  const { data: exam } = await supabase.from("exams").select("code").eq("id", examId).single();
  const cat = exam?.code.startsWith("CAT");
  const duration = Number(str(f, "duration_minutes")) || (cat ? 120 : 180);
  const { data, error } = await supabase.from("tests").insert({ title, slug, exam_id: examId, kind, duration_minutes: duration, created_by: user.id }).select("id").single();
  if (error) return E(error);
  // Sensible starting sections that mirror the real exam.
  const sections = kind === "full_mock"
    ? (cat ? [["VARC", 40], ["DILR", 40], ["QA", 40]] : [["General Aptitude", null], ["Computer Science", null]])
    : [["Section 1", null]];
  await supabase.from("test_sections").insert(sections.map(([name, d], i) => ({ test_id: data.id, name, position: i + 1, duration_minutes: d })));
  refresh("/admin/tests");
  redirect(page(data.id));
}

export async function updateTest(f: FormData): Promise<Result> {
  const { profile } = await requireStaff();
  const id = str(f, "id");
  const row: Record<string, unknown> = {
    title: str(f, "title"), slug: slugify(str(f, "slug")), kind: str(f, "kind"), instructions: str(f, "instructions") || null,
    duration_minutes: Number(str(f, "duration_minutes")), max_attempts: num(f, "max_attempts"),
    available_from: str(f, "available_from") ? new Date(str(f, "available_from")).toISOString() : null,
    available_until: str(f, "available_until") ? new Date(str(f, "available_until")).toISOString() : null,
    status: str(f, "status"),
  };
  if (profile.role === "admin") row.is_free = f.get("is_free") === "on";
  const supabase = await createClient();
  const { error } = await supabase.from("tests").update(row).eq("id", id);
  if (error) return E(error);
  refresh(page(id), "/admin/tests", "/app/tests");
  return { ok: row.status === "published" ? "Saved · live for students" : "Saved" };
}

export async function deleteTest(f: FormData): Promise<Result> {
  await requireStaff();
  const supabase = await createClient();
  const { error } = await supabase.from("tests").delete().eq("id", str(f, "id"));
  if (error) return E(error);
  refresh("/admin/tests");
  redirect("/admin/tests");
}

export async function addTestSection(f: FormData): Promise<Result> {
  await requireStaff();
  const testId = str(f, "test_id"), name = str(f, "name");
  if (!name) return { error: "Enter a section name" };
  const supabase = await createClient();
  const { count } = await supabase.from("test_sections").select("*", { count: "exact", head: true }).eq("test_id", testId);
  const { error } = await supabase.from("test_sections").insert({ test_id: testId, name, position: (count ?? 0) + 1, duration_minutes: num(f, "duration_minutes") });
  if (error) return E(error);
  refresh(page(testId));
  return { ok: "Section added" };
}

export async function updateTestSection(f: FormData): Promise<Result> {
  await requireStaff();
  const supabase = await createClient();
  const patch: Record<string, unknown> = {};
  if (f.has("name")) patch.name = str(f, "name");
  if (f.has("duration_minutes")) patch.duration_minutes = num(f, "duration_minutes");
  const { error } = await supabase.from("test_sections").update(patch).eq("id", str(f, "id"));
  if (error) return E(error);
  refresh(page(str(f, "test_id")));
  return f.has("duration_minutes") ? { ok: "Section timer saved" } : undefined;
}

export async function deleteTestSection(f: FormData): Promise<Result> {
  await requireStaff();
  const supabase = await createClient();
  const { error } = await supabase.from("test_sections").delete().eq("id", str(f, "id"));
  if (error) return E(error);
  refresh(page(str(f, "test_id")));
  return { ok: "Section removed" };
}

export async function addQuestionsToSection(testId: string, sectionId: string, questionIds: string[]): Promise<Result> {
  await requireStaff();
  if (!questionIds.length) return { error: "Select at least one question" };
  const supabase = await createClient();
  const { data: existing } = await supabase.from("test_questions").select("question_id, position").eq("test_id", testId);
  const have = new Set((existing ?? []).map((r) => r.question_id));
  const fresh = questionIds.filter((q) => !have.has(q));
  if (!fresh.length) return { error: "Those questions are already in this test" };
  const start = Math.max(0, ...(existing ?? []).map((r) => r.position));
  const { error } = await supabase.from("test_questions").insert(fresh.map((q, i) => ({ test_id: testId, section_id: sectionId, question_id: q, position: start + i + 1 })));
  if (error) return E(error);
  refresh(page(testId));
  return { ok: `${fresh.length} question${fresh.length === 1 ? "" : "s"} added` };
}

export async function removeTestQuestion(f: FormData): Promise<Result> {
  await requireStaff();
  const supabase = await createClient();
  const { error } = await supabase.from("test_questions").delete().eq("id", str(f, "id"));
  if (error) return E(error);
  refresh(page(str(f, "test_id")));
}

export async function moveTestQuestion(f: FormData): Promise<Result> {
  await requireStaff();
  const id = str(f, "id"), dir = Number(f.get("dir"));
  const supabase = await createClient();
  const { data: me } = await supabase.from("test_questions").select("section_id").eq("id", id).single();
  if (!me) return;
  const { data: sib } = await supabase.from("test_questions").select("id").eq("section_id", me.section_id).order("position").order("id");
  const list = sib ?? [];
  const i = list.findIndex((s) => s.id === id), j = i + dir;
  if (i < 0 || j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j], list[i]];
  await Promise.all(list.map((s, n) => supabase.from("test_questions").update({ position: n + 1 }).eq("id", s.id)));
  refresh(page(str(f, "test_id")));
}

export async function setLinks(f: FormData): Promise<Result> {
  await requireStaff();
  const testId = str(f, "test_id");
  const courses = f.getAll("courses").map(String), series = f.getAll("series").map(String);
  const supabase = await createClient();
  await supabase.from("course_tests").delete().eq("test_id", testId);
  await supabase.from("test_series_tests").delete().eq("test_id", testId);
  if (courses.length) { const { error } = await supabase.from("course_tests").insert(courses.map((c) => ({ course_id: c, test_id: testId }))); if (error) return E(error); }
  if (series.length) { const { error } = await supabase.from("test_series_tests").insert(series.map((s) => ({ series_id: s, test_id: testId }))); if (error) return E(error); }
  refresh(page(testId));
  return { ok: "Access saved" };
}

/* ---------------- Test series ---------------- */
export async function createSeries(f: FormData): Promise<Result> {
  const { user } = await requireStaff();
  const title = str(f, "title");
  if (!title) return { error: "Enter a title" };
  const supabase = await createClient();
  const { data, error } = await supabase.from("test_series").insert({ title, slug: `${slugify(title)}-${Math.random().toString(36).slice(2, 5)}`, exam_id: str(f, "exam_id"), created_by: user.id }).select("id").single();
  if (error) return E(error);
  refresh("/admin/series");
  redirect(`/admin/series/${data.id}`);
}

export async function updateSeries(f: FormData): Promise<Result> {
  await requireStaff();
  const supabase = await createClient();
  const { error } = await supabase.from("test_series").update({ title: str(f, "title"), description: str(f, "description") || null, status: str(f, "status") }).eq("id", str(f, "id"));
  if (error) return E(error);
  refresh(`/admin/series/${str(f, "id")}`, "/admin/series");
  return { ok: "Saved" };
}

export async function saveSeriesPricing(f: FormData): Promise<Result> {
  await requireAdmin();
  const seriesId = str(f, "series_id");
  const price = Math.round(Number(str(f, "price")) * 100);
  const sale = str(f, "sale_price") === "" ? null : Math.round(Number(str(f, "sale_price")) * 100);
  if (!(price >= 0)) return { error: "Enter a price (0 for free)" };
  if (sale != null && sale > price) return { error: "Sale price can't be higher than the price" };
  const row = { price_paise: price, sale_price_paise: sale, validity_days: num(f, "validity_days"), access_until: str(f, "access_until") || null, is_active: f.get("is_active") === "on" };
  const supabase = await createClient();
  const { data: ex } = await supabase.from("products").select("id").eq("test_series_id", seriesId).maybeSingle();
  const { error } = ex ? await supabase.from("products").update(row).eq("id", ex.id) : await supabase.from("products").insert({ ...row, type: "test_series", test_series_id: seriesId });
  if (error) return E(error);
  refresh(`/admin/series/${seriesId}`);
  return { ok: "Pricing saved" };
}

export type PickerRow = { id: string; type: string; difficulty: string; stem: string; marks: number; is_pyq: boolean; pyq_year: number | null; topic: string };
/** Published questions for the picker. */
export async function searchQuestions(examId: string, term: string, type: string, sectionId: string): Promise<PickerRow[]> {
  await requireStaff();
  const supabase = await createClient();
  let q = supabase.from("questions").select("id,type,difficulty,stem,marks,is_pyq,pyq_year,topic:topics!inner(name,section_id)")
    .eq("exam_id", examId).eq("status", "published").order("updated_at", { ascending: false }).limit(60);
  const t = term.replace(/[%,()]/g, "").trim();
  if (t) q = q.ilike("stem", `%${t}%`);
  if (type) q = q.eq("type", type);
  if (sectionId) q = q.eq("topic.section_id", sectionId);
  const { data } = await q;
  return (data ?? []).map((r) => ({ ...r, topic: (Array.isArray(r.topic) ? r.topic[0] : r.topic)?.name ?? "" })) as PickerRow[];
}

export async function setQuestionMarks(f: FormData): Promise<Result> {
  await requireStaff();
  const supabase = await createClient();
  const { error } = await supabase.from("test_questions").update({ marks: num(f, "marks"), negative_marks: num(f, "negative_marks") }).eq("id", str(f, "id"));
  if (error) return E(error);
  refresh(page(str(f, "test_id")));
  return { ok: "Marks saved" };
}
