"use server";

import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { refresh } from "@/lib/action";
import type { Result } from "@/lib/result";

export async function updateProfile(f: FormData): Promise<Result> {
  const { user } = await requireViewer("/app/settings");
  const name = String(f.get("full_name") ?? "").trim();
  if (name.length < 2) return { error: "Please enter your name" };
  const phone = String(f.get("phone") ?? "").replace(/[^\d+]/g, "");
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({
    full_name: name, phone: phone || null, target_exam_id: String(f.get("target_exam_id") ?? "") || null,
  }).eq("id", user.id);
  if (error) return { error: error.message };
  refresh("/app", "/app/settings");
  return { ok: "Profile saved" };
}

export async function changePassword(f: FormData): Promise<Result> {
  await requireViewer("/app/settings");
  const pw = String(f.get("password") ?? "");
  if (pw.length < 6) return { error: "Password must be at least 6 characters" };
  if (pw !== String(f.get("confirm") ?? "")) return { error: "Passwords don't match" };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: pw });
  return error ? { error: error.message } : { ok: "Password changed" };
}
