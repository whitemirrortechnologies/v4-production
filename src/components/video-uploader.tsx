"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { env } from "@/lib/env";
import { Button, Notice } from "@/components/ui";
import { recordVideo } from "@/app/admin/courses/actions";

const MAX_BYTES = 50 * 1024 * 1024; // Supabase Free plan per-file limit
const OK_TYPES = ["video/mp4", "video/webm"];

function readDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const v = document.createElement("video");
    const url = URL.createObjectURL(file);
    v.preload = "metadata";
    v.onloadedmetadata = () => { URL.revokeObjectURL(url); resolve(v.duration); };
    v.onerror = () => { URL.revokeObjectURL(url); reject(new Error("This file can't be read as a video")); };
    v.src = url;
  });
}

export function VideoUploader({ lectureId, courseId }: { lectureId: string; courseId: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function upload(file: File) {
    setError(null); setDone(false);
    if (!OK_TYPES.includes(file.type)) return setError("Please choose an MP4 or WebM video.");
    if (file.size > MAX_BYTES) return setError(`This file is ${(file.size / 1048576).toFixed(1)} MB. The limit is 50 MB. Compress it (720p, H.264) and try again.`);
    try {
      const duration = await readDuration(file);
      const { data } = await createClient().auth.getSession();
      if (!data.session) throw new Error("Your session expired. Please sign in again.");
      const ext = file.type === "video/webm" ? "webm" : "mp4";
      const path = `${lectureId}/${crypto.randomUUID()}.${ext}`;

      setProgress(0);
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", `${env.supabaseUrl}/storage/v1/object/lecture-videos/${path}`);
        xhr.setRequestHeader("Authorization", `Bearer ${data.session!.access_token}`);
        xhr.setRequestHeader("apikey", env.supabaseAnonKey);
        xhr.setRequestHeader("Content-Type", file.type);
        xhr.setRequestHeader("cache-control", "max-age=3600");
        xhr.upload.onprogress = (e) => e.lengthComputable && setProgress(Math.round((e.loaded / e.total) * 100));
        xhr.onload = () => (xhr.status < 300 ? resolve() : reject(new Error(JSON.parse(xhr.responseText || "{}").message ?? `Upload failed (${xhr.status})`)));
        xhr.onerror = () => reject(new Error("Network error during upload"));
        xhr.send(file);
      });

      const res = await recordVideo({ lectureId, courseId, path, size: file.size, durationSeconds: duration });
      if ("error" in res && res.error) throw new Error(res.error);
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setProgress(null);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div className="space-y-3">
      <input ref={input} type="file" accept="video/mp4,video/webm" hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
      <Button type="button" variant="violet" disabled={progress !== null} onClick={() => input.current?.click()}>
        {progress !== null ? `Uploading… ${progress}%` : "Choose video file"}
      </Button>
      {progress !== null && (
        <div className="h-2 overflow-hidden rounded-full bg-wash" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full rounded-full bg-violet-500 transition-[width] duration-200" style={{ width: `${progress}%` }} />
        </div>
      )}
      {error && <Notice tone="error">{error}</Notice>}
      {done && <Notice tone="success">Video uploaded. Refresh to see the preview.</Notice>}
      <p className="text-xs text-ink-3">MP4 (H.264/AAC) or WebM, up to 50 MB. Best: 720p, around 1 Mbps, with &ldquo;fast start&rdquo; enabled.</p>
    </div>
  );
}
