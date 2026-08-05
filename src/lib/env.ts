import { z } from "zod";

const supabaseUrlSchema = z.string().url();

const supabaseEnvSchema = z
  .object({
    VITE_SUPABASE_URL: z.string().optional(),
    VITE_SUPABASE_ANON_KEY: z.string().optional(),
  })
  .superRefine((value, context) => {
    const supabaseUrl = value.VITE_SUPABASE_URL?.trim();
    const supabaseAnonKey = value.VITE_SUPABASE_ANON_KEY?.trim();

    if (!supabaseUrl) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["VITE_SUPABASE_URL"],
        message: "VITE_SUPABASE_URL is required.",
      });
    } else if (!supabaseUrlSchema.safeParse(supabaseUrl).success) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["VITE_SUPABASE_URL"],
        message: "VITE_SUPABASE_URL must be a valid URL.",
      });
    }

    if (!supabaseAnonKey) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["VITE_SUPABASE_ANON_KEY"],
        message: "VITE_SUPABASE_ANON_KEY is required.",
      });
    }
  })
  .transform((value) => ({
    VITE_SUPABASE_URL: value.VITE_SUPABASE_URL!.trim(),
    VITE_SUPABASE_ANON_KEY: value.VITE_SUPABASE_ANON_KEY!.trim(),
  }));

export type SupabaseEnv = z.infer<typeof supabaseEnvSchema>;

export function readEnv(
  source: Record<string, unknown> = import.meta.env as Record<string, unknown>,
): SupabaseEnv {
  const result = supabaseEnvSchema.safeParse(source);

  if (result.success) {
    return result.data;
  }

  const details = result.error.issues
    .map((issue) => `- ${issue.path.join(".")}: ${issue.message}`)
    .join("\n");

  throw new Error(`Supabase environment configuration is invalid.\n${details}`);
}
