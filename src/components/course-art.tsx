import { courseCode } from "@/lib/course-code";

const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

/** Generated cover: black, concentric rings or tilted squares, one indigo dot. Stable per course. */
export function CourseArt({ title, slug, tag, className = "" }: { title: string; slug: string; tag: string; className?: string }) {
  const h = hash(slug);
  const rings = h % 2 === 0;
  const cx = 62 + (h % 5) * 5, cy = 38 + (h % 4) * 6;
  const tilt = -12 + (h % 4) * 8;
  return (
    <div className={`relative isolate overflow-hidden bg-night ${className}`}>
      <svg aria-hidden viewBox="0 0 400 225" className="absolute inset-0 size-full" preserveAspectRatio="xMidYMid slice">
        <defs><radialGradient id={`a${h}`} cx={`${cx}%`} cy={`${cy}%`} r="55%"><stop offset="0" stopColor="#635bff" stopOpacity=".42" /><stop offset="1" stopColor="#635bff" stopOpacity="0" /></radialGradient></defs>
        <rect width="400" height="225" fill={`url(#a${h})`} />
        <g transform={`translate(${cx * 4} ${cy * 2.25}) rotate(${rings ? 0 : tilt})`} fill="none" stroke="#fff" strokeOpacity=".16">
          {[22, 44, 66, 88, 110, 132].map((r, i) => rings
            ? <circle key={r} r={r} strokeOpacity={0.34 - i * 0.045} stroke={i < 3 ? "#7a73ff" : "#fff"} />
            : <rect key={r} x={-r} y={-r} width={r * 2} height={r * 2} rx={r / 7} strokeOpacity={0.34 - i * 0.045} stroke={i < 3 ? "#7a73ff" : "#fff"} />)}
          <circle r="6" fill="#635bff" stroke="none" />
        </g>
      </svg>
      <span className="absolute left-3.5 top-3.5 rounded-full border border-night-line-2 bg-night-3 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-white">{tag}</span>
      <span className="absolute bottom-3 left-4 font-display text-[2.75rem] font-bold leading-none tracking-[-0.045em] text-white/95">{courseCode(title)}</span>
    </div>
  );
}
