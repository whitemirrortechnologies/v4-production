import Link from "next/link";
import { notFound } from "next/navigation";
import { getViewer, requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Badge, Button, Card, Input, Label, Notice, PageHeader, Select, Textarea } from "@/components/ui";
import { VideoUploader } from "@/components/video-uploader";
import { removeVideo, updateLecture } from "../../../actions";
import { bytes, clock } from "@/lib/format";
import type { Lecture } from "@/lib/types";

export default async function LecturePage({ params, searchParams }: {
  params: Promise<{ id: string; lectureId: string }>; searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const { id, lectureId } = await params;
  await requireStaff(`/admin/courses/${id}/lectures/${lectureId}`);
  const { error, saved } = await searchParams;
  const isAdmin = (await getViewer())?.profile.role === "admin";
  const supabase = await createClient();
  const { data: lec } = await supabase.from("lectures").select("*").eq("id", lectureId).eq("course_id", id).maybeSingle<Lecture>();
  if (!lec) notFound();

  let previewUrl: string | null = null;
  if (lec.video_path) {
    const { data } = await supabase.storage.from("lecture-videos").createSignedUrl(lec.video_path, 3600);
    previewUrl = data?.signedUrl ?? null;
  }

  return (
    <>
      <Link href={`/admin/courses/${id}`} className="text-sm text-ink-3 hover:text-ink">← Back to course</Link>
      <div className="mt-3"><PageHeader title={lec.title} /></div>
      {error && <div className="mb-6"><Notice tone="error">{error}</Notice></div>}
      {saved && <div className="mb-6"><Notice tone="success">Saved.</Notice></div>}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="mb-4 text-lg font-semibold tracking-tight">Details</h2>
          <form action={updateLecture} className="space-y-4">
            <input type="hidden" name="id" value={lec.id} /><input type="hidden" name="course_id" value={id} />
            <label className="block"><Label>Title</Label><Input name="title" defaultValue={lec.title} required /></label>
            <label className="block"><Label>Description</Label><Textarea name="description" defaultValue={lec.description ?? ""} /></label>
            <label className="block"><Label hint="students only see published lectures">Status</Label>
              <Select name="status" defaultValue={lec.status}><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></Select>
            </label>
            {isAdmin ? (
              <label className="flex items-center gap-2 text-sm">
                <input type="hidden" name="is_free_preview_present" value="1" />
                <input type="checkbox" name="is_free_preview" defaultChecked={lec.is_free_preview} className="size-4 accent-violet-600" />
                Free preview (anyone can watch without buying)
              </label>
            ) : (
              <p className="text-sm text-ink-3">{lec.is_free_preview ? "This lecture is a free preview." : "Only admins can make a lecture free."}</p>
            )}
            <Button type="submit">Save</Button>
          </form>
        </Card>

        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold tracking-tight">Video</h2>
            {lec.video_status === "ready" && <Badge tone="good">{clock(lec.duration_seconds ?? 0)} · {bytes(lec.video_size_bytes)}</Badge>}
          </div>
          {previewUrl && (
            <video className="mb-5 aspect-video w-full rounded-2xl bg-black" src={previewUrl} controls preload="metadata" playsInline />
          )}
          <VideoUploader lectureId={lec.id} courseId={id} />
          {lec.video_path && (
            <form action={removeVideo} className="mt-5 border-t border-line pt-4">
              <input type="hidden" name="id" value={lec.id} /><input type="hidden" name="course_id" value={id} />
              <Button size="sm" variant="danger" type="submit">Remove video</Button>
            </form>
          )}
        </Card>
      </div>
    </>
  );
}
