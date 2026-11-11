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
    options: { data: { full_name: name }, emailRedirectTo: `${origin}/app` },
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
