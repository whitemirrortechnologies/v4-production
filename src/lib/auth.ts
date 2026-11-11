import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile, Role } from "@/lib/types";

/**
 * Current user + profile (null when signed out). Cached per request.
 * Uses getClaims(): with Supabase's asymmetric signing keys the token is verified locally
 * (no network call). On older projects it falls back to asking the Auth server.
 */
export const getViewer = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", claims.sub).maybeSingle<Profile>();
  if (!profile) return null;
  return { user: { id: claims.sub, email: (claims.email as string | undefined) ?? profile.email ?? null }, profile };
});

export async function requireViewer(next = "/app") {
  const v = await getViewer();
  if (!v) redirect(`/login?next=${encodeURIComponent(next)}`);
  if (v.profile.is_blocked) redirect("/login?error=blocked");
  return v;
}

export async function requireRole(roles: Role[], next: string) {
  const v = await requireViewer(next);
  if (!roles.includes(v.profile.role)) redirect("/app");
  return v;
}
export const requireStaff = (next = "/admin") => requireRole(["faculty", "admin"], next);
export const requireAdmin = (next = "/admin") => requireRole(["admin"], next);
