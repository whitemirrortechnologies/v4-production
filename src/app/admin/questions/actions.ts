"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { dbMessage, refresh, str } from "@/lib/action";
import type { Result } from "@/lib/result";

const Payload = z.object({
  id: z.uuid().nullable(),
  exam_id: z.uuid(),
  topic_id: z.uuid({ message: "Choose a topic" }),
  group_id: z.uuid().nullable(),
  type: z.enum(["mcq", "msq", "nat", "tita"]),
  difficulty: z.enum(["easy", "medium", "hard"]),
  stem: z.string().trim().min(1, "Write the question"),
  marks: z.number().positive(),
  negative_marks: z.number().min(0),
  is_pyq: z.boolean(),
  pyq_year: z.number().int().min(1990).max(2100).nullable(),
  pyq_paper: z.string().trim().nullable(),
  status: z.enum(["draft", "published", "archived"]),
  is_free_practice: z.boolean().optional(),
  options: z.array(z.object({ id: z.uuid(), content: z.string().trim().min(1, "Every option needs text"), correct: z.boolean() })),
  nat_min: z.number().nullable(),
  nat_max: z.number().nullable(),
  tita_answer: z.string().trim().nullable(),
  explanation: z.string().nullable(),
});
export type QuestionPayload = z.infer<typeof Payload>;

/**
 * Saves a question, its options and key. Written as draft first, then switched to the requested
 * status, so the database's "published questions must be complete" check runs on the final state.
 */
export async function saveQuestion(input: QuestionPayload): Promise<Result & { id?: string }> {
  const { user, profile } = await requireStaff();
  const parsed = Payload.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const p = parsed.data;
  if (p.is_pyq && !p.pyq_year) return { error: "Add the year for a past-year question" };
  const choice = p.type === "mcq" || p.type === "msq";
  if (choice && p.options.length < 2) return { error: "Add at least 2 options" };
  if (p.type === "mcq" && p.options.filter((o) => o.correct).length !== 1) return { error: "Mark exactly one correct option" };
  if (p.type === "msq" && !p.options.some((o) => o.correct)) return { error: "Mark at least one correct option" };
  if (p.type === "nat" && (p.nat_min == null || p.nat_max == null || p.nat_min > p.nat_max)) return { error: "Enter a valid answer range (min ≤ max)" };
  if (p.type === "tita" && !p.tita_answer) return { error: "Enter the expected answer" };

  const supabase = await createClient();
  const row: Record<string, unknown> = {
    exam_id: p.exam_id, topic_id: p.topic_id, group_id: p.group_id, type: p.type, difficulty: p.difficulty, stem: p.stem,
    marks: p.marks, negative_marks: p.negative_marks, is_pyq: p.is_pyq, pyq_year: p.is_pyq ? p.pyq_year : null,
    pyq_paper: p.is_pyq ? p.pyq_paper || null : null, status: "draft",
  };
  if (profile.role === "admin" && p.is_free_practice !== undefined) row.is_free_practice = p.is_free_practice;

  let id = p.id;
  if (id) {
    const { error } = await supabase.from("questions").update(row).eq("id", id);
    if (error) return { error: dbMessage(error) };
  } else {
    const { data, error } = await supabase.from("questions").insert({ ...row, created_by: user.id }).select("id").single();
    if (error) return { error: dbMessage(error) };
    id = data.id;
  }

  const qid: string = id!;

  // Options: replace the set (keeps ids stable so test answers stay valid).
  const { data: existing } = await supabase.from("question_options").select("id").eq("question_id", qid);
  const keep = new Set(choice ? p.options.map((o) => o.id) : []);
  const remove = (existing ?? []).map((o) => o.id).filter((oid) => !keep.has(oid));
  if (remove.length) {
    const { error } = await supabase.from("question_options").delete().in("id", remove);
    if (error) return { error: dbMessage(error), id: qid };
  }
  if (choice) {
    const { error } = await supabase.from("question_options").upsert(
      p.options.map((o, i) => ({ id: o.id, question_id: qid, label: String.fromCharCode(65 + i), content: o.content, position: i + 1 })),
      { onConflict: "id" },
    );
    if (error) return { error: dbMessage(error), id: qid };
  }
  const { error: keyErr } = await supabase.from("question_keys").upsert({
    question_id: qid,
    correct_option_ids: choice ? p.options.filter((o) => o.correct).map((o) => o.id) : null,
    nat_min: p.type === "nat" ? p.nat_min : null, nat_max: p.type === "nat" ? p.nat_max : null,
    tita_answer: p.type === "tita" ? p.tita_answer : null, explanation: p.explanation || null,
  }, { onConflict: "question_id" });
  if (keyErr) return { error: dbMessage(keyErr), id: qid };

  if (p.status !== "draft") {
    const { error } = await supabase.from("questions").update({ status: p.status, reviewed_by: user.id }).eq("id", qid);
    if (error) return { error: `Saved as draft. ${dbMessage(error)}`, id: qid };
  }
  refresh("/admin/questions");
  return { ok: p.status === "published" ? "Saved and published" : "Saved as draft", id: qid };
}

export async function deleteQuestion(f: FormData): Promise<Result> {
  await requireStaff();
  const supabase = await createClient();
  const { error } = await supabase.from("questions").delete().eq("id", str(f, "id"));
  if (error) return { error: error.code === "23503" ? "This question is used in a test. Remove it from the test first, or archive it." : dbMessage(error) };
  refresh("/admin/questions");
  redirect("/admin/questions");
}

export async function saveGroup(f: FormData): Promise<Result> {
  const { user } = await requireStaff();
  const title = str(f, "title"), content = String(f.get("content") ?? "").trim();
  if (!title || !content) return { error: "Enter a title and the passage text" };
  const supabase = await createClient();
  const id = str(f, "id");
  const { error } = id
    ? await supabase.from("question_groups").update({ title, content }).eq("id", id)
    : await supabase.from("question_groups").insert({ title, content, exam_id: str(f, "exam_id"), created_by: user.id });
  if (error) return { error: dbMessage(error) };
  refresh("/admin/questions/groups");
  return { ok: id ? "Passage saved" : "Passage added" };
}

export async function deleteGroup(f: FormData): Promise<Result> {
  await requireStaff();
  const supabase = await createClient();
  const { error } = await supabase.from("question_groups").delete().eq("id", str(f, "id"));
  if (error) return { error: dbMessage(error) };
  refresh("/admin/questions/groups");
  return { ok: "Passage deleted" };
}
