"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { saveProgress } from "@/app/app/actions";
import { clock } from "@/lib/format";
import { IconBack10, IconExpand, IconFwd10, IconMute, IconPause, IconPlay, IconVolume } from "@/components/icons";

const RATES = [0.75, 1, 1.25, 1.5, 1.75, 2];

export function Player({ src, lectureId, startAt, nextHref, nextTitle }: {
  src: string; lectureId: string; startAt: number; nextHref: string | null; nextTitle?: string;
}) {
  const router = useRouter();
  const box = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const acc = useRef(0), last = useRef(0), lastSaved = useRef(-1), hideTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [playing, setPlaying] = useState(false);
  const [t, setT] = useState(0);
  const [dur, setDur] = useState(0);
  const [buf, setBuf] = useState(0);
  const [rate, setRate] = useState(1);
  const [muted, setMuted] = useState(false);
  const [vol, setVol] = useState(1);
  const [ui, setUi] = useState(true);
  const [rateOpen, setRateOpen] = useState(false);
  const [ended, setEnded] = useState(false);
  const [resumed, setResumed] = useState(false);

  const flush = useCallback(() => {
    const v = video.current; if (!v) return;
    const pos = Math.floor(v.currentTime);
    if (acc.current < 1 && pos === lastSaved.current) return;
    const d = acc.current; acc.current = 0; lastSaved.current = pos;
    void saveProgress(lectureId, pos, d);
  }, [lectureId]);

  useEffect(() => {
    const id = setInterval(() => { if (video.current && !video.current.paused) flush(); }, 10_000);
    const onHide = () => { if (document.visibilityState === "hidden") flush(); };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", flush);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", onHide); window.removeEventListener("pagehide", flush); flush(); };
  }, [flush]);

  const poke = useCallback(() => {
    setUi(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => { if (video.current && !video.current.paused) { setUi(false); setRateOpen(false); } }, 2500);
  }, []);

  const toggle = () => { const v = video.current; if (!v) return; if (v.paused) { setEnded(false); void v.play(); } else v.pause(); };
  const seek = (by: number) => { const v = video.current; if (v) v.currentTime = Math.max(0, Math.min(v.duration || 0, v.currentTime + by)); poke(); };
  const setSpeed = (r: number) => { setRate(r); if (video.current) video.current.playbackRate = r; setRateOpen(false); };
  const fullscreen = () => {
    const v = video.current as (HTMLVideoElement & { webkitEnterFullscreen?: () => void }) | null;
    if (document.fullscreenElement) void document.exitFullscreen();
    else if (box.current?.requestFullscreen) void box.current.requestFullscreen();
    else v?.webkitEnterFullscreen?.(); // iOS Safari
  };

  function onKey(e: React.KeyboardEvent) {
    const tag = (e.target as HTMLElement).tagName;
    if (tag === "SELECT" || tag === "TEXTAREA" || (tag === "INPUT" && (e.target as HTMLInputElement).type !== "range")) return;
    const v = video.current; if (!v) return;
    switch (e.key) {
      case " ": case "k": e.preventDefault(); toggle(); break;
      case "j": case "ArrowLeft": e.preventDefault(); seek(-10); break;
      case "l": case "ArrowRight": e.preventDefault(); seek(10); break;
      case "m": v.muted = !v.muted; setMuted(v.muted); break;
      case "f": fullscreen(); break;
      case ">": setSpeed(RATES[Math.min(RATES.length - 1, RATES.indexOf(rate) + 1)]); break;
      case "<": setSpeed(RATES[Math.max(0, RATES.indexOf(rate) - 1)]); break;
    }
    poke();
  }

  const pct = dur ? (t / dur) * 100 : 0;
  const show = ui || !playing;

  return (
    <div ref={box} tabIndex={0} onKeyDown={onKey} onMouseMove={poke} onTouchStart={poke}
      className={clsx("group relative aspect-video w-full select-none overflow-hidden rounded-2xl bg-black outline-none [&:fullscreen]:rounded-none", !show && "cursor-none")}>
      <video ref={video} src={src} className="size-full" playsInline preload="metadata"
        onContextMenu={(e) => e.preventDefault()} onClick={toggle} onDoubleClick={fullscreen}
        onLoadedMetadata={(e) => {
          const v = e.currentTarget; setDur(v.duration);
          if (startAt > 5 && startAt < v.duration - 5) { v.currentTime = startAt; last.current = startAt; setResumed(true); setTimeout(() => setResumed(false), 3000); }
        }}
        onTimeUpdate={(e) => {
          const v = e.currentTarget, now = v.currentTime, d = now - last.current;
          if (d > 0 && d < 1.5) acc.current += d; // real watching only; seeks don't count
          last.current = now; setT(now);
        }}
        onProgress={(e) => { const v = e.currentTarget; if (v.buffered.length) setBuf(v.buffered.end(v.buffered.length - 1)); }}
        onPlay={() => { setPlaying(true); poke(); }} onPause={() => { setPlaying(false); setUi(true); flush(); }}
        onEnded={() => { setPlaying(false); setEnded(true); flush(); }}
        onVolumeChange={(e) => { setMuted(e.currentTarget.muted); setVol(e.currentTarget.volume); }}
      />

      {resumed && <div className="rise pointer-events-none absolute left-1/2 top-4 -translate-x-1/2 rounded-full bg-black/70 px-4 py-1.5 text-xs font-medium text-white">Resumed from {clock(startAt)}</div>}

      {!playing && !ended && (
        <button onClick={toggle} aria-label="Play" className="absolute left-1/2 top-1/2 flex size-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-ink shadow-lift transition-transform hover:scale-105 sm:size-20">
          <IconPlay size={28} />
        </button>
      )}

      {ended && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/75 p-6 text-center text-white">
          <p className="text-sm text-night-ink">Lecture complete</p>
          {nextHref ? (
            <>
              <p className="max-w-md font-display text-xl font-bold tracking-tight">Up next: {nextTitle}</p>
              <div className="flex gap-2">
                <button onClick={() => router.push(nextHref)} className="h-11 rounded-lg bg-white px-5 text-sm font-semibold text-ink">Play next</button>
                <button onClick={toggle} className="h-11 rounded-lg border border-white/30 px-5 text-sm font-semibold">Replay</button>
              </div>
            </>
          ) : (
            <button onClick={toggle} className="h-11 rounded-lg bg-white px-5 text-sm font-semibold text-ink">Replay</button>
          )}
        </div>
      )}

      <div className={clsx("absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent px-3 pb-2.5 pt-12 text-white transition-opacity duration-300 sm:px-4",
        show ? "opacity-100" : "pointer-events-none opacity-0")}>
        <div className="group/bar relative h-4">
          <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-white/20 transition-[height] group-hover/bar:h-1.5">
            <div className="absolute inset-y-0 left-0 rounded-full bg-white/30" style={{ width: `${dur ? (buf / dur) * 100 : 0}%` }} />
            <div className="absolute inset-y-0 left-0 rounded-full bg-violet-500" style={{ width: `${pct}%` }} />
          </div>
          <div className="pointer-events-none absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white opacity-0 shadow transition-opacity group-hover/bar:opacity-100" style={{ left: `${pct}%` }} />
          <input type="range" min={0} max={dur || 0} step={0.1} value={t} aria-label="Seek"
            onChange={(e) => { const v = video.current; if (v) { v.currentTime = Number(e.target.value); setT(v.currentTime); } }}
            className="absolute inset-0 w-full cursor-pointer opacity-0" />
        </div>
        <div className="mt-1 flex items-center gap-1 sm:gap-2">
          <button onClick={toggle} aria-label={playing ? "Pause" : "Play"} className="flex size-9 items-center justify-center rounded-lg hover:bg-white/15">{playing ? <IconPause size={18} /> : <IconPlay size={18} />}</button>
          <button onClick={() => seek(-10)} aria-label="Back 10 seconds" className="flex size-9 items-center justify-center rounded-lg hover:bg-white/15"><IconBack10 size={18} /></button>
          <button onClick={() => seek(10)} aria-label="Forward 10 seconds" className="flex size-9 items-center justify-center rounded-lg hover:bg-white/15"><IconFwd10 size={18} /></button>
          <div className="group/vol hidden items-center sm:flex">
            <button onClick={() => { const v = video.current; if (v) v.muted = !v.muted; }} aria-label={muted ? "Unmute" : "Mute"} className="flex size-9 items-center justify-center rounded-lg hover:bg-white/15">
              {muted || vol === 0 ? <IconMute size={18} /> : <IconVolume size={18} />}
            </button>
            <input type="range" min={0} max={1} step={0.05} value={muted ? 0 : vol} aria-label="Volume"
              onChange={(e) => { const v = video.current; if (v) { v.volume = Number(e.target.value); v.muted = v.volume === 0; } }}
              className="w-0 accent-white opacity-0 transition-all duration-200 group-hover/vol:w-20 group-hover/vol:opacity-100 focus:w-20 focus:opacity-100" />
          </div>
          <span className="ml-1 text-xs tabular-nums text-white/85">{clock(t)} <span className="text-white/50">/ {clock(dur)}</span></span>
          <div className="relative ml-auto">
            <button onClick={() => setRateOpen((o) => !o)} aria-label="Playback speed" aria-expanded={rateOpen} className="h-9 rounded-lg px-2.5 text-sm font-semibold tabular-nums hover:bg-white/15">{rate}×</button>
            {rateOpen && (
              <div className="absolute bottom-11 right-0 w-28 overflow-hidden rounded-xl bg-night-3/95 py-1 shadow-lift ring-1 ring-white/10">
                {RATES.map((r) => (
                  <button key={r} onClick={() => setSpeed(r)} className={clsx("block w-full px-4 py-2 text-left text-sm hover:bg-white/10", r === rate && "text-violet-300")}>{r === 1 ? "Normal" : `${r}×`}</button>
                ))}
              </div>
            )}
          </div>
          <button onClick={fullscreen} aria-label="Fullscreen" className="flex size-9 items-center justify-center rounded-lg hover:bg-white/15"><IconExpand size={17} /></button>
        </div>
      </div>
    </div>
  );
}
