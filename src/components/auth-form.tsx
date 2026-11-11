"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button, Input, Label, Notice } from "@/components/ui";
import type { AuthState } from "@/app/(auth)/actions";

export function AuthForm({
  mode, action, next,
}: { mode: "login" | "signup"; action: (s: AuthState, f: FormData) => Promise<AuthState>; next: string }) {
  const [state, run, pending] = useActionState(action, null);
  return (
    <form action={run} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      {mode === "signup" && (
        <label className="block"><Label>Full name</Label><Input name="full_name" autoComplete="name" required /></label>
      )}
      <label className="block"><Label>Email</Label><Input name="email" type="email" autoComplete="email" inputMode="email" required /></label>
      <label className="block">
        <Label hint={mode === "signup" ? "8+ characters" : undefined}>Password</Label>
        <Input name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={8} required />
      </label>
      {state?.error && <Notice tone="error">{state.error}</Notice>}
      {state?.message && <Notice tone="success">{state.message}</Notice>}
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
      </Button>
      <p className="text-center text-sm text-ink-3">
        {mode === "login" ? (
          <>New here? <Link className="font-medium text-ink underline" href={`/signup?next=${encodeURIComponent(next)}`}>Create an account</Link></>
        ) : (
          <>Already have an account? <Link className="font-medium text-ink underline" href={`/login?next=${encodeURIComponent(next)}`}>Sign in</Link></>
        )}
      </p>
    </form>
  );
}
