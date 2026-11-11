import { SiteFooter, SiteHeader } from "@/components/site-header";
import { SetupNotice } from "@/components/setup-notice";
import { isSupabaseConfigured } from "@/lib/env";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  if (!isSupabaseConfigured) return <SetupNotice />;
  return (
    <>
      <SiteHeader />
      {children}
      <SiteFooter />
    </>
  );
}
