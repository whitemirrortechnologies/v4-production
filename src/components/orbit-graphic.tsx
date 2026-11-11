/** Hero artwork: faceted sphere, two orbits with dots travelling along them, labelled stops. Pure SVG. */
type V = [number, number, number];
const T = (1 + Math.sqrt(5)) / 2;
const norm = (v: V): V => { const l = Math.hypot(...v); return [v[0] / l, v[1] / l, v[2] / l]; };
const mid = (a: V, b: V): V => norm([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2]);
const R = 96, CX = 320, CY = 210;

function sphere() {
  const base: V[] = ([[-1, T, 0], [1, T, 0], [-1, -T, 0], [1, -T, 0], [0, -1, T], [0, 1, T], [0, -1, -T], [0, 1, -T], [T, 0, -1], [T, 0, 1], [-T, 0, -1], [-T, 0, 1]] as V[]).map(norm);
  const idx = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
    [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]];
  let tris: V[][] = idx.map((f) => f.map((i) => base[i]));
  tris = tris.flatMap(([a, b, c]) => { const ab = mid(a, b), bc = mid(b, c), ca = mid(c, a); return [[a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]]; });
  const ay = 0.45, ax = 0.35;
  const rot = ([x, y, z]: V): V => {
    const x1 = x * Math.cos(ay) + z * Math.sin(ay), z1 = -x * Math.sin(ay) + z * Math.cos(ay);
    return [x1, y * Math.cos(ax) - z1 * Math.sin(ax), y * Math.sin(ax) + z1 * Math.cos(ax)];
  };
  const light = norm([-0.5, -0.7, 0.6]);
  return tris.map((t) => {
    const r = t.map(rot);
    const n = norm([r[0][0] + r[1][0] + r[2][0], r[0][1] + r[1][1] + r[2][1], r[0][2] + r[1][2] + r[2][2]]);
    if (n[2] <= 0) return null;
    const g = Math.round(26 + 150 * Math.max(0, n[0] * light[0] + n[1] * light[1] + n[2] * light[2]));
    return { pts: r.map(([x, y]) => `${(x * R).toFixed(1)},${(y * R).toFixed(1)}`).join(" "), fill: `rgb(${g},${g},${g + 4})` };
  }).filter(Boolean) as { pts: string; fill: string }[];
}

/** Ellipse as a path (start at the left end, clockwise) so dots can travel along it. */
const ellipsePath = (rx: number, ry: number) => `M ${CX - rx} ${CY} a ${rx} ${ry} 0 1 0 ${2 * rx} 0 a ${rx} ${ry} 0 1 0 ${-2 * rx} 0`;
/** Back half (upper arc) is drawn behind the sphere, front half in front, for depth. */
const backArc = (rx: number, ry: number) => `M ${CX - rx} ${CY} A ${rx} ${ry} 0 0 1 ${CX + rx} ${CY}`;
const frontArc = (rx: number, ry: number) => `M ${CX + rx} ${CY} A ${rx} ${ry} 0 0 1 ${CX - rx} ${CY}`;

const ORBITS = [
  { rx: 270, ry: 78, tilt: -9, stroke: "#635bff", opacity: 0.95, width: 1.5, dots: [{ r: 7, fill: "#635bff", dur: 26, begin: 0 }, { r: 5, fill: "#a5a0ff", dur: 26, begin: -13 }] },
  { rx: 176, ry: 54, tilt: 16, stroke: "#ffffff", opacity: 0.18, width: 1, dots: [{ r: 4.5, fill: "#ffffff", dur: 17, begin: -5 }] },
];
const LABELS: { t: string; x: number; y: number; hi?: boolean }[] = [
  { t: "CAT", x: 92, y: 112 }, { t: "TESTS", x: 520, y: 92 }, { t: "COURSES", x: 132, y: 318 },
  { t: "PRACTICE", x: 300, y: 398 }, { t: "ANALYTICS", x: 492, y: 372 }, { t: "GATE", x: 588, y: 300, hi: true },
];

export function OrbitGraphic({ className }: { className?: string }) {
  const faces = sphere();
  return (
    <svg viewBox="0 0 640 430" role="img" aria-label="Courses, practice, tests and analytics orbiting your exam preparation" className={className}>
      <defs>
        <radialGradient id="og-glow" cx="50%" cy="50%" r="50%"><stop offset="0" stopColor="#635bff" stopOpacity=".3" /><stop offset="1" stopColor="#635bff" stopOpacity="0" /></radialGradient>
        <radialGradient id="og-dot" cx="50%" cy="50%" r="50%"><stop offset="0" stopColor="#a5a0ff" stopOpacity=".9" /><stop offset="1" stopColor="#635bff" stopOpacity="0" /></radialGradient>
      </defs>
      <circle cx={CX} cy={CY} r="215" fill="url(#og-glow)" />
      <line x1="120" y1="420" x2="590" y2="20" stroke="#fff" strokeOpacity=".12" />

      {/* label connectors (hidden on phones, where labels would be too small to read) */}
      <g className="hidden sm:inline">
      {LABELS.map((l) => {
        const a = Math.atan2(l.y - CY, l.x - CX);
        return <line key={l.t} x1={CX + Math.cos(a) * (R + 10)} y1={CY + Math.sin(a) * (R + 10)} x2={l.x} y2={l.y} stroke="#fff" strokeOpacity=".1" strokeDasharray="2 5" />;
      })}
      </g>

      {/* back halves of the orbits */}
      {ORBITS.map((o, i) => <path key={`b${i}`} d={backArc(o.rx, o.ry)} transform={`rotate(${o.tilt} ${CX} ${CY})`} fill="none" stroke={o.stroke} strokeOpacity={o.opacity * 0.45} strokeWidth={o.width} />)}

      <g className="float">
        <g transform={`translate(${CX} ${CY})`}>
          {faces.map((f, i) => <polygon key={i} points={f.pts} fill={f.fill} stroke="#ffffff" strokeOpacity=".2" strokeWidth=".6" strokeLinejoin="round" />)}
        </g>
      </g>

      {/* front halves + travelling dots */}
      {ORBITS.map((o, i) => (
        <g key={`f${i}`} transform={`rotate(${o.tilt} ${CX} ${CY})`}>
          <path d={frontArc(o.rx, o.ry)} fill="none" stroke={o.stroke} strokeOpacity={o.opacity} strokeWidth={o.width} />
          {o.dots.map((d, j) => (
            <g key={j}>
              <circle r={d.r * 2.6} fill="url(#og-dot)" opacity=".55">
                <animateMotion dur={`${d.dur}s`} begin={`${d.begin}s`} repeatCount="indefinite" path={ellipsePath(o.rx, o.ry)} />
              </circle>
              <circle r={d.r} fill={d.fill}>
                <animateMotion dur={`${d.dur}s`} begin={`${d.begin}s`} repeatCount="indefinite" path={ellipsePath(o.rx, o.ry)} />
              </circle>
            </g>
          ))}
        </g>
      ))}

      {LABELS.map((l) => {
        const w = l.t.length * 8.6 + 22;
        return (
          <g key={l.t} className="hidden sm:inline">
            <rect x={l.x - w / 2} y={l.y - 13} width={w} height="26" rx="13" fill={l.hi ? "#1b1846" : "#0b0b0b"} stroke={l.hi ? "#635bff" : "#3a3a3a"} />
            <text x={l.x} y={l.y + 4} textAnchor="middle" fontSize="10.5" fontWeight="700" letterSpacing="1.4" fill="#fff" fontFamily="var(--font-sans)">{l.t}</text>
          </g>
        );
      })}
    </svg>
  );
}
