import Link from "next/link";
import clsx from "clsx";
import { notFound } from "next/navigation";
import { getViewer, requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { loadTree } from "@/lib/tree";
import { Badge, Card, Input, Label, LinkButton, Select, Textarea } from "@/components/ui";
import { ActionForm, IconSubmit, InlineEdit, Submit } from "@/components/forms";
import { IconDown, IconPlus, IconTrash, IconUp, IconVideo, IconChevron } from "@/components/icons";
import type { Course, Product } from "@/lib/types";
import { addLecture, addNode, deleteCourse, deleteNode, moveNode, renameNode, savePricing, updateCourse } from "../actions";
import { clock, duration } from "@/lib/format";

export const metadata = { title: "Edit course · Admin" };

function Tools({ t, id, c, what }: { t: string; id: string; c: string; what: string }) {
  const hidden = <><input type="hidden" name="table" value={t} /><input type="hidden" name="id" value={id} /><input type="hidden" name="course_id" value={c} /></>;
  return (
    <span className="flex shrink-0 items-center opacity-60 transition-opacity group-hover/row:opacity-100 focus-within:opacity-100">
      <ActionForm action={moveNode}>{hidden}<input type="hidden" name="dir" value="-1" /><IconSubmit label="Move up"><IconUp size={15} /></IconSubmit></ActionForm>
      <ActionForm action={moveNode}>{hidden}<input type="hidden" name="dir" value="1" /><IconSubmit label="Move down"><IconDown size={15} /></IconSubmit></ActionForm>
      <ActionForm action={deleteNode} confirm={`Delete this ${what}${t === "lectures" ? " and its video" : " and everything inside it"}? This can't be undone.`}>
        {hidden}<IconSubmit label={`Delete ${what}`} danger><IconTrash size={15} /></IconSubmit>
      </ActionForm>
    </span>
  );
}

function AddRow({ action, fields, placeholder, name = "title", label = "Add" }: {
  action: typeof addNode; fields: Record<string, string>; placeholder: string; name?: string; label?: string;
}) {
  return (
    <ActionForm action={action} resetOnSuccess className="flex items-center gap-2">
      {Object.entries(fields).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <span className="flex size-8 shrink-0 items-center justify-center text-ink-4"><IconPlus size={15} /></span>
      <input name={name} placeholder={placeholder} required aria-label={placeholder}
        className="h-9 min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-2 text-sm placeholder:text-ink-4 hover:border-line focus:border-violet-500 focus:bg-paper focus:outline-none" />
      <Submit size="sm" variant="secondary">{label}</Submit>
    </ActionForm>
  );
}

export default async function EditCourse({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const { id } = await params;
  await requireStaff(`/admin/courses/${id}`);
  const { tab = "curriculum" } = await searchParams;
  const isAdmin = (await getViewer())?.profile.role === "admin";
  const supabase = await createClient();

  const [{ data: course }, { data: product }, tree] = await Promise.all([
    supabase.from("courses").select("*").eq("id", id).maybeSingle<Course>(),
    supabase.from("products").select("*").eq("course_id", id).maybeSingle<Product>(),
    loadTree(supabase, id),
  ]);
  if (!course) notFound();
  const lectures = tree.flatMap((s) => s.modules.flatMap((m) => m.chapters.flatMap((c) => c.lectures)));
  const total = lectures.reduce((n, l) => n + (l.duration_seconds ?? 0), 0);

  const tabs = [["curriculum", "Curriculum"], ["details", "Details"], ...(isAdmin ? [["pricing", "Pricing"]] : [])];

  return (
    <>
      <Link href="/admin/courses" className="text-sm text-ink-3 hover:text-ink">← Courses</Link>
      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="h2">{course.title}</h1>
          <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-ink-3">
            <Badge tone={course.status === "published" ? "good" : "neutral"}>{course.status === "published" ? "Live" : course.status}</Badge>
            {lectures.length} lectures · {duration(total)} · {lectures.filter((l) => l.video_status === "ready").length} with video
            {product && <> · {product.price_paise === 0 ? "Free" : `₹${((product.sale_price_paise ?? product.price_paise) / 100).toLocaleString("en-IN")}`}</>}
          </p>
        </div>
        {course.status === "published" && <LinkButton href={`/courses/${course.slug}`} variant="outline" size="sm" target="_blank">View live ↗</LinkButton>}
      </div>

      <nav className="mb-8 mt-8 flex gap-1 border-b border-line" aria-label="Course sections">
        {tabs.map(([k, label]) => (
          <Link key={k} href={`?tab=${k}`} aria-current={tab === k ? "page" : undefined}
            className={clsx("-mb-px border-b-2 px-4 py-2.5 text-sm font-semibold", tab === k ? "border-violet-500 text-ink" : "border-transparent text-ink-3 hover:text-ink")}>{label}</Link>
        ))}
      </nav>

      {tab === "details" && (
        <Card className="max-w-3xl p-6">
          <ActionForm action={updateCourse} className="grid gap-5 sm:grid-cols-2">
            <input type="hidden" name="id" value={course.id} />
            <label className="block sm:col-span-2"><Label>Title</Label><Input name="title" defaultValue={course.title} required /></label>
            <label className="block"><Label hint="web address">Slug</Label><Input name="slug" defaultValue={course.slug} required /></label>
            <label className="block"><Label>Status</Label>
              <Select name="status" defaultValue={course.status}><option value="draft">Draft (hidden)</option><option value="published">Published (live)</option><option value="archived">Archived</option></Select>
            </label>
            <label className="block sm:col-span-2"><Label>Subtitle</Label><Input name="subtitle" defaultValue={course.subtitle ?? ""} placeholder="One line shown on the course card" /></label>
            <label className="block sm:col-span-2"><Label>Description</Label><Textarea name="description" defaultValue={course.description ?? ""} rows={6} /></label>
            <div className="flex items-center justify-between gap-4 sm:col-span-2">
              <Submit>Save details</Submit>
            </div>
          </ActionForm>
          {isAdmin && (
            <div className="mt-10 border-t border-line pt-6">
              <p className="font-semibold">Danger zone</p>
              <p className="mb-3 mt-1 text-sm text-ink-3">Deletes all subjects, modules, chapters and lectures. Students who bought it lose access.</p>
              <ActionForm action={deleteCourse} confirm={`Delete "${course.title}" permanently?`} confirmLabel="Delete course">
                <input type="hidden" name="id" value={course.id} /><Submit variant="danger" size="sm">Delete course</Submit>
              </ActionForm>
            </div>
          )}
        </Card>
      )}

      {tab === "pricing" && isAdmin && (
        <Card className="max-w-3xl p-6">
          <p className="mb-6 text-sm text-ink-3">Set the price to 0 to make the whole course free. Only admins can change pricing.</p>
          <ActionForm action={savePricing} className="grid gap-5 sm:grid-cols-2">
            <input type="hidden" name="course_id" value={course.id} />
            <label className="block"><Label>Price (₹)</Label><Input name="price" type="number" min={0} step="1" defaultValue={product ? product.price_paise / 100 : ""} required /></label>
            <label className="block"><Label hint="optional">Sale price (₹)</Label><Input name="sale_price" type="number" min={0} step="1" defaultValue={product?.sale_price_paise != null ? product.sale_price_paise / 100 : ""} /></label>
            <label className="block"><Label hint="blank = lifetime">Access (days)</Label><Input name="validity_days" type="number" min={1} defaultValue={product?.validity_days ?? ""} /></label>
            <label className="block"><Label hint="or end on a date">Access until</Label><Input name="access_until" type="date" defaultValue={product?.access_until ?? ""} /></label>
            <label className="flex items-center gap-2.5 text-sm font-medium sm:col-span-2"><input type="checkbox" name="is_active" defaultChecked={product?.is_active ?? true} className="size-4 accent-violet-600" />On sale (students can buy it)</label>
            <div className="sm:col-span-2"><Submit>Save pricing</Submit></div>
          </ActionForm>
        </Card>
      )}

      {tab === "curriculum" && (
        <div className="max-w-4xl space-y-5">
          {tree.map((s) => (
            <Card key={s.id} className="p-4 sm:p-5">
              <div className="group/row flex items-center gap-1">
                <InlineEdit action={renameNode} name="title" value={s.title} label="Subject title" className="font-display text-lg font-bold tracking-tight"
                  fields={{ table: "course_subjects", id: s.id, course_id: id }} />
                <Tools t="course_subjects" id={s.id} c={id} what="subject" />
              </div>
              <div className="mt-2 space-y-2">
                {s.modules.map((m) => (
                  <div key={m.id} className="rounded-xl border border-line bg-wash/50">
                    <div className="group/row flex items-center gap-1 px-2 py-1.5">
                      <IconChevron size={15} className="shrink-0 rotate-90 text-ink-4" />
                      <InlineEdit action={renameNode} name="title" value={m.title} label="Module title" className="font-semibold"
                        fields={{ table: "course_modules", id: m.id, course_id: id }} />
                      <Tools t="course_modules" id={m.id} c={id} what="module" />
                    </div>
                    <div className="space-y-3 border-t border-line bg-paper px-3 py-3 sm:px-4">
                      {m.chapters.map((c) => (
                        <div key={c.id}>
                          <div className="group/row flex items-center gap-1">
                            <InlineEdit action={renameNode} name="title" value={c.title} label="Chapter title" className="text-sm font-semibold text-ink-2"
                              fields={{ table: "course_chapters", id: c.id, course_id: id }} />
                            <Tools t="course_chapters" id={c.id} c={id} what="chapter" />
                          </div>
                          <ul className="ml-2 border-l border-line pl-3">
                            {c.lectures.map((l) => (
                              <li key={l.id} className="group/row cv-auto flex items-center gap-2 rounded-lg py-0.5 hover:bg-wash">
                                <IconVideo size={15} className={clsx("ml-1 shrink-0", l.video_status === "ready" ? "text-violet-600" : "text-ink-4")} />
                                <Link href={`/admin/courses/${id}/lectures/${l.id}`} className="min-w-0 flex-1 truncate py-1.5 text-sm hover:underline">{l.title}</Link>
                                <span className="hidden items-center gap-1.5 sm:flex">
                                  {l.is_free_preview && <Badge tone="violet">Free</Badge>}
                                  {l.status !== "published" && <Badge>{l.status}</Badge>}
                                  <span className="w-14 text-right text-xs tabular-nums text-ink-3">{l.video_status === "ready" ? clock(l.duration_seconds ?? 0) : "—"}</span>
                                </span>
                                <Tools t="lectures" id={l.id} c={id} what="lecture" />
                              </li>
                            ))}
                          </ul>
                          <div className="ml-2 pl-3"><AddRow action={addLecture} fields={{ chapter_id: c.id, course_id: id }} placeholder="Add a lecture…" label="Add lecture" /></div>
                        </div>
                      ))}
                      <AddRow action={addNode} fields={{ table: "course_chapters", parent_id: m.id, course_id: id }} placeholder="Add a chapter…" />
                    </div>
                  </div>
                ))}
                <AddRow action={addNode} fields={{ table: "course_modules", parent_id: s.id, course_id: id }} placeholder="Add a module…" />
              </div>
            </Card>
          ))}
          <Card className="border-dashed p-4"><AddRow action={addNode} fields={{ table: "course_subjects", parent_id: id, course_id: id }} placeholder="Add a subject (e.g. Algorithms)…" label="Add subject" /></Card>
          <p className="text-xs text-ink-3">Click any title to rename it. Changes save when you press Enter or click away.</p>
        </div>
      )}
    </>
  );
}
