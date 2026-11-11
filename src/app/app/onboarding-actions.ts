"use server";

import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { refresh } from "@/lib/action";
import type { Result } from "@/lib/result";

/** First-run choice on the dashboard: which exam is this student preparing for? */
export async function setTargetExam(f: FormData): Promise<Result> {
  const { user } = await requireViewer("/app");
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ target_exam_id: String(f.get("exam_id")) }).eq("id", user.id);
  if (error) return { error: error.message };
  refresh("/app");
  return { ok: "Saved. Here's your plan." };
}
