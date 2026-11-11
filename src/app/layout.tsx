import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "@fontsource-variable/plus-jakarta-sans";
import "./globals.css";
import { env } from "@/lib/env";
import { Toaster } from "@/components/toaster";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  openGraph: { type: "website", siteName: env.siteName },
  twitter: { card: "summary_large_image" },
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
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
