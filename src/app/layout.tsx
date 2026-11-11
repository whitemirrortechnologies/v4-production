import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "@fontsource-variable/plus-jakarta-sans";
import "./globals.css";
import { env } from "@/lib/env";

export const metadata: Metadata = {
  title: { default: `${env.siteName} — Learn. Practice. Test.`, template: `%s · ${env.siteName}` },
  description: "Courses, topic-wise practice and full-length mock tests for GATE CS/IT and CAT.",
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#050505",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
