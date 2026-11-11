import { requireViewer } from "@/lib/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireViewer("/app");
  return children;
}
