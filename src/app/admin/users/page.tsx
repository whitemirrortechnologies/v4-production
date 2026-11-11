import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Badge, Button, Card, Input, PageHeader, Select } from "@/components/ui";
import { ActionForm, Submit } from "@/components/forms";
import { updateUser } from "./actions";
import type { Profile } from "@/lib/types";

export const metadata = { title: "Users · Admin" };

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { profile: me } = await requireAdmin("/admin/users");
  const { q } = await searchParams;
  const supabase = await createClient();
  let query = supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(100);
  const term = q?.replace(/[%,()]/g, "").trim();
  if (term) query = query.or(`email.ilike.%${term}%,full_name.ilike.%${term}%`);
  const { data } = await query;
  const users = (data ?? []) as Profile[];

  return (
    <>
      <PageHeader eyebrow="People" title="Users" subtitle="Promote students to faculty or admin, or suspend an account." />
      <form className="mb-6 flex max-w-md gap-2">
        <Input name="q" defaultValue={q} placeholder="Search name or email…" />
        <Button type="submit" variant="secondary">Search</Button>
      </form>
      <div className="space-y-2">
        {users.map((u) => (
          <Card key={u.id} className="cv-auto p-4">
            <ActionForm action={updateUser} className="flex flex-wrap items-center gap-3">
              <input type="hidden" name="id" value={u.id} />
              <div className="min-w-0 flex-1 basis-56">
                <p className="truncate font-medium">{u.full_name || "—"} {u.id === me.id && <Badge tone="violet">you</Badge>}</p>
                <p className="truncate text-sm text-ink-3">{u.email}</p>
              </div>
              <Select name="role" defaultValue={u.role} className="w-36" aria-label="Role">
                <option value="student">Student</option><option value="faculty">Faculty</option><option value="admin">Admin</option>
              </Select>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="is_blocked" defaultChecked={u.is_blocked} className="size-4 accent-violet-600" />Suspended</label>
              <Submit size="sm" variant="secondary">Save</Submit>
            </ActionForm>
          </Card>
        ))}
        {!users.length && <p className="text-ink-3">No users found.</p>}
      </div>
    </>
  );
}
