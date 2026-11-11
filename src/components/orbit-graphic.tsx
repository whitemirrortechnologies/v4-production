/** Hero artwork: faceted sphere + orbits + labels. Pure SVG, generated at render time, no assets. */
type V = [number, number, number];
const T = (1 + Math.sqrt(5)) / 2;
const norm = (v: V): V => { const l = Math.hypot(...v); return [v[0] / l, v[1] / l, v[2] / l]; };
const mid = (a: V, b: V): V => norm([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2]);

function sphere() {
  const base: V[] = ([[-1, T, 0], [1, T, 0], [-1, -T, 0], [1, -T, 0], [0, -1, T], [0, 1, T], [0, -1, -T], [0, 1, -T], [T, 0, -1], [T, 0, 1], [-T, 0, -1], [-T, 0, 1]] as V[]).map(norm);
  const idx = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
    [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]];
  let tris: V[][] = idx.map((f) => f.map((i) => base[i]));
  tris = tris.flatMap(([a, b, c]) => { const ab = mid(a, b), bc = mid(b, c), ca = mid(c, a); return [[a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]]; });
  const ay = 0.45, ax = 0.35;
  const rot = ([x, y, z]: V): V => {
    const x1 = x * Math.cos(ay) + z * Math.sin(ay), z1 = -x * Math.sin(ay) + z * Math.cos(ay);
    const y2 = y * Math.cos(ax) - z1 * Math.sin(ax), z2 = y * Math.sin(ax) + z1 * Math.cos(ax);
    return [x1, y2, z2];
  };
  const light = norm([-0.5, -0.7, 0.6]);
  return tris.map((t) => {
    const r = t.map(rot);
    const n = norm([(r[0][0] + r[1][0] + r[2][0]), (r[0][1] + r[1][1] + r[2][1]), (r[0][2] + r[1][2] + r[2][2])]);
    if (n[2] <= 0) return null;
    const l = Math.max(0, n[0] * light[0] + n[1] * light[1] + n[2] * light[2]);
    const g = Math.round(28 + 150 * l);
    return { pts: r.map(([x, y]) => `${(x * 98).toFixed(1)},${(y * 98).toFixed(1)}`).join(" "), fill: `rgb(${g},${g},${g + 4})` };
  }).filter(Boolean) as { pts: string; fill: string }[];
}

const LABELS: { t: string; x: number; y: number; dim?: boolean; hi?: boolean }[] = [
  { t: "CAT", x: 108, y: 196, dim: true }, { t: "COURSES", x: 232, y: 262 }, { t: "TESTS", x: 352, y: 262, dim: true },
  { t: "ANALYTICS", x: 440, y: 248, dim: true }, { t: "GATE", x: 566, y: 292, hi: true }, { t: "PRACTICE", x: 138, y: 392 },
];

export function OrbitGraphic({ className }: { className?: string }) {
  const faces = sphere();
  return (
    <svg viewBox="0 0 640 440" role="img" aria-label="Courses, practice, tests and analytics orbiting your preparation" className={className}>
      <defs>
        <radialGradient id="og-glow" cx="50%" cy="50%" r="50%"><stop offset="0" stopColor="#635bff" stopOpacity=".28" /><stop offset="1" stopColor="#635bff" stopOpacity="0" /></radialGradient>
      </defs>
      <circle cx="330" cy="215" r="210" fill="url(#og-glow)" />
      <g className="orbit-spin-rev" opacity=".9">
        <ellipse cx="330" cy="215" rx="190" ry="58" transform="rotate(18 330 215)" fill="none" stroke="#ffffff" strokeOpacity=".16" />
        <circle cx="152" cy="256" r="5" fill="#fff" />
      </g>
      <g className="orbit-spin">
        <ellipse cx="330" cy="215" rx="275" ry="82" transform="rotate(8 330 215)" fill="none" stroke="#635bff" strokeOpacity=".95" strokeWidth="1.5" />
        <circle cx="55" cy="177" r="8" fill="#4f46e5" /><circle cx="605" cy="253" r="9" fill="#635bff" />
      </g>
      <line x1="150" y1="400" x2="590" y2="40" stroke="#fff" strokeOpacity=".22" />
      <circle cx="150" cy="378" r="8" fill="#fff" />
      <g transform="translate(330 215)">
        {faces.map((f, i) => <polygon key={i} points={f.pts} fill={f.fill} stroke="#ffffff" strokeOpacity=".22" strokeWidth=".6" strokeLinejoin="round" />)}
      </g>
      {LABELS.map((l) => (
        <g key={l.t} opacity={l.dim ? 0.45 : 1}>
          <rect x={l.x - l.t.length * 4.4 - 10} y={l.y - 13} width={l.t.length * 8.8 + 20} height="26" rx="13" fill={l.hi ? "#1a1740" : "#0a0a0a"} stroke={l.hi ? "#635bff" : "#3a3a3a"} />
          <text x={l.x} y={l.y + 4} textAnchor="middle" fontSize="11" fontWeight="700" letterSpacing="1.3" fill="#fff" fontFamily="var(--font-sans)">{l.t}</text>
        </g>
      ))}
    </svg>
  );
}
