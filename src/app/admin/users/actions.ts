"use server";

import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { dbMessage, refresh } from "@/lib/action";
import type { Result } from "@/lib/result";

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

export async function updateUser(f: FormData): Promise<Result> {
  await requireAdmin("/admin/users");
  const role = str(f, "role");
  if (!["student", "faculty", "admin"].includes(role)) return;
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ role, is_blocked: f.get("is_blocked") === "on" }).eq("id", str(f, "id"));
  if (error) return { error: dbMessage(error) };
  refresh("/admin/users");
  return { ok: "User updated" };
}
