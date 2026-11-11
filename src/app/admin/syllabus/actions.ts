"use server";

import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { dbMessage, fail, refresh } from "@/lib/action";
import { slugify } from "@/lib/format";

const back = (exam: FormDataEntryValue | null) => `/admin/syllabus?exam=${encodeURIComponent(String(exam ?? ""))}`;
const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

async function done(path: string, error: { code?: string; message: string } | null) {
  if (error) fail(path, dbMessage(error));
  refresh("/admin/syllabus");
}

export async function addExam(f: FormData) {
  await requireStaff();
  const code = str(f, "code").toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  const name = str(f, "name");
  if (!code || !name) fail("/admin/syllabus", "Enter a code and a name");
  const supabase = await createClient();
  const { count } = await supabase.from("exams").select("*", { count: "exact", head: true });
  const { error } = await supabase.from("exams").insert({ code, name, description: str(f, "description") || null, position: (count ?? 0) + 1 });
  await done("/admin/syllabus", error);
}

export async function updateExam(f: FormData) {
  await requireStaff();
  const supabase = await createClient();
  const { error } = await supabase.from("exams").update({
    name: str(f, "name"), description: str(f, "description") || null, is_active: f.get("is_active") === "on",
  }).eq("id", str(f, "id"));
  await done(back(f.get("exam")), error);
}

export async function addSection(f: FormData) {
  await requireStaff();
  const name = str(f, "name");
  if (!name) fail(back(f.get("exam")), "Enter a section name");
  const supabase = await createClient();
  const examId = str(f, "exam_id");
  const { count } = await supabase.from("syllabus_sections").select("*", { count: "exact", head: true }).eq("exam_id", examId);
  const { error } = await supabase.from("syllabus_sections").insert({ exam_id: examId, name, position: (count ?? 0) + 1 });
  await done(back(f.get("exam")), error);
}

export async function renameSection(f: FormData) {
  await requireStaff();
  const supabase = await createClient();
  const { error } = await supabase.from("syllabus_sections").update({ name: str(f, "name") }).eq("id", str(f, "id"));
  await done(back(f.get("exam")), error);
}

export async function deleteSection(f: FormData) {
  await requireStaff();
  const supabase = await createClient();
  const id = str(f, "id");
  const { data: topics } = await supabase.from("topics").select("id").eq("section_id", id);
  const ids = (topics ?? []).map((t) => t.id);
  if (ids.length) {
    const { count } = await supabase.from("questions").select("*", { count: "exact", head: true }).in("topic_id", ids);
    if (count) fail(back(f.get("exam")), `${count} question(s) use topics in this section. Move them to another topic first.`);
  }
  const { error } = await supabase.from("syllabus_sections").delete().eq("id", id);
  await done(back(f.get("exam")), error);
}

export async function addTopic(f: FormData) {
  await requireStaff();
  const name = str(f, "name");
  if (!name) fail(back(f.get("exam")), "Enter a topic name");
  const supabase = await createClient();
  const sectionId = str(f, "section_id");
  const parentId = str(f, "parent_id") || null;
  const sib = supabase.from("topics").select("*", { count: "exact", head: true }).eq("section_id", sectionId);
  const { count } = await (parentId ? sib.eq("parent_id", parentId) : sib.is("parent_id", null));
  let slug = slugify(name);
  if (!slug) fail(back(f.get("exam")), "Use letters or numbers in the name");
  const { data: clash } = await supabase.from("topics").select("id").eq("section_id", sectionId).eq("slug", slug).maybeSingle();
  if (clash) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
  const { error } = await supabase.from("topics").insert({ section_id: sectionId, parent_id: parentId, name, slug, position: (count ?? 0) + 1 });
  await done(back(f.get("exam")), error);
}

export async function renameTopic(f: FormData) {
  await requireStaff();
  const supabase = await createClient();
  const { error } = await supabase.from("topics").update({ name: str(f, "name") }).eq("id", str(f, "id"));
  await done(back(f.get("exam")), error);
}

export async function deleteTopic(f: FormData) {
  await requireStaff();
  const supabase = await createClient();
  const id = str(f, "id");
  const { count } = await supabase.from("questions").select("*", { count: "exact", head: true }).eq("topic_id", id);
  if (count) fail(back(f.get("exam")), `${count} question(s) use this topic. Move them to another topic first.`);
  const { error } = await supabase.from("topics").delete().eq("id", id);
  await done(back(f.get("exam")), error);
}

/** Move every question from one topic to another (so the first can be deleted). */
export async function moveTopicQuestions(f: FormData) {
  await requireStaff();
  const to = str(f, "to");
  if (!to) fail(back(f.get("exam")), "Choose where to move the questions");
  const supabase = await createClient();
  const { error } = await supabase.from("questions").update({ topic_id: to }).eq("topic_id", str(f, "id"));
  await done(back(f.get("exam")), error);
}

/** Swap position with the neighbouring item (dir = -1 up, +1 down). */
export async function moveItem(f: FormData) {
  await requireStaff();
  const table = str(f, "table");
  if (!["syllabus_sections", "topics"].includes(table)) return;
  const id = str(f, "id");
  const dir = Number(f.get("dir"));
  const supabase = await createClient();
  const { data: me } = await supabase.from(table).select("*").eq("id", id).single();
  if (!me) return;
  let q = supabase.from(table).select("id, position");
  q = table === "topics"
    ? (q.eq("section_id", me.section_id) as typeof q)
    : (q.eq("exam_id", me.exam_id) as typeof q);
  if (table === "topics") q = me.parent_id ? q.eq("parent_id", me.parent_id) : q.is("parent_id", null);
  const { data: siblings } = await q.order("position").order("id");
  const list = siblings ?? [];
  const i = list.findIndex((s) => s.id === id), j = i + dir;
  if (i < 0 || j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j], list[i]];
  await Promise.all(list.map((s, n) => supabase.from(table).update({ position: n + 1 }).eq("id", s.id)));
  refresh("/admin/syllabus");
}
