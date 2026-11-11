"use server";

import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { dbMessage, refresh, str } from "@/lib/action";
import { slugify } from "@/lib/format";
import { EXAM_PRESETS } from "@/lib/exam-presets";
import type { Result } from "@/lib/result";

const done = (): void => { refresh("/admin/exams", "/admin/syllabus", "/", "/exams", "/courses", "/app"); };

/** Add a ready-made exam (with its full syllabus) or a blank custom one. */
export async function addExam(f: FormData): Promise<Result> {
  await requireStaff();
  const supabase = await createClient();
  const key = str(f, "preset");
  const preset = EXAM_PRESETS.find((p) => p.key === key);

  const code = (preset?.code ?? str(f, "code")).toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  const name = preset?.name ?? str(f, "name");
  if (!code || !name) return { error: "Enter a name and a short code (e.g. XAT)" };
  if (code.length < 2) return { error: "The code needs at least 2 characters" };

  const { data: dup } = await supabase.from("exams").select("id,is_active").eq("code", code).maybeSingle();
  if (dup) return { error: dup.is_active ? `${name} is already added.` : `${name} already exists but is hidden. Switch it on in the list below.` };

  const { count } = await supabase.from("exams").select("*", { count: "exact", head: true });
  const { data: exam, error } = await supabase.from("exams")
    .insert({ code, name, description: preset?.description ?? (str(f, "description") || null), position: (count ?? 0) + 1, is_active: true })
    .select("id").single();
  if (error) return { error: dbMessage(error) };

  // Syllabus from the template: sections, then topics, then subtopics (they need their parent's id).
  if (preset) {
    for (const [si, sec] of preset.syllabus.entries()) {
      const { data: s, error: e1 } = await supabase.from("syllabus_sections").insert({ exam_id: exam.id, name: sec.section, position: si + 1 }).select("id").single();
      if (e1) return { error: `Exam added, but the syllabus stopped at "${sec.section}": ${dbMessage(e1)}` };
      const used = new Set<string>();
      const slug = (n: string) => { let b = slugify(n) || "topic", x = b, i = 2; while (used.has(x)) x = `${b}-${i++}`; used.add(x); return x; };
      const tops = sec.topics.map((t, i) => ({ name: typeof t === "string" ? t : t.name, sub: typeof t === "string" ? [] : t.sub, position: i + 1 }));
      const { data: made, error: e2 } = await supabase.from("topics")
        .insert(tops.map((t) => ({ section_id: s.id, name: t.name, slug: slug(t.name), position: t.position }))).select("id,name");
      if (e2) return { error: `Exam added, but the syllabus stopped at "${sec.section}": ${dbMessage(e2)}` };
      const subs = tops.flatMap((t) => {
        const parent = made?.find((m) => m.name === t.name);
        return parent ? t.sub.map((n, i) => ({ section_id: s.id, parent_id: parent.id, name: n, slug: slug(n), position: i + 1 })) : [];
      });
      if (subs.length) { const { error: e3 } = await supabase.from("topics").insert(subs); if (e3) return { error: `Exam added, but subtopics stopped at "${sec.section}": ${dbMessage(e3)}` }; }
    }
  }
  done();
  return { ok: `${name} added${preset ? " with its full syllabus" : ""}. Students can see it now.` };
}

/** Show or hide an exam from students (nothing is deleted). */
export async function setExamVisible(f: FormData): Promise<Result> {
  await requireStaff();
  const supabase = await createClient();
  const on = f.get("visible") === "1";
  const { error } = await supabase.from("exams").update({ is_active: on }).eq("id", str(f, "id"));
  if (error) return { error: dbMessage(error) };
  done();
  return { ok: on ? "Exam is now visible to students" : "Exam hidden from students" };
}

/** Delete an exam. Allowed only when nothing is attached to it. */
export async function deleteExam(f: FormData): Promise<Result> {
  await requireStaff();
  const supabase = await createClient();
  const id = str(f, "id");
  const counts = await Promise.all(["courses", "questions", "tests", "test_series"].map(async (t) => (await supabase.from(t).select("*", { count: "exact", head: true }).eq("exam_id", id)).count ?? 0));
  if (counts.some((n) => n > 0)) return { error: "This exam still has courses, questions or tests. Hide it instead, or remove its content first." };
  const { error } = await supabase.from("exams").delete().eq("id", id);
  if (error) return { error: dbMessage(error) };
  done();
  return { ok: "Exam deleted" };
}
