import Link from "next/link";
import clsx from "clsx";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireViewer } from "@/lib/auth";
import { getCourseBySlug, getCurriculum } from "@/lib/catalog";
import { Player } from "@/components/player";
import { Badge, LinkButton } from "@/components/ui";
import { IconBook, IconCheck, IconLock, IconPlay } from "@/components/icons";
import { clock } from "@/lib/format";

export const metadata = { title: "Learn" };

export default async function LearnPage({ params }: { params: Promise<{ slug: string; lectureId?: string[] }> }) {
  const { slug, lectureId } = await params;
  const { user } = await requireViewer(`/app/learn/${slug}`);
  const course = await getCourseBySlug(slug);
  if (!course) notFound();

  const supabase = await createClient();
  const [tree, { data: hasAccess }, { data: prog }] = await Promise.all([
    getCurriculum(course.id),
    supabase.rpc("has_course_access", { p_course: course.id }),
    supabase.from("lecture_progress").select("lecture_id,last_position_seconds,completed_at,updated_at").eq("user_id", user.id),
  ]);
  const enrolled = hasAccess === true;
  const done = new Set((prog ?? []).filter((p) => p.completed_at).map((p) => p.lecture_id));

  const flat = tree.flatMap((s) => s.modules.flatMap((m) => m.chapters.flatMap((c) => c.lectures.filter((l) => l.status === "published").map((l) => ({ ...l, chapter: c.title, module: m.title })))));
  const canOpen = (l: { is_free_preview: boolean }) => enrolled || l.is_free_preview;
  const lastWatched = [...(prog ?? [])].sort((a, b) => b.updated_at.localeCompare(a.updated_at)).find((p) => flat.some((l) => l.id === p.lecture_id && canOpen(l)));
  const currentId = lectureId?.[0] ?? lastWatched?.lecture_id ?? flat.find(canOpen)?.id ?? flat[0]?.id;
  const current = flat.find((l) => l.id === currentId);
  const idx = flat.findIndex((l) => l.id === currentId);
  const next = flat.slice(idx + 1).find(canOpen);
  const doneCount = flat.filter((l) => done.has(l.id)).length;

  let src: string | null = null, notesUrl: string | null = null;
  let detail: { description: string | null; video_status: string } | null = null;
  if (current && canOpen(current)) {
    const { data } = await supabase.from("lectures").select("description,video_path,video_status,notes_path").eq("id", current.id).single();
    detail = data;
    const [v, n] = await Promise.all([
      data?.video_path && data.video_status === "ready" ? supabase.storage.from("lecture-videos").createSignedUrl(data.video_path, 7200) : null,
      data?.notes_path ? supabase.storage.from("lecture-notes").createSignedUrl(data.notes_path, 7200) : null,
    ]);
    src = v?.data?.signedUrl ?? null; notesUrl = n?.data?.signedUrl ?? null;
  }
  const startAt = (prog ?? []).find((p) => p.lecture_id === currentId && !p.completed_at)?.last_position_seconds ?? 0;

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-night-line bg-night px-4 text-white">
        <Link href="/app" className="rounded-lg px-3 py-1.5 text-sm text-night-ink hover:bg-white/10 hover:text-white">← Dashboard</Link>
        <p className="min-w-0 flex-1 truncate text-sm font-semibold">{course.title}</p>
        <span className="hidden text-xs text-night-ink sm:block">{doneCount}/{flat.length} complete</span>
      </header>

      <div className="mx-auto grid max-w-[90rem] gap-8 px-4 py-6 sm:px-6 lg:grid-cols-[1fr_23rem]">
        <main id="main" className="min-w-0">
          {current && canOpen(current) ? (
            <>
              {src ? (
                <Player key={current.id} src={src} lectureId={current.id} startAt={startAt}
                  nextHref={next ? `/app/learn/${course.slug}/${next.id}` : null} nextTitle={next?.title} />
              ) : (
                <div className="flex aspect-video flex-col items-center justify-center gap-2 rounded-2xl bg-night text-night-ink">
                  <IconPlay size={22} /><p className="text-sm">{detail?.video_status === "ready" ? "Video unavailable right now" : "The video for this lecture isn't uploaded yet"}</p>
                </div>
              )}
              <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-3">{current.module} · {current.chapter}</p>
                  <h1 className="mt-2 font-display text-2xl font-bold tracking-tight sm:text-3xl">{current.title}</h1>
                </div>
                <div className="flex gap-2">
                  {notesUrl && <a href={notesUrl} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-2 rounded-lg border border-line-strong px-4 text-sm font-semibold hover:bg-wash"><IconBook size={15} />Notes</a>}
                  {next && <LinkButton href={`/app/learn/${course.slug}/${next.id}`} variant="primary" size="sm" className="h-10">Next lecture →</LinkButton>}
                </div>
              </div>
              {detail?.description && <p className="mt-5 max-w-3xl whitespace-pre-line leading-relaxed text-ink-2">{detail.description}</p>}
            </>
          ) : current ? (
            <div className="on-night relative flex aspect-video flex-col items-center justify-center overflow-hidden rounded-2xl bg-night px-6 text-center text-white">
              <div className="grid-bg glow-top absolute inset-0" aria-hidden />
              <span className="relative flex size-14 items-center justify-center rounded-full bg-white/10"><IconLock size={22} /></span>
              <h1 className="relative mt-5 font-display text-2xl font-bold tracking-tight">{current.title}</h1>
              <p className="relative mt-2 max-w-sm text-night-ink">This lecture is part of the full course. Enroll to unlock every lecture, practice and test.</p>
              {course.product && <LinkButton href={`/checkout/${course.product.id}`} variant="inverse" size="lg" className="relative mt-6">Enroll now</LinkButton>}
            </div>
          ) : (
            <div className="rounded-2xl border border-line p-10 text-center text-ink-3">No lectures have been published for this course yet.</div>
          )}
        </main>

        <aside className="scroll-y lg:sticky lg:top-20 lg:h-[calc(100dvh-6rem)] lg:pr-1">
          <div className="mb-4 rounded-2xl bg-wash p-4">
            <div className="flex items-baseline justify-between text-sm"><span className="font-semibold">Your progress</span><span className="text-ink-3">{flat.length ? Math.round((doneCount / flat.length) * 100) : 0}%</span></div>
            <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-line"><div className="h-full rounded-full bg-violet-500" style={{ width: `${flat.length ? (doneCount / flat.length) * 100 : 0}%` }} /></div>
          </div>
          <div className="space-y-5">
            {tree.map((s) => s.modules.map((m) => (
              <div key={m.id}>
                <p className="mb-1.5 px-3 text-xs font-semibold uppercase tracking-[0.12em] text-ink-3">{m.title}</p>
                <ul>
                  {m.chapters.flatMap((c) => c.lectures.filter((l) => l.status === "published")).map((l) => {
                    const open = canOpen(l), active = l.id === currentId, fin = done.has(l.id);
                    return (
                      <li key={l.id}>
                        <Link href={`/app/learn/${course.slug}/${l.id}`} aria-current={active ? "page" : undefined}
                          className={clsx("cv-auto flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                            active ? "bg-ink text-white" : open ? "hover:bg-wash" : "text-ink-3 hover:bg-wash")}>
                          <span className={clsx("flex size-5 shrink-0 items-center justify-center rounded-full",
                            fin ? "bg-good text-white" : active ? "bg-white/15" : "border border-line-strong")}>
                            {fin ? <IconCheck size={12} /> : open ? <IconPlay size={9} /> : <IconLock size={11} />}
                          </span>
                          <span className="min-w-0 flex-1 truncate">{l.title}</span>
                          {l.is_free_preview && !enrolled && <Badge tone="violet">Free</Badge>}
                          <span className={clsx("shrink-0 text-xs tabular-nums", active ? "text-white/70" : "text-ink-4")}>{l.duration_seconds ? clock(l.duration_seconds) : ""}</span>
                        </Link>
                      </li>
                    );
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
