import Link from "next/link";
import { notFound } from "next/navigation";
import { getViewer, requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Badge, Button, Card, Input, Label, LinkButton, Notice, PageHeader, Select, Textarea } from "@/components/ui";
import type { Chapter, Course, Lecture, Module, Product, Subject } from "@/lib/types";
import { addLecture, addNode, deleteCourse, deleteNode, moveNode, renameNode, savePricing, updateCourse } from "../actions";
import { clock } from "@/lib/format";

export const metadata = { title: "Edit course · Admin" };

function Hidden({ t, id, c }: { t: string; id: string; c: string }) {
  return <><input type="hidden" name="table" value={t} /><input type="hidden" name="id" value={id} /><input type="hidden" name="course_id" value={c} /></>;
}
function Tools({ t, id, c }: { t: string; id: string; c: string }) {
  return (
    <span className="flex shrink-0 items-center">
      {[-1, 1].map((dir) => (
        <form action={moveNode} key={dir}>
          <Hidden t={t} id={id} c={c} /><input type="hidden" name="dir" value={dir} />
          <button aria-label={dir < 0 ? "Move up" : "Move down"} className="h-8 w-8 rounded-lg text-ink-3 hover:bg-wash hover:text-ink">{dir < 0 ? "↑" : "↓"}</button>
        </form>
      ))}
      <form action={deleteNode}><Hidden t={t} id={id} c={c} />
        <button aria-label="Delete" className="h-8 w-8 rounded-lg text-ink-3 hover:bg-bad/10 hover:text-bad">✕</button>
      </form>
    </span>
  );
}
function Title({ t, id, c, value, className = "" }: { t: string; id: string; c: string; value: string; className?: string }) {
  return (
    <form action={renameNode} className="min-w-0 flex-1">
      <Hidden t={t} id={id} c={c} />
      <input name="title" defaultValue={value} aria-label="Title"
        className={`w-full rounded-lg bg-transparent px-2 py-1.5 hover:bg-wash focus:bg-wash focus:outline-none ${className}`} />
    </form>
  );
}
function Add({ t, parent, c, placeholder }: { t: string; parent: string; c: string; placeholder: string }) {
  return (
    <form action={addNode} className="mt-2 flex gap-2">
      <input type="hidden" name="table" value={t} /><input type="hidden" name="parent_id" value={parent} /><input type="hidden" name="course_id" value={c} />
      <Input name="title" placeholder={placeholder} required className="h-10 flex-1" />
      <Button size="sm" variant="secondary" type="submit">Add</Button>
    </form>
  );
}

