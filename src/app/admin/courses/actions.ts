"use server";

import { redirect } from "next/navigation";
import { requireAdmin, requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { dbMessage, fail, refresh } from "@/lib/action";
import { slugify } from "@/lib/format";

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const page = (id: string) => `/admin/courses/${id}`;
const rup = (v: string) => (v === "" ? null : Math.round(Number(v) * 100));

export async function createCourse(f: FormData) {
  const { user } = await requireStaff();
  const title = str(f, "title");
  if (!title) fail("/admin/courses", "Enter a course title");
  const slug = slugify(str(f, "slug") || title);
  if (!slug) fail("/admin/courses", "Use letters or numbers in the title");
  const supabase = await createClient();
  const { data, error } = await supabase.from("courses")
    .insert({ title, slug, exam_id: str(f, "exam_id"), subtitle: str(f, "subtitle") || null, created_by: user.id })
    .select("id").single();
  if (error) fail("/admin/courses", dbMessage(error));
  refresh("/admin/courses");
  redirect(page(data.id));
}

export async function updateCourse(f: FormData) {
  await requireStaff();
  const id = str(f, "id");
  const status = str(f, "status");
  const supabase = await createClient();
  const { error } = await supabase.from("courses").update({
    title: str(f, "title"), subtitle: str(f, "subtitle") || null, description: str(f, "description") || null,
    slug: slugify(str(f, "slug")), status,
  }).eq("id", id);
  if (error) fail(page(id), dbMessage(error));
  refresh(page(id), "/admin/courses", "/courses", "/");
  redirect(`${page(id)}?saved=1`);
}

export async function deleteCourse(f: FormData) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("courses").delete().eq("id", str(f, "id"));
  if (error) fail(page(str(f, "id")), dbMessage(error));
  refresh("/admin/courses");
  redirect("/admin/courses");
}

/** Price, sale price, validity. Admin only (the database enforces this too). */
export async function savePricing(f: FormData) {
  await requireAdmin();
  const courseId = str(f, "course_id");
  const price = rup(str(f, "price"));
  const sale = rup(str(f, "sale_price"));
  if (price == null || price < 0) fail(page(courseId), "Enter a price (0 for free)");
  if (sale != null && sale > price) fail(page(courseId), "Sale price can't be higher than the price");
  const days = str(f, "validity_days");
  const row = {
    price_paise: price, sale_price_paise: sale,
    validity_days: days ? Number(days) : null,
    access_until: str(f, "access_until") || null,
    is_active: f.get("is_active") === "on",
  };
  const supabase = await createClient();
  const { data: existing } = await supabase.from("products").select("id").eq("course_id", courseId).maybeSingle();
  const { error } = existing
    ? await supabase.from("products").update(row).eq("id", existing.id)
    : await supabase.from("products").insert({ ...row, type: "course", course_id: courseId });
  if (error) fail(page(courseId), dbMessage(error));
  refresh(page(courseId), "/courses", "/");
  redirect(`${page(courseId)}?saved=1`);
}

type Level = "course_subjects" | "course_modules" | "course_chapters";
const LEVELS: Record<Level, { parent: string }> = {
  course_subjects: { parent: "course_id" },
  course_modules: { parent: "subject_id" },
  course_chapters: { parent: "module_id" },
};

export async function addNode(f: FormData) {
  await requireStaff();
  const table = str(f, "table") as Level;
  if (!(table in LEVELS)) return;
  const courseId = str(f, "course_id");
  const title = str(f, "title");
  if (!title) fail(page(courseId), "Enter a title");
  const parentCol = LEVELS[table].parent, parentId = str(f, "parent_id");
  const supabase = await createClient();
  const { count } = await supabase.from(table).select("*", { count: "exact", head: true }).eq(parentCol, parentId);
  const { error } = await supabase.from(table).insert({ [parentCol]: parentId, title, position: (count ?? 0) + 1 });
  if (error) fail(page(courseId), dbMessage(error));
  refresh(page(courseId));
}

export async function renameNode(f: FormData) {
  await requireStaff();
  const table = str(f, "table") as Level;
  if (!(table in LEVELS) && table !== ("lectures" as string)) return;
  const supabase = await createClient();
  const { error } = await supabase.from(table).update({ title: str(f, "title") }).eq("id", str(f, "id"));
  if (error) fail(page(str(f, "course_id")), dbMessage(error));
  refresh(page(str(f, "course_id")));
}

