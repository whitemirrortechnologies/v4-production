import "server-only";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

/** Redirect back to `path` showing an error banner. */
export function fail(path: string, message: string): never {
  const sep = path.includes("?") ? "&" : "?";
  redirect(`${path}${sep}error=${encodeURIComponent(message)}`);
}

/** Turn a Postgres/PostgREST error into something a person can read. */
export function dbMessage(e: { code?: string; message: string }): string {
  if (e.code === "23505") return "That already exists. Choose a different name or slug.";
  if (e.code === "23503") return "This is still in use elsewhere, so it can't be removed yet.";
  if (e.code === "42501" || /row-level security/i.test(e.message)) return "You don't have permission to do that.";
  return e.message;
}

export const refresh = (...paths: string[]) => paths.forEach((p) => revalidatePath(p));
