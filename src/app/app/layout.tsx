import { requireViewer } from "@/lib/auth";
import { SiteFooter } from "@/components/site-header";
import { HideOn } from "@/components/hide-on";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireViewer("/app");
  return (
    <>
      {children}
      <HideOn paths={["/app/tests/attempt"]}><SiteFooter /></HideOn>
    </>
  );
}
