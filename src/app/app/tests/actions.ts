"use server";

import { redirect } from "next/navigation";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Result } from "@/lib/result";

export async function startTest(f: FormData): Promise<Result> {
  await requireViewer("/app/tests");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("start_test_attempt", { p_test: String(f.get("test_id")) });
  if (error) return { error: error.message };
  redirect(`/app/tests/attempt/${data}`);
}

export type SaveIn = { state: string; options?: string[] | null; num?: number | null; text?: string | null; seconds: number };
export async function saveResponse(attemptId: string, tqId: string, a: SaveIn) {
  await requireViewer();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("save_test_response", {
    p_attempt: attemptId, p_test_question: tqId, p_state: a.state,
    p_selected_option_ids: a.options?.length ? a.options : null, p_numeric_answer: a.num ?? null,
    p_text_answer: a.text ?? null, p_time_spent_delta: Math.round(a.seconds),
  });
  if (error) return { error: error.message };
  return data as { state: string; server_now: string; deadline_at: string };
}

export async function finishSection(attemptId: string) {
  await requireViewer();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("finish_test_section", { p_attempt: attemptId });
  return error ? { error: error.message } : (data as { status: string });
}

export async function submitTest(attemptId: string) {
  await requireViewer();
  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_test_attempt", { p_attempt: attemptId });
  return error ? { error: error.message } : { ok: true };
}
