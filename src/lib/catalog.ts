import "server-only";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createPublicClient } from "@/lib/supabase/public";
import type { Course, CourseStats, Exam, Product } from "@/lib/types";
import { loadTree } from "@/lib/tree";

/** Public catalog data is the same for everyone, so it's cached for 5 minutes (and purged instantly when an admin saves). */
export const CATALOG_TAG = "catalog";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const cached = <A extends any[], R>(fn: (...a: A) => Promise<R>, key: string): ((...a: A) => Promise<R>) =>
  unstable_cache(fn, ["catalog", key], { revalidate: 300, tags: [CATALOG_TAG] });

export type CatalogCourse = Course & { exam: Pick<Exam, "code" | "name">; stats: CourseStats | null; product: Product | null };

const loadExams = cached(async (): Promise<Exam[]> => {
  const { data } = await createPublicClient().from("exams").select("*").eq("is_active", true).order("position");
  return (data ?? []) as Exam[];
}, "exams");
export const getExams = cache(() => loadExams());

async function decorate(courses: (Course & { exam: { code: string; name: string } })[]): Promise<CatalogCourse[]> {
  if (!courses.length) return [];
  const supabase = createPublicClient();
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

const loadCourses = cached(async (examCode: string): Promise<CatalogCourse[]> => {
  let q = createPublicClient()
    .from("courses")
    .select("*, exam:exams!inner(code, name, is_active)")
    .eq("status", "published")
    .eq("exam.is_active", true)
    .order("published_at", { ascending: false });
  if (examCode) q = q.eq("exam.code", examCode);
  const { data } = await q;
  return decorate((data ?? []) as never);
}, "courses");
export const getCourses = cache((examCode?: string) => loadCourses(examCode ?? ""));

const loadCourse = cached(async (slug: string): Promise<CatalogCourse | null> => {
  const { data } = await createPublicClient()
    .from("courses")
    .select("*, exam:exams!inner(code, name, is_active)")
    .eq("slug", slug)
    .eq("status", "published")
    .eq("exam.is_active", true)
    .maybeSingle();
  if (!data) return null;
  return (await decorate([data as never]))[0];
}, "course");
export const getCourseBySlug = cache((slug: string) => loadCourse(slug));

/** Effective price in paise (sale price wins). */
export const priceOf = (p: Product | null) => (p ? (p.sale_price_paise ?? p.price_paise) : null);

export type CurriculumLecture = Pick<import("@/lib/types").Lecture, "id" | "title" | "position" | "is_free_preview" | "duration_seconds" | "video_status" | "status">;
export type CurriculumTree = {
  id: string; title: string;
  modules: { id: string; title: string; chapters: { id: string; title: string; lectures: CurriculumLecture[] }[] }[];
}[];

const loadCurriculum = cached(async (courseId: string): Promise<CurriculumTree> => {
  const tree = await loadTree(createPublicClient(), courseId, "id,title,position,is_free_preview,duration_seconds,video_status,status,chapter_id");
  return tree as unknown as CurriculumTree;
}, "curriculum");
/** Full subject → module → chapter → lecture tree for a course. */
export const getCurriculum = cache((courseId: string) => loadCurriculum(courseId));

export type ExamSummary = Exam & { courses: number; sections: number; tests: number };

const loadExamSummaries = cached(async (): Promise<ExamSummary[]> => {
  const supabase = createPublicClient();
  const exams = await loadExams();
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
}, "exam-summaries");
/** Real per-exam counts for the home page cards. */
export const getExamSummaries = cache(() => loadExamSummaries());

export type Mine = {
  courseIds: Set<string>;
  seriesIds: Set<string>;
  progress: Map<string, { done: number; total: number; last: string | null }>;
};

/**
 * Everything the signed-in user can open (direct purchases + bundle contents) and their course progress.
 * Two parallel rounds instead of four sequential ones. Empty when signed out.
 */
export const getMine = cache(async (userId: string | null): Promise<Mine> => {
  const mine: Mine = { courseIds: new Set(), seriesIds: new Set(), progress: new Map() };
  if (!userId) return mine;
  const supabase = await createClient();
  const [{ data: enr }, { data: prog }] = await Promise.all([
    supabase.from("enrollments").select("product_id,expires_at").eq("user_id", userId).eq("is_active", true),
    supabase.from("course_progress").select("course_id,completed_lectures,total_lectures,last_lecture_id").eq("user_id", userId),
  ]);
  const live = (enr ?? []).filter((e) => !e.expires_at || new Date(e.expires_at) > new Date()).map((e) => e.product_id);
  if (!live.length) return mine;
  const [{ data: own }, { data: items }] = await Promise.all([
    supabase.from("products").select("course_id,test_series_id").in("id", live),
    supabase.from("bundle_items").select("item_product_id").in("bundle_product_id", live),
  ]);
  const add = (rows: { course_id: string | null; test_series_id: string | null }[] | null) =>
    (rows ?? []).forEach((p) => { if (p.course_id) mine.courseIds.add(p.course_id); if (p.test_series_id) mine.seriesIds.add(p.test_series_id); });
  add(own);
  if (items?.length) {
    const { data: inner } = await supabase.from("products").select("course_id,test_series_id").in("id", items.map((i) => i.item_product_id));
    add(inner);
  }
  (prog ?? []).filter((p) => mine.courseIds.has(p.course_id))
    .forEach((p) => mine.progress.set(p.course_id, { done: Number(p.completed_lectures), total: Number(p.total_lectures), last: p.last_lecture_id }));
  return mine;
});

/** Which of these tests can the user open? (free, in an owned course, or in an owned series.) Two parallel queries for all tests. */
export async function getTestAccess(mine: Mine, tests: { id: string; is_free: boolean }[]): Promise<Record<string, boolean>> {
  const out: Record<string, boolean> = Object.fromEntries(tests.map((t) => [t.id, t.is_free]));
  if (!tests.length || (!mine.courseIds.size && !mine.seriesIds.size)) return out;
  const supabase = await createClient();
  const ids = tests.map((t) => t.id);
  const [{ data: ct }, { data: st }] = await Promise.all([
    mine.courseIds.size ? supabase.from("course_tests").select("test_id").in("test_id", ids).in("course_id", [...mine.courseIds]) : Promise.resolve({ data: [] }),
    mine.seriesIds.size ? supabase.from("test_series_tests").select("test_id").in("test_id", ids).in("series_id", [...mine.seriesIds]) : Promise.resolve({ data: [] }),
  ]);
  [...(ct ?? []), ...(st ?? [])].forEach((r) => { out[r.test_id] = true; });
  return out;
}
