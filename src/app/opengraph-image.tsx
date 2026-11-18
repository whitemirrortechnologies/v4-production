import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { isSupabaseConfigured } from "@/lib/env";
import { getExamInfo } from "@/lib/catalog";

export const alt = "V4: Learn. Practice. Test.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OG() {
  let label = "";
  try { if (isSupabaseConfigured) label = (await getExamInfo()).label; } catch { /* keep generic */ }
  let logo: string | null = null;
  try { logo = `data:image/png;base64,${(await readFile(path.join(process.cwd(), "public", "logo-full.png"))).toString("base64")}`; } catch { /* render without the logo */ }
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 80, background: "#0b1020", color: "#fff",
        backgroundImage: "radial-gradient(700px 320px at 75% 0%, rgba(99,91,255,0.35), transparent 70%)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {logo ? <img src={logo} alt="" height={190} width={223} /> : <div style={{ fontSize: 56, fontWeight: 800 }}>V4</div>}
          <div style={{ fontSize: 30, color: "#a5a0ff", letterSpacing: 4 }}>{label ? label.toUpperCase() : "EXAM PREPARATION"}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", fontSize: 92, fontWeight: 800, letterSpacing: -4, lineHeight: 1 }}>
          <span>Prepare with purpose.</span><span style={{ color: "#8189b3" }}>Perform with confidence.</span>
        </div>
      </div>
    ),
    size,
  );
}
