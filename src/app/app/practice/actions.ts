"use server";

import { redirect } from "next/navigation";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Result } from "@/lib/result";

export async function startPractice(f: FormData): Promise<Result> {
  await requireViewer("/app/practice");
  const supabase = await createClient();
  const examId = String(f.get("exam_id"));
  let topics = f.getAll("topics").map(String);
  const sections = f.getAll("sections").map(String);
  if (sections.length) {
    const { data } = await supabase.from("topics").select("id").in("section_id", sections);
    topics = [...new Set([...topics, ...(data ?? []).map((t) => t.id)])];
  }
  const diffs = f.getAll("difficulty").map(String);
  const types = f.getAll("type").map(String);
  const timed = f.get("timed") === "on";
  const minutes = Number(f.get("minutes") || 0);
  const { data, error } = await supabase.rpc("start_practice_session", {
    p_exam: examId,
    p_topic_ids: topics.length ? topics : null,
    p_difficulties: diffs.length ? diffs : null,
    p_types: types.length ? types : null,
    p_pyq_only: f.get("pyq") === "on",
    p_years: null,
    p_count: Number(f.get("count") || 10),
    p_is_timed: timed,
    p_time_limit_seconds: timed ? Math.max(1, minutes) * 60 : null,
  });
  if (error) return { error: error.message };
  redirect(`/app/practice/${data}`);
}

export async function answerPractice(sessionId: string, questionId: string, a: { options?: string[]; num?: number | null; text?: string | null; seconds: number }) {
  await requireViewer();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("answer_practice_question", {
    p_session: sessionId, p_question: questionId,
    p_selected_option_ids: a.options?.length ? a.options : null,
    p_numeric_answer: a.num ?? null, p_text_answer: a.text ?? null, p_time_taken_seconds: Math.round(a.seconds),
  });
  if (error) return { error: error.message };
  return data as { is_correct: boolean; key: { correct_option_ids: string[] | null; nat_min: number | null; nat_max: number | null; tita_answer: string | null }; explanation: string | null };
}

export async function endPractice(sessionId: string) {
  await requireViewer();
  const supabase = await createClient();
  await supabase.rpc("end_practice_session", { p_session: sessionId });
}

export async function toggleBookmark(questionId: string, on: boolean): Promise<Result> {
  const { user } = await requireViewer();
  const supabase = await createClient();
  const { error } = on
    ? await supabase.from("question_bookmarks").upsert({ user_id: user.id, question_id: questionId })
    : await supabase.from("question_bookmarks").delete().eq("user_id", user.id).eq("question_id", questionId);
  return error ? { error: error.message } : { ok: on ? "Saved for revision" : "Removed from revision" };
}

export async function reportQuestion(f: FormData): Promise<Result> {
  const { user } = await requireViewer();
  const supabase = await createClient();
  const { error } = await supabase.from("question_reports").insert({
    user_id: user.id, question_id: String(f.get("question_id")), reason: String(f.get("reason")),
    message: String(f.get("message") ?? "").trim() || null,
    practice_session_id: f.get("practice_session_id") ? String(f.get("practice_session_id")) : null,
    test_attempt_id: f.get("test_attempt_id") ? String(f.get("test_attempt_id")) : null,
  });
  return error ? { error: error.message } : { ok: "Thanks! Our team will review it." };
}
