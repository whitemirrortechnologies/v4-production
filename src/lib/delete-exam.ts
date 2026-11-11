/**
 * Permanently deletes an exam and everything under it. Pure function over a Supabase client
 * (service role) so it can be tested against a real database.
 *
 * Order matters: orders block product deletion, tests/questions/courses/series block exam deletion,
 * and a test of ANOTHER exam may still contain one of these questions. Safe to re-run after a failure.
 */
type Result = { error: { message: string } | null };
type Db = {
  from: (t: string) => any; // eslint-disable-line @typescript-eslint/no-explicit-any
  storage: { from: (b: string) => { remove: (paths: string[]) => PromiseLike<unknown> } };
};

const chunks = <T,>(a: T[], n = 100) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));

export async function deleteExamCascade(db: Db, examId: string) {
  const step = async (label: string, run: () => PromiseLike<Result>) => {
    const { error } = await run();
    if (error) throw new Error(`${label}: ${error.message}`);
  };

  const [{ data: courses }, { data: series }] = await Promise.all([
    db.from("courses").select("id").eq("exam_id", examId),
    db.from("test_series").select("id").eq("exam_id", examId),
  ]);
  const courseIds: string[] = (courses ?? []).map((c: { id: string }) => c.id);
  const seriesIds: string[] = (series ?? []).map((s: { id: string }) => s.id);

  // 1) Files in Storage: videos and notes of every lecture in these courses
  for (const part of chunks(courseIds)) {
    const { data: lecs } = await db.from("lectures").select("video_path,notes_path").in("course_id", part);
    const videos = (lecs ?? []).map((l: { video_path: string | null }) => l.video_path).filter(Boolean) as string[];
    const notes = (lecs ?? []).map((l: { notes_path: string | null }) => l.notes_path).filter(Boolean) as string[];
    for (const p of chunks(videos)) await db.storage.from("lecture-videos").remove(p);
    for (const p of chunks(notes)) await db.storage.from("lecture-notes").remove(p);
  }

  // 2) Orders of this exam's products (they block deleting the products)
  const productIds: string[] = [];
  for (const part of chunks(courseIds)) productIds.push(...((await db.from("products").select("id").in("course_id", part)).data ?? []).map((p: { id: string }) => p.id));
  for (const part of chunks(seriesIds)) productIds.push(...((await db.from("products").select("id").in("test_series_id", part)).data ?? []).map((p: { id: string }) => p.id));
  for (const part of chunks(productIds)) await step("orders", () => db.from("orders").delete().in("product_id", part));

  // 3) Tests, then any leftover link from another exam's test to one of these questions
  await step("tests", () => db.from("tests").delete().eq("exam_id", examId));
  for (let guard = 0; guard < 50; guard++) {
    const { data: rows } = await db.from("test_questions").select("id, q:questions!inner(exam_id)").eq("q.exam_id", examId).limit(500);
    if (!rows?.length) break;
    for (const part of chunks(rows.map((r: { id: string }) => r.id))) await step("test questions", () => db.from("test_questions").delete().in("id", part));
  }

  // 4) Everything else that points at the exam, then the exam (syllabus cascades)
  await step("test series", () => db.from("test_series").delete().eq("exam_id", examId));
  await step("questions", () => db.from("questions").delete().eq("exam_id", examId));
  await step("passages", () => db.from("question_groups").delete().eq("exam_id", examId));
  await step("courses", () => db.from("courses").delete().eq("exam_id", examId));
  await step("exam", () => db.from("exams").delete().eq("id", examId));
}
