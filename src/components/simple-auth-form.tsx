"use client";

import { useActionState } from "react";
import { Button, Input, Label, Notice } from "@/components/ui";
import type { AuthState } from "@/app/(auth)/actions";

export function SimpleAuthForm({ action, kind }: { action: (s: AuthState, f: FormData) => Promise<AuthState>; kind: "forgot" | "reset" }) {
  const [state, run, pending] = useActionState(action, null);
  return (
    <form action={run} className="space-y-4">
      {kind === "forgot" ? (
        <label className="block"><Label>Email</Label><Input name="email" type="email" autoComplete="email" required /></label>
      ) : (
        <>
          <label className="block"><Label hint="6+ characters">New password</Label><Input name="password" type="password" autoComplete="new-password" minLength={6} required /></label>
          <label className="block"><Label>Confirm password</Label><Input name="confirm" type="password" autoComplete="new-password" minLength={6} required /></label>
        </>
      )}
      {state?.error && <Notice tone="error">{state.error}</Notice>}
      {state?.message && <Notice tone="success">{state.message}</Notice>}
      <Button type="submit" size="lg" className="mt-2 w-full" disabled={pending}>{pending ? "Please wait…" : kind === "forgot" ? "Send reset link" : "Save new password"}</Button>
    </form>
  );
}
