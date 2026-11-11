import { ImageResponse } from "next/og";

export const alt = "V4: Learn. Practice. Test. For GATE CS/IT and CAT.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OG() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 80, background: "#050505", color: "#fff",
        backgroundImage: "radial-gradient(700px 320px at 75% 0%, rgba(99,91,255,0.35), transparent 70%)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 64, height: 64, borderRadius: 14, background: "#fff", color: "#050505", fontSize: 28, fontWeight: 800 }}>V4</div>
          <div style={{ fontSize: 30, color: "#a5a0ff", letterSpacing: 4 }}>GATE CS/IT · CAT</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", fontSize: 92, fontWeight: 800, letterSpacing: -4, lineHeight: 1 }}>
          <span>Prepare with purpose.</span><span style={{ color: "#6b6b6b" }}>Perform with confidence.</span>
        </div>
      </div>
    ),
    size,
  );
}
