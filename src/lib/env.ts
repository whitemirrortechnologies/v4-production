export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  siteName: process.env.NEXT_PUBLIC_SITE_NAME ?? "V4",
};
export const isSupabaseConfigured = Boolean(env.supabaseUrl && env.supabaseAnonKey);
