"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type AuthState = { error?: string; message?: string } | null;

/** Only allow same-site relative redirects. */
const safeNext = (n: FormDataEntryValue | null) =>
  typeof n === "string" && n.startsWith("/") && !n.startsWith("//") ? n : "/app";

const email = z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address"));
/** Sign-in never judges length: Supabase decides (existing accounts may have shorter passwords). */
const signInCreds = z.object({ email, password: z.string().min(1, "Enter your password") });
/** 6 = Supabase's default minimum. Raise it in Supabase (Auth → Providers → Email) and here together. */
const signUpCreds = z.object({ email, password: z.string().min(6, "Password must be at least 6 characters") });

export async function signIn(_: AuthState, form: FormData): Promise<AuthState> {
  const parsed = signInCreds.safeParse({ email: form.get("email"), password: form.get("password") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: "Incorrect email or password" };
  redirect(safeNext(form.get("next")));
}

export async function signUp(_: AuthState, form: FormData): Promise<AuthState> {
  const name = String(form.get("full_name") ?? "").trim();
  if (name.length < 2) return { error: "Please enter your name" };
  const parsed = signUpCreds.safeParse({ email: form.get("email"), password: form.get("password") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const h = await headers();
  const origin = h.get("origin") ?? `https://${h.get("host")}`;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    ...parsed.data,
    options: { data: { full_name: name }, emailRedirectTo: `${origin}/auth/callback?next=/app` },
  });
  if (error) return { error: error.message };
  if (!data.session) return { message: "Check your email to confirm your account, then sign in." };
  redirect(safeNext(form.get("next")));
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function requestReset(_: AuthState, form: FormData): Promise<AuthState> {
  const parsed = email.safeParse(form.get("email"));
  if (!parsed.success) return { error: "Enter a valid email address" };
  const h = await headers();
  const origin = h.get("origin") ?? `https://${h.get("host")}`;
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data, { redirectTo: `${origin}/auth/callback?next=/reset-password` });
  // Same message whether or not the account exists (don't reveal who has an account).
  return { message: "If an account exists for that email, a reset link is on its way. Check your inbox and spam folder." };
}

export async function setNewPassword(_: AuthState, form: FormData): Promise<AuthState> {
  const pw = String(form.get("password") ?? "");
  if (pw.length < 6) return { error: "Password must be at least 6 characters" };
  if (pw !== String(form.get("confirm") ?? "")) return { error: "Passwords don't match" };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: pw });
  if (error) return { error: error.message.includes("session") ? "This reset link has expired. Request a new one." : error.message };
  redirect("/app?password=updated");
}
