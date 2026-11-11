import { notFound, redirect } from "next/navigation";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ExamScreen, type Paper } from "@/components/exam-screen";

export const metadata = { title: "Test in progress" };

export default async function AttemptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireViewer(`/app/tests/attempt/${id}`);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_attempt_paper", { p_attempt: id });
  if (error || !data) notFound();
  const paper = data as Paper;
  if (paper.status !== "in_progress") redirect(`/app/tests/result/${id}`);
  // key: remount when the server moves to the next timed section.
  return <ExamScreen key={`${paper.current_section_id ?? "all"}`} paper={paper} />;
}
