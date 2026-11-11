"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { saveProgress } from "@/app/app/actions";

const RATES = [0.75, 1, 1.25, 1.5, 1.75, 2];

export function Player({
  src, lectureId, startAt, nextHref,
}: { src: string; lectureId: string; startAt: number; nextHref: string | null }) {
  const router = useRouter();
  const box = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const acc = useRef(0);            // seconds genuinely watched since last save
  const last = useRef(0);           // previous currentTime, to ignore seeks
  const lastSavedPos = useRef(-1);
  const [rate, setRate] = useState(1);

  const flush = useCallback(() => {
    const v = video.current;
    if (!v) return;
    const pos = Math.floor(v.currentTime);
    if (acc.current < 1 && pos === lastSavedPos.current) return;
    const delta = acc.current;
    acc.current = 0;
    lastSavedPos.current = pos;
    void saveProgress(lectureId, pos, delta);
  }, [lectureId]);

  useEffect(() => {
    const id = setInterval(() => { if (video.current && !video.current.paused) flush(); }, 10_000);
    const onHide = () => { if (document.visibilityState === "hidden") flush(); };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", flush);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", onHide); window.removeEventListener("pagehide", flush); flush(); };
  }, [flush]);

  const seek = (by: number) => { const v = video.current; if (v) v.currentTime = Math.max(0, Math.min(v.duration || 0, v.currentTime + by)); };
  const setSpeed = (r: number) => { setRate(r); if (video.current) video.current.playbackRate = r; };

  function onKey(e: React.KeyboardEvent) {
    const t = e.target as HTMLElement;
    if (t.tagName === "INPUT" || t.tagName === "SELECT" || t.tagName === "TEXTAREA") return;
    const v = video.current; if (!v) return;
    switch (e.key) {
      case " ": case "k": e.preventDefault(); v.paused ? void v.play() : v.pause(); break;
      case "j": case "ArrowLeft": e.preventDefault(); seek(-10); break;
      case "l": case "ArrowRight": e.preventDefault(); seek(10); break;
      case "m": v.muted = !v.muted; break;
      case "f": document.fullscreenElement ? void document.exitFullscreen() : void box.current?.requestFullscreen(); break;
      case ">": setSpeed(RATES[Math.min(RATES.length - 1, RATES.indexOf(rate) + 1)]); break;
      case "<": setSpeed(RATES[Math.max(0, RATES.indexOf(rate) - 1)]); break;
    }
  }

  return (
    <div ref={box} onKeyDown={onKey} tabIndex={-1} className="outline-none">
      <video
        ref={video}
        src={src}
        className="aspect-video w-full rounded-2xl bg-black"
        controls
        controlsList="nodownload noplaybackrate"
        disablePictureInPicture
        playsInline
        preload="metadata"
        onContextMenu={(e) => e.preventDefault()}
        onLoadedMetadata={(e) => {
          const v = e.currentTarget;
          if (startAt > 5 && startAt < v.duration - 5) { v.currentTime = startAt; last.current = startAt; }
        }}
        onTimeUpdate={(e) => {
          const t = e.currentTarget.currentTime;
          const d = t - last.current;
          if (d > 0 && d < 1.5) acc.current += d; // normal playback; jumps (seeks) are ignored
          last.current = t;
        }}
        onPause={flush}
        onEnded={() => { flush(); if (nextHref) router.push(nextHref); }}
      />
      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        <button onClick={() => seek(-10)} className="h-9 rounded-full bg-wash px-4 hover:bg-line">⟲ 10s</button>
        <button onClick={() => seek(10)} className="h-9 rounded-full bg-wash px-4 hover:bg-line">10s ⟳</button>
        <div className="ml-auto flex items-center gap-1" role="group" aria-label="Playback speed">
          {RATES.map((r) => (
            <button key={r} onClick={() => setSpeed(r)} aria-pressed={r === rate}
              className={`h-9 rounded-full px-3 ${r === rate ? "bg-ink text-paper" : "bg-wash hover:bg-line"}`}>{r}×</button>
          ))}
        </div>
      </div>
      <p className="mt-2 hidden text-xs text-ink-3 sm:block">Shortcuts: Space play/pause · J / L skip 10s · &lt; &gt; speed · F fullscreen</p>
    </div>
  );
}
