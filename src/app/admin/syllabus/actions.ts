"use server";

import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { dbMessage, refresh, str } from "@/lib/action";
import { slugify } from "@/lib/format";
import type { Result } from "@/lib/result";

const done = (error: { code?: string; message: string } | null, ok?: string): Result => {
  if (error) return { error: dbMessage(error) };
  refresh("/admin/syllabus");
  return ok ? { ok } : undefined;
};

export async function updateExam(f: FormData): Promise<Result> {
  await requireStaff();
  const supabase = await createClient();
  const { error } = await supabase.from("exams").update({
    name: str(f, "name"), description: str(f, "description") || null, is_active: f.get("is_active") === "on",
  }).eq("id", str(f, "id"));
  return done(error, "Exam saved");
}

export async function addSection(f: FormData): Promise<Result> {
  await requireStaff();
  const name = str(f, "name");
  if (!name) return { error: "Enter a section name" };
  const supabase = await createClient();
  const examId = str(f, "exam_id");
  const { count } = await supabase.from("syllabus_sections").select("*", { count: "exact", head: true }).eq("exam_id", examId);
  const { error } = await supabase.from("syllabus_sections").insert({ exam_id: examId, name, position: (count ?? 0) + 1 });
  return done(error, "Section added");
}

export async function renameSection(f: FormData): Promise<Result> {
  await requireStaff();
  const supabase = await createClient();
  const { error } = await supabase.from("syllabus_sections").update({ name: str(f, "name") }).eq("id", str(f, "id"));
  return done(error);
}

export async function deleteSection(f: FormData): Promise<Result> {
  await requireStaff();
  const supabase = await createClient();
  const id = str(f, "id");
  const { data: topics } = await supabase.from("topics").select("id").eq("section_id", id);
  const ids = (topics ?? []).map((t) => t.id);
  if (ids.length) {
    const { count } = await supabase.from("questions").select("*", { count: "exact", head: true }).in("topic_id", ids);
    if (count) return { error: `${count} question(s) use topics in this section. Move them to another topic first.` };
  }
  const { error } = await supabase.from("syllabus_sections").delete().eq("id", id);
  return done(error, "Section deleted");
}

export async function addTopic(f: FormData): Promise<Result> {
  await requireStaff();
  const name = str(f, "name");
  if (!name) return { error: "Enter a topic name" };
  const supabase = await createClient();
  const sectionId = str(f, "section_id");
  const parentId = str(f, "parent_id") || null;
  const sib = supabase.from("topics").select("*", { count: "exact", head: true }).eq("section_id", sectionId);
  const { count } = await (parentId ? sib.eq("parent_id", parentId) : sib.is("parent_id", null));
  let slug = slugify(name);
  if (!slug) return { error: "Use letters or numbers in the name" };
  const { data: clash } = await supabase.from("topics").select("id").eq("section_id", sectionId).eq("slug", slug).maybeSingle();
  if (clash) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
  const { error } = await supabase.from("topics").insert({ section_id: sectionId, parent_id: parentId, name, slug, position: (count ?? 0) + 1 });
  return done(error, "Topic added");
}

export async function renameTopic(f: FormData): Promise<Result> {
  await requireStaff();
  const supabase = await createClient();
  const { error } = await supabase.from("topics").update({ name: str(f, "name") }).eq("id", str(f, "id"));
  return done(error);
}

export async function deleteTopic(f: FormData): Promise<Result> {
  await requireStaff();
  const supabase = await createClient();
  const id = str(f, "id");
  const { count } = await supabase.from("questions").select("*", { count: "exact", head: true }).eq("topic_id", id);
  if (count) return { error: `${count} question(s) use this topic. Move them to another topic first.` };
  const { error } = await supabase.from("topics").delete().eq("id", id);
  return done(error, "Topic deleted");
}

export async function moveTopicQuestions(f: FormData): Promise<Result> {
  await requireStaff();
  const to = str(f, "to");
  if (!to) return { error: "Choose where to move the questions" };
  const supabase = await createClient();
  const { error } = await supabase.from("questions").update({ topic_id: to }).eq("topic_id", str(f, "id"));
  return done(error, "Questions moved");
}

/** Swap position with the neighbouring item (dir = -1 up, +1 down). */
export async function moveItem(f: FormData): Promise<Result> {
  await requireStaff();
  const table = str(f, "table");
  if (!["syllabus_sections", "topics"].includes(table)) return;
  const id = str(f, "id");
  const dir = Number(f.get("dir"));
  const supabase = await createClient();
  const { data: me } = await supabase.from(table).select("*").eq("id", id).single();
  if (!me) return;
  let q = supabase.from(table).select("id, position");
  q = table === "topics" ? q.eq("section_id", me.section_id) : q.eq("exam_id", me.exam_id);
  if (table === "topics") q = me.parent_id ? q.eq("parent_id", me.parent_id) : q.is("parent_id", null);
  const { data: siblings } = await q.order("position").order("id");
  const list = siblings ?? [];
  const i = list.findIndex((s) => s.id === id), j = i + dir;
  if (i < 0 || j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j], list[i]];
  await Promise.all(list.map((s, n) => supabase.from(table).update({ position: n + 1 }).eq("id", s.id)));
  refresh("/admin/syllabus");
}
