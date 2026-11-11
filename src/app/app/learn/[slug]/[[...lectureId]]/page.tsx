import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireViewer } from "@/lib/auth";
import { getCourseBySlug, getCurriculum } from "@/lib/catalog";
import { Player } from "@/components/player";
import { Badge, Card, LinkButton } from "@/components/ui";
import { clock } from "@/lib/format";

export const metadata = { title: "Learn" };

export default async function LearnPage({ params }: { params: Promise<{ slug: string; lectureId?: string[] }> }) {
  const { slug, lectureId } = await params;
  await requireViewer(`/app/learn/${slug}`);
  const course = await getCourseBySlug(slug);
  if (!course) notFound();

  const supabase = await createClient();
  const [tree, { data: hasAccess }, { data: prog }] = await Promise.all([
    getCurriculum(course.id),
    supabase.rpc("has_course_access", { p_course: course.id }),
    supabase.from("lecture_progress").select("lecture_id,last_position_seconds,completed_at,updated_at").eq("user_id", (await supabase.auth.getUser()).data.user!.id),
  ]);
  const enrolled = hasAccess === true;
  const done = new Set((prog ?? []).filter((p) => p.completed_at).map((p) => p.lecture_id));

  const flat = tree.flatMap((s) => s.modules.flatMap((m) => m.chapters.flatMap((c) => c.lectures.filter((l) => l.status === "published").map((l) => ({ ...l, chapter: c.title })))));
  const canOpen = (l: { is_free_preview: boolean }) => enrolled || l.is_free_preview;
  const lastWatched = [...(prog ?? [])].sort((a, b) => b.updated_at.localeCompare(a.updated_at)).find((p) => flat.some((l) => l.id === p.lecture_id && canOpen(l)));
  const currentId = lectureId?.[0] ?? lastWatched?.lecture_id ?? flat.find(canOpen)?.id ?? flat[0]?.id;
  const current = flat.find((l) => l.id === currentId);
  const idx = flat.findIndex((l) => l.id === currentId);
  const next = flat.slice(idx + 1).find(canOpen);

  let src: string | null = null;
  let detail: { description: string | null; video_path: string | null; video_status: string } | null = null;
  if (current && canOpen(current)) {
    const { data } = await supabase.from("lectures").select("description,video_path,video_status").eq("id", current.id).single();
    detail = data;
    if (data?.video_path && data.video_status === "ready") {
      const signed = await supabase.storage.from("lecture-videos").createSignedUrl(data.video_path, 7200);
      src = signed.data?.signedUrl ?? null;
    }
  }
  const startAt = (prog ?? []).find((p) => p.lecture_id === currentId && !p.completed_at)?.last_position_seconds ?? 0;

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-paper/95 px-4">
        <Link href="/app" className="rounded-full px-3 py-1.5 text-sm text-ink-2 hover:bg-wash">← Dashboard</Link>
        <p className="min-w-0 flex-1 truncate text-sm font-medium">{course.title}</p>
      </header>

      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-6 lg:grid-cols-[1fr_22rem]">
        <main className="min-w-0">
          {current && canOpen(current) ? (
            <>
              {src ? (
                <Player key={current.id} src={src} lectureId={current.id} startAt={startAt} nextHref={next ? `/app/learn/${course.slug}/${next.id}` : null} />
              ) : (
                <div className="flex aspect-video items-center justify-center rounded-2xl bg-wash text-ink-3">
                  {detail?.video_status === "ready" ? "Video unavailable right now" : "The video for this lecture isn't uploaded yet"}
                </div>
              )}
              <h1 className="mt-6 text-2xl font-semibold tracking-tight">{current.title}</h1>
              <p className="mt-1 text-sm text-ink-3">{current.chapter}</p>
              {detail?.description && <p className="mt-4 max-w-2xl whitespace-pre-line text-ink-2">{detail.description}</p>}
            </>
          ) : current ? (
            <Card className="glow-violet flex flex-col items-center px-6 py-16 text-center">
              <div className="text-4xl">🔒</div>
              <h1 className="mt-4 text-2xl font-semibold tracking-tight">{current.title}</h1>
              <p className="mt-2 max-w-sm text-ink-3">This lecture is part of the full course. Enroll to unlock every lecture, practice and test.</p>
              {course.product && <LinkButton href={`/checkout/${course.product.id}`} variant="violet" size="lg" className="mt-6">Enroll now</LinkButton>}
            </Card>
          ) : (
            <Card className="p-10 text-center text-ink-3">No lectures have been published for this course yet.</Card>
          )}
        </main>

        <aside className="lg:sticky lg:top-20 lg:h-[calc(100dvh-6rem)] lg:overflow-y-auto lg:pr-1 scroll-y">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-3">Course content</h2>
          <div className="space-y-4">
            {tree.map((s) => s.modules.map((m) => (
              <div key={m.id}>
                <p className="mb-1 text-[15px] font-semibold">{m.title}</p>
                <ul>
                  {m.chapters.flatMap((c) => c.lectures.filter((l) => l.status === "published")).map((l) => {
                    const open = canOpen(l), active = l.id === currentId;
                    const row = (
                      <span className={`cv-auto flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm ${active ? "bg-violet-50 text-violet-600" : open ? "hover:bg-wash" : "text-ink-3"}`}>
                        <span aria-hidden className="w-4 shrink-0 text-center">{done.has(l.id) ? "✓" : open ? "▶" : "🔒"}</span>
                        <span className="min-w-0 flex-1 truncate">{l.title}</span>
                        {l.is_free_preview && !enrolled && <Badge tone="violet">Free</Badge>}
                        <span className="shrink-0 text-xs text-ink-3">{l.duration_seconds ? clock(l.duration_seconds) : ""}</span>
                      </span>
                    );
                    return <li key={l.id}><Link href={`/app/learn/${course.slug}/${l.id}`}>{row}</Link></li>;
                  })}
                </ul>
              </div>
            )))}
          </div>
        </aside>
      </div>
    </div>
  );
}
