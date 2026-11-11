import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Course, CourseStats, Exam, Product } from "@/lib/types";
import { loadTree } from "@/lib/tree";

export type CatalogCourse = Course & { exam: Pick<Exam, "code" | "name">; stats: CourseStats | null; product: Product | null };

export const getExams = cache(async (): Promise<Exam[]> => {
  const supabase = await createClient();
  const { data } = await supabase.from("exams").select("*").eq("is_active", true).order("position");
  return (data ?? []) as Exam[];
});

async function decorate(courses: (Course & { exam: { code: string; name: string } })[]): Promise<CatalogCourse[]> {
  if (!courses.length) return [];
  const supabase = await createClient();
  const ids = courses.map((c) => c.id);
  const [{ data: stats }, { data: products }] = await Promise.all([
    supabase.from("course_stats").select("*").in("course_id", ids),
    supabase.from("products").select("*").in("course_id", ids).eq("is_active", true),
  ]);
  return courses.map((c) => ({
    ...c,
    stats: ((stats ?? []) as CourseStats[]).find((s) => s.course_id === c.id) ?? null,
    product: ((products ?? []) as Product[]).find((p) => p.course_id === c.id) ?? null,
  }));
}

export const getCourses = cache(async (examCode?: string): Promise<CatalogCourse[]> => {
  const supabase = await createClient();
  let q = supabase
    .from("courses")
    .select("*, exam:exams!inner(code, name)")
    .eq("status", "published")
    .order("published_at", { ascending: false });
  if (examCode) q = q.eq("exam.code", examCode);
  const { data } = await q;
  return decorate((data ?? []) as never);
});

export const getCourseBySlug = cache(async (slug: string) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("courses")
    .select("*, exam:exams!inner(code, name)")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (!data) return null;
  return (await decorate([data as never]))[0];
});

/** Effective price in paise (sale price wins). */
export const priceOf = (p: Product | null) => (p ? (p.sale_price_paise ?? p.price_paise) : null);

export type CurriculumLecture = Pick<import("@/lib/types").Lecture, "id" | "title" | "position" | "is_free_preview" | "duration_seconds" | "video_status" | "status">;
export type CurriculumTree = {
  id: string; title: string;
  modules: { id: string; title: string; chapters: { id: string; title: string; lectures: CurriculumLecture[] }[] }[];
}[];

/** Full subject → module → chapter → lecture tree for a course. */
export const getCurriculum = cache(async (courseId: string): Promise<CurriculumTree> => {
  const supabase = await createClient();
  const tree = await loadTree(supabase, courseId, "id,title,position,is_free_preview,duration_seconds,video_status,status,chapter_id");
  return tree as unknown as CurriculumTree;
});

export type ExamSummary = Exam & { courses: number; sections: number; tests: number };

/** Real per-exam counts for the home page cards. */
export const getExamSummaries = cache(async (): Promise<ExamSummary[]> => {
  const supabase = await createClient();
  const exams = await getExams();
  return Promise.all(
    exams.map(async (e) => {
      const count = async (table: string, extra: Record<string, string>) => {
        let q = supabase.from(table).select("*", { count: "exact", head: true }).eq("exam_id", e.id);
        for (const [k, v] of Object.entries(extra)) q = q.eq(k, v);
        return (await q).count ?? 0;
      };
      const [courses, sections, tests] = await Promise.all([
        count("courses", { status: "published" }), count("syllabus_sections", {}), count("tests", { status: "published" }),
      ]);
      return { ...e, courses, sections, tests };
    }),
  );
});
