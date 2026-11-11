import "server-only";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import { fetchWithTimeout } from "@/lib/supabase/fetch";

/** Cookie-less anon client for data that is identical for every visitor (the public catalog).
 *  Safe to cache across users because it carries no session. RLS still applies (anon role). */
export function createPublicClient() {
  return createClient(env.supabaseUrl, env.supabaseAnonKey, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: fetchWithTimeout() } });
}
