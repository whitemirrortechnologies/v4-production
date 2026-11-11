"use client";

import { useEffect, useRef } from "react";

/**
 * Full-bleed hero background: a 3D field of light points rolling toward the horizon,
 * with a spring-smoothed ripple that follows the pointer. Raw WebGL, one draw call; all
 * motion is computed in the vertex shader. Pauses off-screen / in background tabs,
 * draws a single still frame for reduced-motion users, and falls back to CSS without WebGL.
 */
const VERT = `
attribute vec2 aGrid;              // x: -1..1 across the screen, y: 0 (under the camera) .. 1 (horizon)
uniform float uTime, uAspect, uDpr, uRipple;
uniform vec2 uMouse;               // x: -1..1, y: 0 (bottom of hero) .. 1 (horizon)
varying float vH, vFade;
const float ZN = 0.7, ZF = 38.0, F = 1.5, CAM = 3.0, HORIZON = 0.42;
void main() {
  // Rows evenly spaced on screen (linear in 1/z) so the near field stays dense.
  float z = 1.0 / mix(1.0 / ZN, 1.0 / ZF, aGrid.y);
  // Each row is wider than the view at its depth, so the mesh always reaches both edges.
  float x = aGrid.x * (z * uAspect / F * 1.12 + 1.0);
  float t = uTime;
  // Waves calm down right in front of the camera so they never lift off the bottom edge.
  float amp = 0.6 + 0.4 * smoothstep(1.0, 8.0, z);
  float y = amp * (0.80 * sin(x * 0.30 + t * 0.55)
                 + 0.62 * sin(z * 0.24 - t * 0.42)
                 + 0.30 * sin((x + z) * 0.50 + t * 0.85));
  vec2 g = vec2(aGrid.x * uAspect, aGrid.y * 1.5);
  vec2 m = vec2(uMouse.x * uAspect, uMouse.y * 1.5);
  float d = distance(g, m) * 8.0;
  y += uRipple * max(amp, 0.45) * 1.35 * exp(-d * d * 0.06) * cos(d * 1.1 - t * 3.2);
  vH = y;
  vec3 p = vec3(x, y - CAM, z);
  gl_Position = vec4(p.x / (p.z * uAspect) * F, p.y / p.z * F + HORIZON, 0.0, 1.0);
  gl_PointSize = clamp(40.0 / p.z, 1.5, 6.0) * uDpr;
  vFade = smoothstep(ZF, 16.0, z);
}`;
const FRAG = `
precision mediump float;
varying float vH, vFade;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float a = smoothstep(0.5, 0.05, length(c));
  vec3 indigo = vec3(0.388, 0.357, 1.0);
  vec3 white = vec3(0.93, 0.93, 1.0);
  float crest = clamp(vH * 0.42 + 0.5, 0.0, 1.0);
  vec3 col = mix(indigo, white, crest * crest);
  gl_FragColor = vec4(col, a * vFade * (0.7 + 0.3 * crest));
}`;

