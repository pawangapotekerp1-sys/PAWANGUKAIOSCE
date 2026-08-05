export type EdgeEnv = {
  supabaseUrl: string;
  supabasePublishableKey: string;
  supabaseServiceRoleKey: string;
  geminiBaseUrl: string;
};

function requireEnv(name: string): string {
  const value = Deno.env.get(name);

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function readEdgeEnv(): EdgeEnv {
  return {
    supabaseUrl: requireEnv("SUPABASE_URL"),
    supabasePublishableKey:
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY")
      ?? Deno.env.get("SUPABASE_ANON_KEY")
      ?? requireEnv("SB_PUBLISHABLE_KEY"),
    supabaseServiceRoleKey: requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    geminiBaseUrl: Deno.env.get("GEMINI_BASE_URL") ?? "https://generativelanguage.googleapis.com/v1beta",
  };
}
