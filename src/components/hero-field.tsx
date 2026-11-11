"use client";

import { useEffect, useRef } from "react";

/**
 * Full-bleed hero background: a 3D field of light points rolling toward the horizon,
 * with a spring-smoothed ripple that follows the pointer. Raw WebGL, one draw call; all
 * motion is computed in the vertex shader. Pauses off-screen / in background tabs,
 * draws a single still frame for reduced-motion users, and falls back to CSS without WebGL.
 */
const VERT = `
attribute vec2 aGrid;
uniform float uTime, uAspect, uDpr, uRipple;
uniform vec2 uMouse;
varying float vH, vFade;
void main() {
  float x = aGrid.x * 18.0;
  float z = 2.5 + aGrid.y * 34.0;
  float t = uTime;
  float y = 0.75 * sin(x * 0.30 + t * 0.55)
          + 0.60 * sin(z * 0.24 - t * 0.42)
          + 0.30 * sin((x + z) * 0.50 + t * 0.85);
  vec2 m = vec2(uMouse.x * 11.0, mix(5.0, 20.0, uMouse.y));
  float d = distance(vec2(x, z), m);
  y += uRipple * 1.15 * exp(-d * d * 0.05) * cos(d * 0.95 - t * 2.6);
  vH = y;
  vec3 p = vec3(x, y - 3.0, z);
  float f = 1.5;
  gl_Position = vec4(p.x / (p.z * uAspect) * f, p.y / p.z * f + 0.42, 0.0, 1.0);
  gl_PointSize = clamp(44.0 / p.z, 1.4, 10.0) * uDpr;
  vFade = smoothstep(36.5, 14.0, z) * (1.0 - smoothstep(0.82, 1.0, abs(aGrid.x)));
}`;
const FRAG = `
precision mediump float;
varying float vH, vFade;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float a = smoothstep(0.5, 0.05, length(c));
  vec3 indigo = vec3(0.388, 0.357, 1.0);
  vec3 white = vec3(0.93, 0.93, 1.0);
  float crest = clamp(vH * 0.45 + 0.4, 0.0, 1.0);
  vec3 col = mix(indigo, white, crest * crest);
  gl_FragColor = vec4(col, a * vFade * (0.55 + 0.45 * crest));
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

    const weak = (navigator.hardwareConcurrency ?? 8) <= 4 || ((navigator as { deviceMemory?: number }).deviceMemory ?? 8) <= 4;
    const small = matchMedia("(max-width: 768px)").matches || weak;
    const cols = small ? 110 : 220, rows = small ? 60 : 96;
    const pts = new Float32Array(cols * rows * 2);
    let k = 0;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      pts[k++] = (c / (cols - 1)) * 2 - 1;
      pts[k++] = Math.pow(r / (rows - 1), 1.35); // denser rows near the viewer
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
    const m = { x: 0.35, y: 0.45, vx: 0, vy: 0, tx: 0.35, ty: 0.45, r: 0, tr: 0 };
    const host = canvas.parentElement!;
    const onMove = (e: PointerEvent) => {
      const rc = host.getBoundingClientRect();
      m.tx = ((e.clientX - rc.left) / rc.width) * 2 - 1;
      m.ty = 1 - Math.min(1, Math.max(0, (e.clientY - rc.top) / rc.height - 0.35) / 0.65);
      m.tr = 1;
    };
    const onLeave = () => { m.tr = 0; };
    host.addEventListener("pointermove", onMove, { passive: true });
    host.addEventListener("pointerleave", onLeave, { passive: true });

    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0, visible = true, last = performance.now(), t = 4;
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
      const K = 40, C = 11;
      m.vx += (K * (m.tx - m.x) - C * m.vx) * dt; m.x += m.vx * dt;
      m.vy += (K * (m.ty - m.y) - C * m.vy) * dt; m.y += m.vy * dt;
      m.r += (m.tr - m.r) * Math.min(1, dt * 2.5);
      gl.uniform1f(uTime, t); gl.uniform2f(uMouse, m.x, m.y); gl.uniform1f(uRipple, m.r);
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