export async function deleteNode(f: FormData) {
  await requireStaff();
  const table = str(f, "table") as Level | "lectures";
  if (!(table in LEVELS) && table !== "lectures") return;
  const supabase = await createClient();
  if (table === "lectures") {
    const { data: lec } = await supabase.from("lectures").select("video_path, notes_path").eq("id", str(f, "id")).single();
    if (lec?.video_path) await supabase.storage.from("lecture-videos").remove([lec.video_path]);
    if (lec?.notes_path) await supabase.storage.from("lecture-notes").remove([lec.notes_path]);
  }
  const { error } = await supabase.from(table).delete().eq("id", str(f, "id"));
  if (error) fail(page(str(f, "course_id")), dbMessage(error));
  refresh(page(str(f, "course_id")));
}

export async function moveNode(f: FormData) {
  await requireStaff();
  const table = str(f, "table") as Level | "lectures";
  const parentCol = table === "lectures" ? "chapter_id" : LEVELS[table as Level]?.parent;
  if (!parentCol) return;
  const id = str(f, "id"), dir = Number(f.get("dir"));
  const supabase = await createClient();
  const { data: me } = await supabase.from(table).select("*").eq("id", id).single();
  if (!me) return;
  const { data: sib } = await supabase.from(table).select("id").eq(parentCol, me[parentCol]).order("position").order("id");
  const list = sib ?? [];
  const i = list.findIndex((s) => s.id === id), j = i + dir;
  if (i < 0 || j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j], list[i]];
  await Promise.all(list.map((s, n) => supabase.from(table).update({ position: n + 1 }).eq("id", s.id)));
  refresh(page(str(f, "course_id")));
}

export async function addLecture(f: FormData) {
  const { user } = await requireStaff();
  const courseId = str(f, "course_id"), title = str(f, "title");
  if (!title) fail(page(courseId), "Enter a lecture title");
  const chapterId = str(f, "chapter_id");
  const supabase = await createClient();
  const { count } = await supabase.from("lectures").select("*", { count: "exact", head: true }).eq("chapter_id", chapterId);
  const { data, error } = await supabase.from("lectures")
    .insert({ chapter_id: chapterId, title, position: (count ?? 0) + 1, created_by: user.id }).select("id").single();
  if (error) fail(page(courseId), dbMessage(error));
  refresh(page(courseId));
  redirect(`${page(courseId)}/lectures/${data.id}`);
}

export async function updateLecture(f: FormData) {
  await requireStaff();
  const courseId = str(f, "course_id"), id = str(f, "id");
  const row: Record<string, unknown> = {
    title: str(f, "title"), description: str(f, "description") || null, status: str(f, "status"),
  };
  // Only admins send/receive this flag; the database blocks faculty from changing it anyway.
  if (f.has("is_free_preview_present")) row.is_free_preview = f.get("is_free_preview") === "on";
  const supabase = await createClient();
  const { error } = await supabase.from("lectures").update(row).eq("id", id);
  if (error) fail(`${page(courseId)}/lectures/${id}`, dbMessage(error));
  refresh(page(courseId), `${page(courseId)}/lectures/${id}`);
  redirect(`${page(courseId)}/lectures/${id}?saved=1`);
}

/** Called by the browser after a successful direct upload to Storage. */
export async function recordVideo(input: {
  lectureId: string; courseId: string; path: string; size: number; durationSeconds: number;
}) {
  await requireStaff();
  const supabase = await createClient();
  const { data: old } = await supabase.from("lectures").select("video_path").eq("id", input.lectureId).single();
  const { error } = await supabase.from("lectures").update({
    video_provider: "supabase", video_path: input.path, video_status: "ready",
    video_size_bytes: input.size, duration_seconds: Math.round(input.durationSeconds),
  }).eq("id", input.lectureId);
  if (error) return { error: dbMessage(error) };
  if (old?.video_path && old.video_path !== input.path) await supabase.storage.from("lecture-videos").remove([old.video_path]);
  refresh(page(input.courseId), `${page(input.courseId)}/lectures/${input.lectureId}`);
  return { ok: true as const };
}

export async function removeVideo(f: FormData) {
  await requireStaff();
  const id = str(f, "id"), courseId = str(f, "course_id");
  const supabase = await createClient();
  const { data: lec } = await supabase.from("lectures").select("video_path").eq("id", id).single();
  if (lec?.video_path) await supabase.storage.from("lecture-videos").remove([lec.video_path]);
  const { error } = await supabase.from("lectures").update({
    video_path: null, video_status: "none", video_size_bytes: null, duration_seconds: null,
  }).eq("id", id);
  if (error) fail(`${page(courseId)}/lectures/${id}`, dbMessage(error));
  refresh(page(courseId), `${page(courseId)}/lectures/${id}`);
  redirect(`${page(courseId)}/lectures/${id}`);
}
