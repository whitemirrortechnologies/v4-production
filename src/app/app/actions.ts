"use server";

import { createClient } from "@/lib/supabase/server";

/** Called by the player every ~10 s. Failures are silent: never interrupt a lecture. */
export async function saveProgress(lectureId: string, positionSeconds: number, watchedDeltaSeconds: number) {
  const supabase = await createClient();
  const { data } = await supabase.rpc("save_lecture_progress", {
    p_lecture: lectureId,
    p_position_seconds: Math.max(0, Math.floor(positionSeconds)),
    p_watched_delta_seconds: Math.max(0, Math.floor(watchedDeltaSeconds)),
  });
  return (data ?? null) as { completed: boolean } | null;
}