export default async function EditCourse({ params, searchParams }: {
  params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const { id } = await params;
  await requireStaff(`/admin/courses/${id}`);
  const { error, saved } = await searchParams;
  const viewer = await getViewer();
  const isAdmin = viewer?.profile.role === "admin";
  const supabase = await createClient();

  const { data: course } = await supabase.from("courses").select("*").eq("id", id).maybeSingle<Course>();
  if (!course) notFound();
  const [{ data: subjects }, { data: product }] = await Promise.all([
    supabase.from("course_subjects").select("*").eq("course_id", id).order("position"),
    supabase.from("products").select("*").eq("course_id", id).maybeSingle<Product>(),
  ]);
  const subjectIds = (subjects ?? []).map((s) => s.id);
  const { data: modules } = subjectIds.length ? await supabase.from("course_modules").select("*").in("subject_id", subjectIds).order("position") : { data: [] };
  const moduleIds = (modules ?? []).map((m) => m.id);
  const { data: chapters } = moduleIds.length ? await supabase.from("course_chapters").select("*").in("module_id", moduleIds).order("position") : { data: [] };
  const { data: lectures } = await supabase.from("lectures").select("*").eq("course_id", id).order("position");

  const lecturesOf = (cid: string) => ((lectures ?? []) as Lecture[]).filter((l) => l.chapter_id === cid);

  return (
    <>
      <Link href="/admin/courses" className="text-sm text-ink-3 hover:text-ink">← Courses</Link>
      <div className="mt-3">
        <PageHeader title={course.title}
          action={course.status === "published" ? <LinkButton href={`/courses/${course.slug}`} variant="secondary" size="sm">View live ↗</LinkButton> : <Badge>{course.status}</Badge>} />
      </div>
      {error && <div className="mb-6"><Notice tone="error">{error}</Notice></div>}
      {saved && <div className="mb-6"><Notice tone="success">Saved.</Notice></div>}

      <Card className="mb-8 p-6">
        <h2 className="mb-4 text-lg font-semibold tracking-tight">Details</h2>
        <form action={updateCourse} className="grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="id" value={course.id} />
          <label className="block"><Label>Title</Label><Input name="title" defaultValue={course.title} required /></label>
          <label className="block"><Label hint="used in the web address">Slug</Label><Input name="slug" defaultValue={course.slug} required /></label>
          <label className="block sm:col-span-2"><Label>Subtitle</Label><Input name="subtitle" defaultValue={course.subtitle ?? ""} /></label>
          <label className="block sm:col-span-2"><Label>Description</Label><Textarea name="description" defaultValue={course.description ?? ""} rows={5} /></label>
          <label className="block"><Label hint="only published courses are visible to students">Status</Label>
            <Select name="status" defaultValue={course.status}><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></Select>
          </label>
          <div className="flex items-end"><Button type="submit">Save details</Button></div>
        </form>
      </Card>

      {isAdmin && (
        <Card className="mb-8 p-6">
          <h2 className="mb-1 text-lg font-semibold tracking-tight">Pricing</h2>
          <p className="mb-4 text-sm text-ink-3">Set the price to 0 to make the whole course free. Faculty can&apos;t change pricing.</p>
          <form action={savePricing} className="grid gap-4 sm:grid-cols-4">
            <input type="hidden" name="course_id" value={course.id} />
            <label className="block"><Label>Price (₹)</Label><Input name="price" type="number" min={0} step="1" defaultValue={product ? product.price_paise / 100 : ""} required /></label>
            <label className="block"><Label hint="optional">Sale price (₹)</Label><Input name="sale_price" type="number" min={0} step="1" defaultValue={product?.sale_price_paise != null ? product.sale_price_paise / 100 : ""} /></label>
            <label className="block"><Label hint="blank = lifetime">Access (days)</Label><Input name="validity_days" type="number" min={1} defaultValue={product?.validity_days ?? ""} /></label>
            <label className="block"><Label hint="or until a date">Access until</Label><Input name="access_until" type="date" defaultValue={product?.access_until ?? ""} /></label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="is_active" defaultChecked={product?.is_active ?? true} className="size-4 accent-violet-600" />On sale</label>
            <div className="sm:col-span-3"><Button type="submit">Save pricing</Button></div>
          </form>
        </Card>
      )}

      <h2 className="mb-4 text-lg font-semibold tracking-tight">Curriculum</h2>
      <div className="space-y-5">
        {((subjects ?? []) as Subject[]).map((s) => (
          <Card key={s.id} className="p-5">
            <div className="flex items-center gap-1"><Title t="course_subjects" id={s.id} c={id} value={s.title} className="text-lg font-semibold" /><Tools t="course_subjects" id={s.id} c={id} /></div>
            <div className="mt-3 space-y-4 border-l border-line pl-4">
              {((modules ?? []) as Module[]).filter((m) => m.subject_id === s.id).map((m) => (
                <div key={m.id}>
                  <div className="flex items-center gap-1"><Title t="course_modules" id={m.id} c={id} value={m.title} className="font-medium" /><Tools t="course_modules" id={m.id} c={id} /></div>
                  <div className="mt-2 space-y-3 border-l border-line pl-4">
                    {((chapters ?? []) as Chapter[]).filter((c) => c.module_id === m.id).map((c) => (
                      <div key={c.id}>
                        <div className="flex items-center gap-1"><Title t="course_chapters" id={c.id} c={id} value={c.title} className="text-[15px] text-ink-2" /><Tools t="course_chapters" id={c.id} c={id} /></div>
                        <ul className="ml-2 mt-1">
                          {lecturesOf(c.id).map((l) => (
                            <li key={l.id} className="cv-auto flex items-center gap-2 border-b border-line/60 py-1.5 last:border-0">
                              <Link href={`/admin/courses/${id}/lectures/${l.id}`} className="min-w-0 flex-1 truncate rounded-lg px-2 py-1.5 text-sm hover:bg-wash">{l.title}</Link>
                              {l.is_free_preview && <Badge tone="violet">Free</Badge>}
                              <Badge tone={l.video_status === "ready" ? "good" : "neutral"}>{l.video_status === "ready" ? clock(l.duration_seconds ?? 0) : "no video"}</Badge>
                              <Badge tone={l.status === "published" ? "good" : "neutral"}>{l.status}</Badge>
                              <Tools t="lectures" id={l.id} c={id} />
                            </li>
                          ))}
                        </ul>
                        <form action={addLecture} className="ml-2 mt-2 flex gap-2">
                          <input type="hidden" name="chapter_id" value={c.id} /><input type="hidden" name="course_id" value={id} />
                          <Input name="title" placeholder="New lecture title…" required className="h-10 flex-1" />
                          <Button size="sm" variant="secondary" type="submit">Add lecture</Button>
                        </form>
                      </div>
                    ))}
                    <Add t="course_chapters" parent={m.id} c={id} placeholder="New chapter…" />
                  </div>
                </div>
              ))}
              <Add t="course_modules" parent={s.id} c={id} placeholder="New module…" />
            </div>
          </Card>
        ))}
        <Card className="p-5"><Add t="course_subjects" parent={id} c={id} placeholder="New subject (e.g. Algorithms)…" /></Card>
      </div>

      {isAdmin && (
        <form action={deleteCourse} className="mt-12 border-t border-line pt-6">
          <input type="hidden" name="id" value={course.id} />
          <Button variant="danger" type="submit">Delete this course</Button>
          <p className="mt-2 text-xs text-ink-3">Deletes all its subjects, modules, chapters and lectures. Students who bought it lose access.</p>
        </form>
      )}
    </>
  );
}
