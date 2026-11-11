"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { createClient } from "@/lib/supabase/client";
import { env } from "@/lib/env";
import { toast } from "@/lib/toast";
import { IconUpload } from "@/components/icons";
import { recordNotes, recordVideo } from "@/app/admin/courses/actions";

const KINDS = {
  video: { bucket: "lecture-videos", max: 50, types: ["video/mp4", "video/webm"], accept: "video/mp4,video/webm", label: "video", hint: "MP4 (H.264/AAC) or WebM, up to 50 MB. Best: 720p, ~1 Mbps, “fast start” on." },
  notes: { bucket: "lecture-notes", max: 20, types: ["application/pdf"], accept: "application/pdf", label: "PDF", hint: "PDF, up to 20 MB." },
} as const;

function readDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const v = document.createElement("video"), url = URL.createObjectURL(file);
    v.preload = "metadata";
    v.onloadedmetadata = () => { URL.revokeObjectURL(url); resolve(v.duration); };
    v.onerror = () => { URL.revokeObjectURL(url); reject(new Error("This file can't be read as a video")); };
    v.src = url;
  });
}

/** Drag-and-drop uploader straight to Supabase Storage with real progress; refreshes the page when done. */
export function FileUploader({ kind, lectureId, courseId, hasFile }: { kind: keyof typeof KINDS; lectureId: string; courseId: string; hasFile: boolean }) {
  const k = KINDS[kind];
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [over, setOver] = useState(false);

  async function upload(file: File) {
    if (!(k.types as readonly string[]).includes(file.type)) return toast(`Please choose a ${k.label} file.`, "error");
    if (file.size > k.max * 1048576) return toast(`This file is ${(file.size / 1048576).toFixed(1)} MB. The limit is ${k.max} MB.`, "error");
    try {
      const duration = kind === "video" ? await readDuration(file) : 0;
      const { data } = await createClient().auth.getSession();
      if (!data.session) throw new Error("Your session expired. Please sign in again.");
      const ext = file.type === "video/webm" ? "webm" : file.type === "application/pdf" ? "pdf" : "mp4";
      const path = `${lectureId}/${crypto.randomUUID()}.${ext}`;
      setProgress(0);
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", `${env.supabaseUrl}/storage/v1/object/${k.bucket}/${path}`);
        xhr.setRequestHeader("Authorization", `Bearer ${data.session!.access_token}`);
        xhr.setRequestHeader("apikey", env.supabaseAnonKey);
        xhr.setRequestHeader("Content-Type", file.type);
        xhr.upload.onprogress = (e) => e.lengthComputable && setProgress(Math.round((e.loaded / e.total) * 100));
        xhr.onload = () => (xhr.status < 300 ? resolve() : reject(new Error(safeMsg(xhr.responseText) ?? `Upload failed (${xhr.status})`)));
        xhr.onerror = () => reject(new Error("Network error during upload"));
        xhr.send(file);
      });
      const r = kind === "video"
        ? await recordVideo({ lectureId, courseId, path, size: file.size, durationSeconds: duration })
        : await recordNotes({ lectureId, courseId, path });
      if (r?.error) throw new Error(r.error);
      toast(r?.ok ?? "Uploaded");
      router.refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Upload failed", "error");
    } finally {
      setProgress(null);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div>
      <input ref={input} type="file" accept={k.accept} hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
      <button type="button" disabled={progress !== null}
        onClick={() => input.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); const f = e.dataTransfer.files?.[0]; if (f) upload(f); }}
        className={clsx("flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-7 text-center transition-colors",
          over ? "border-violet-500 bg-violet-50" : "border-line-strong hover:border-ink-4 hover:bg-wash")}>
        {progress === null ? (
          <>
            <span className="flex size-10 items-center justify-center rounded-full bg-wash text-ink-2"><IconUpload size={18} /></span>
            <span className="text-sm font-semibold">{hasFile ? `Replace ${k.label}` : `Upload ${k.label}`}</span>
            <span className="text-xs text-ink-3">Drag a file here or click to choose</span>
          </>
        ) : (
          <span className="w-full max-w-xs">
            <span className="mb-2 block text-sm font-semibold">Uploading… {progress}%</span>
            <span className="block h-1.5 overflow-hidden rounded-full bg-wash" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
              <span className="block h-full rounded-full bg-violet-500 transition-[width] duration-200" style={{ width: `${progress}%` }} />
            </span>
          </span>
        )}
      </button>
      <p className="mt-2 text-xs text-ink-3">{k.hint}</p>
    </div>
  );
}

function safeMsg(t: string) { try { return JSON.parse(t).message as string; } catch { return null; } }