export function HeroField({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current!;
    const gl = canvas.getContext("webgl", { antialias: false, alpha: true, premultipliedAlpha: false, powerPreference: "low-power" });
    if (!gl) { canvas.dataset.fallback = "1"; return; }

    const sh = (type: number, src: string) => { const s = gl.createShader(type)!; gl.shaderSource(s, src); gl.compileShader(s); return s; };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { canvas.dataset.fallback = "1"; return; }
    gl.useProgram(prog);

    const small = matchMedia("(max-width: 768px)").matches;
    const cols = small ? 120 : 240, rows = small ? 90 : 140;
    const pts = new Float32Array(cols * rows * 2);
    let k = 0;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      pts[k++] = (c / (cols - 1)) * 2 - 1;
      pts[k++] = r / (rows - 1);
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, pts, gl.STATIC_DRAW);
    const aGrid = gl.getAttribLocation(prog, "aGrid");
    gl.enableVertexAttribArray(aGrid);
    gl.vertexAttribPointer(aGrid, 2, gl.FLOAT, false, 0, 0);
    const U = (n: string) => gl.getUniformLocation(prog, n);
    const uTime = U("uTime"), uAspect = U("uAspect"), uDpr = U("uDpr"), uMouse = U("uMouse"), uRipple = U("uRipple");
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    gl.clearColor(0, 0, 0, 0);

    const dpr = Math.min(1.5, devicePixelRatio || 1);
    const resize = () => {
      const { width, height } = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.round(width * dpr)); canvas.height = Math.max(1, Math.round(height * dpr));
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform1f(uAspect, width / Math.max(1, height));
      gl.uniform1f(uDpr, dpr);
    };
    resize();
    const ro = new ResizeObserver(resize); ro.observe(canvas);

    // Pointer target → spring-smoothed position (stiffness/damping), ripple strength eases in/out.
    const m = { x: 0.35, y: 0.35, vx: 0, vy: 0, tx: 0.35, ty: 0.35, r: 0, tr: 0, boost: 0, px: -1, py: -1, pt: 0 };
    const host = canvas.parentElement!;
    const onMove = (e: PointerEvent) => {
      const rc = host.getBoundingClientRect();
      // Faster pointer movement pushes a stronger wave (decays within a fraction of a second).
      const now = performance.now();
      if (m.px >= 0) {
        const v = Math.hypot(e.clientX - m.px, e.clientY - m.py) / Math.max(8, now - m.pt); // px per ms
        m.boost = Math.min(1.2, Math.max(m.boost, v * 0.6));
      }
      m.px = e.clientX; m.py = e.clientY; m.pt = now;
      m.tx = ((e.clientX - rc.left) / rc.width) * 2 - 1;
      m.ty = Math.min(1, Math.max(0, (1 - (e.clientY - rc.top) / rc.height) / 0.71));
      m.tr = 1;
    };
    const onLeave = () => { m.tr = 0; m.px = -1; };
    host.addEventListener("pointermove", onMove, { passive: true });
    host.addEventListener("pointerleave", onLeave, { passive: true });

    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0, visible = true, last = performance.now(), t = 4;
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
      // Stiff, critically damped spring (ω = 32 rad/s): reaches the pointer in ~0.15 s, no overshoot.
      // Integrated in fixed 1/240 s sub-steps so it stays stable even when frames drop.
      const K = 1024, C = 2 * Math.sqrt(K);
      for (let n = Math.ceil(dt * 240), h = dt / Math.max(1, n); n > 0; n--) {
        m.vx += (K * (m.tx - m.x) - C * m.vx) * h; m.x += m.vx * h;
        m.vy += (K * (m.ty - m.y) - C * m.vy) * h; m.y += m.vy * h;
      }
      // Ripple appears in ~0.1 s and fades in ~0.25 s; speed boost decays fast.
      m.r += (m.tr - m.r) * Math.min(1, dt * (m.tr > m.r ? 14 : 6));
      m.boost *= Math.exp(-dt * 4);
      gl.uniform1f(uTime, t); gl.uniform2f(uMouse, m.x, m.y); gl.uniform1f(uRipple, m.r * (1 + m.boost));
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.POINTS, 0, cols * rows);
      if (!still && visible && !document.hidden) raf = requestAnimationFrame(frame); else raf = 0;
    };
    const kick = () => { if (!raf && !still && visible && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(frame); } };
    frame(performance.now());
    canvas.dataset.ready = "1";

    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; kick(); });
    io.observe(canvas);
    const onVis = () => kick();
    document.addEventListener("visibilitychange", onVis);

    return () => {
      cancelAnimationFrame(raf); ro.disconnect(); io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      host.removeEventListener("pointermove", onMove); host.removeEventListener("pointerleave", onLeave);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, []);

  return (
    <canvas ref={ref} aria-hidden
      className={`absolute inset-0 size-full opacity-0 transition-opacity duration-1000 data-[ready]:opacity-100 data-[fallback]:hidden ${className ?? ""}`} />
  );
}
