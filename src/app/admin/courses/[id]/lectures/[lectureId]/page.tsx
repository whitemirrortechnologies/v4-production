import Link from "next/link";
import { notFound } from "next/navigation";
import { getViewer, requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Badge, Card, Input, Label, Select, Textarea } from "@/components/ui";
import { ActionForm, Submit } from "@/components/forms";
import { FileUploader } from "@/components/file-uploader";
import { removeNotes, removeVideo, updateLecture } from "../../../actions";
import { bytes, clock } from "@/lib/format";
import type { Lecture } from "@/lib/types";

export default async function LecturePage({ params }: { params: Promise<{ id: string; lectureId: string }> }) {
  const { id, lectureId } = await params;
  await requireStaff(`/admin/courses/${id}/lectures/${lectureId}`);
  const isAdmin = (await getViewer())?.profile.role === "admin";
  const supabase = await createClient();
  const { data: lec } = await supabase.from("lectures").select("*").eq("id", lectureId).eq("course_id", id).maybeSingle<Lecture>();
  if (!lec) notFound();

  const [video, notes] = await Promise.all([
    lec.video_path ? supabase.storage.from("lecture-videos").createSignedUrl(lec.video_path, 3600) : null,
    lec.notes_path ? supabase.storage.from("lecture-notes").createSignedUrl(lec.notes_path, 3600) : null,
  ]);
  const hidden = <><input type="hidden" name="id" value={lec.id} /><input type="hidden" name="course_id" value={id} /></>;

  return (
    <>
      <Link href={`/admin/courses/${id}`} className="text-sm text-ink-3 hover:text-ink">← Back to curriculum</Link>
      <div className="mb-8 mt-3 flex flex-wrap items-center gap-3">
        <h1 className="h2">{lec.title}</h1>
        <Badge tone={lec.status === "published" ? "good" : "neutral"}>{lec.status === "published" ? "Live" : lec.status}</Badge>
        {lec.is_free_preview && <Badge tone="violet">Free preview</Badge>}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="space-y-6">
          <Card className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold tracking-tight">Video</h2>
              {lec.video_status === "ready" && <span className="text-sm text-ink-3">{clock(lec.duration_seconds ?? 0)} · {bytes(lec.video_size_bytes)}</span>}
            </div>
            {video?.data?.signedUrl && (
              <video className="mb-5 aspect-video w-full rounded-xl bg-black" src={video.data.signedUrl} controls preload="metadata" playsInline />
            )}
            <FileUploader kind="video" lectureId={lec.id} courseId={id} hasFile={!!lec.video_path} />
            {lec.video_path && (
              <ActionForm action={removeVideo} confirm="Remove this video? Students will no longer be able to watch it." confirmLabel="Remove" className="mt-4">
                {hidden}<Submit size="sm" variant="danger">Remove video</Submit>
              </ActionForm>
            )}
          </Card>

          <Card className="p-6">
            <h2 className="mb-4 font-display text-lg font-bold tracking-tight">Notes (PDF)</h2>
            {notes?.data?.signedUrl && (
              <a href={notes.data.signedUrl} target="_blank" rel="noreferrer" className="mb-4 flex items-center justify-between rounded-xl border border-line px-4 py-3 text-sm hover:bg-wash">
                <span className="font-semibold">Current notes</span><span className="text-violet-600">Open ↗</span>
              </a>
            )}
            <FileUploader kind="notes" lectureId={lec.id} courseId={id} hasFile={!!lec.notes_path} />
            {lec.notes_path && (
              <ActionForm action={removeNotes} confirm="Remove the notes PDF from this lecture?" confirmLabel="Remove" className="mt-4">
                {hidden}<Submit size="sm" variant="danger">Remove notes</Submit>
              </ActionForm>
            )}
          </Card>
        </div>

        <Card className="h-fit p-6 lg:sticky lg:top-6">
          <h2 className="mb-5 font-display text-lg font-bold tracking-tight">Details</h2>
          <ActionForm action={updateLecture} className="space-y-5">
            {hidden}
            <label className="block"><Label>Title</Label><Input name="title" defaultValue={lec.title} required /></label>
            <label className="block"><Label>Description</Label><Textarea name="description" defaultValue={lec.description ?? ""} rows={4} /></label>
            <label className="block"><Label hint="students only see published lectures">Status</Label>
              <Select name="status" defaultValue={lec.status}><option value="draft">Draft (hidden)</option><option value="published">Published (live)</option><option value="archived">Archived</option></Select>
            </label>
            {isAdmin ? (
              <label className="flex items-start gap-2.5 rounded-xl bg-violet-50 p-3 text-sm">
                <input type="hidden" name="is_free_preview_present" value="1" />
                <input type="checkbox" name="is_free_preview" defaultChecked={lec.is_free_preview} className="mt-0.5 size-4 accent-violet-600" />
                <span><span className="font-semibold">Free preview</span><br /><span className="text-ink-3">Anyone can watch this lecture without buying.</span></span>
              </label>
            ) : (
              <p className="rounded-xl bg-wash p-3 text-sm text-ink-3">{lec.is_free_preview ? "This lecture is a free preview." : "Only admins can make a lecture free."}</p>
            )}
            <Submit className="w-full">Save lecture</Submit>
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
