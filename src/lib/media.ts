import { env } from "@/lib/env";

/** Public URL of an image in the (public) `thumbnails` bucket. */
export const thumbnailUrl = (path: string | null | undefined) =>
  path ? `${env.supabaseUrl}/storage/v1/object/public/thumbnails/${path}` : null;
