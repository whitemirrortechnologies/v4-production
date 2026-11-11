import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Lecture } from "@/lib/types";

export type TreeChapter = { id: string; title: string; position: number; lectures: Lecture[] };
export type TreeModule = { id: string; title: string; position: number; chapters: TreeChapter[] };
export type TreeSubject = { id: string; title: string; position: number; modules: TreeModule[] };

const byPos = <T extends { position: number; id: string }>(a: T, b: T) => a.position - b.position || a.id.localeCompare(b.id);

/** Whole curriculum in 2 parallel round-trips (nested select + lectures), instead of 4 sequential ones. */
export async function loadTree(supabase: SupabaseClient, courseId: string, lectureCols = "*"): Promise<TreeSubject[]> {
  const [{ data: subjects }, { data: lectures }] = await Promise.all([
    supabase.from("course_subjects")
      .select("id,title,position, modules:course_modules(id,title,position, chapters:course_chapters(id,title,position))")
      .eq("course_id", courseId),
    supabase.from("lectures").select(lectureCols).eq("course_id", courseId),
  ]);
  const lecs = ((lectures ?? []) as unknown as (Lecture & { chapter_id: string })[]).sort(byPos);
  type RawS = { id: string; title: string; position: number; modules: { id: string; title: string; position: number; chapters: { id: string; title: string; position: number }[] }[] };
  return ((subjects ?? []) as RawS[]).sort(byPos).map((s) => ({
    ...s,
    modules: [...(s.modules ?? [])].sort(byPos).map((m) => ({
      ...m,
      chapters: [...(m.chapters ?? [])].sort(byPos).map((c) => ({ ...c, lectures: lecs.filter((l) => l.chapter_id === c.id) })),
    })),
  }));
}
