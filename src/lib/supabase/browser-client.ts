import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readEnv, type SupabaseEnv } from "../env";

let browserClient: SupabaseClient | undefined;

export function createSupabaseBrowserClient(
  env: SupabaseEnv = readEnv(),
): SupabaseClient {
  return createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  });
}

export function getSupabaseBrowserClient(): SupabaseClient {
  if (!browserClient) {
    browserClient = createSupabaseBrowserClient();
  }

  return browserClient;
}
