import "server-only";
import { revalidatePath, revalidateTag } from "next/cache";

/** Turn a Postgres/PostgREST error into something a person can read. */
export function dbMessage(e: { code?: string; message: string }): string {
  if (e.code === "23505") return "That already exists. Choose a different name or slug.";
  if (e.code === "23503") return "This is still in use elsewhere, so it can't be removed yet.";
  if (e.code === "42501" || /row-level security/i.test(e.message)) return "You don't have permission to do that.";
  return e.message;
}

/** Re-render these pages and purge the cached public catalog so students see admin edits right away. */
export const refresh = (...paths: string[]) => {
  paths.forEach((p) => revalidatePath(p));
  revalidateTag("catalog", { expire: 0 });
};
export const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
