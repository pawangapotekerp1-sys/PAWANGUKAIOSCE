import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test, beforeAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { EvidenceRowSchema } from "../../supabase/functions/_shared/diagnosis-engine/validate";

const supabaseUrl = process.env.SUPABASE_URL || "http://127.0.0.1:54721";
const serviceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";
const anonKey =
  process.env.SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

const admin = createClient(supabaseUrl, serviceKey);

describe("20261027000000_attempt_evidence_rpc migration", () => {
  const sql = readFileSync(
    resolve(import.meta.dirname, "../../supabase/migrations", "20261027000000_attempt_evidence_rpc.sql"),
    "utf8"
  );

  test("defines get_attempt_evidence function with required signature", () => {
    expect(sql).toContain("create or replace function public.get_attempt_evidence");
    expect(sql).toContain("date_from date default null");
    expect(sql).toContain("date_to date default null");
    expect(sql).toContain("user_timezone text default 'UTC'");
    expect(sql).toContain("limit_attempts integer default null");
  });

  test("returns all required evidence columns for Diagnosis Engine Phase 2", () => {
    const requiredColumns = [
      "attempt_id uuid",
      "submitted_at timestamptz",
      "question_id uuid",
      "topic_id uuid",
      "topic_name text",
      "selected_option_key text",
      "correct_option_key text",
      "is_correct boolean",
      "explanation text",
      "was_ever_flagged_ragu boolean",
      "time_spent_seconds integer",
      "time_spent_z_score numeric",
      "answer_change_count integer",
      "changed_correct_to_wrong_count integer",
      "changed_wrong_to_correct_count integer",
      "session_position_ratio numeric",
      "unreleased_scheduled_attempts integer",
    ];

    for (const column of requiredColumns) {
      expect(sql).toContain(column);
    }
  });

  test("creates optimized index on attempts(user_id, submitted_at desc)", () => {
    expect(sql).toContain("create index if not exists attempts_user_id_submitted_at_idx");
    expect(sql).toContain("on public.attempts (user_id, submitted_at desc)");
    expect(sql).toContain("where status = 'submitted'");
  });

  test("enforces security definer with secure search_path = public, pg_temp", () => {
    expect(sql).toContain("security definer");
    expect(sql).toMatch(/set\s+search_path\s*=\s*public,\s*pg_temp/i);
    expect(sql).toContain("target_user_id uuid := auth.uid();");
    expect(sql).toContain("revoke all on function public.get_attempt_evidence");
    expect(sql).toContain("grant execute on function public.get_attempt_evidence(date, date, text, integer) to authenticated");
    expect(sql).toContain("grant execute on function public.get_attempt_evidence(date, date, text, integer) to service_role");
  });

  test("enforces event release gate for scheduled tryouts (timezone('utc', now()) >= ste.access_end_at)", () => {
    expect(sql).toContain("public.scheduled_tryout_attempts");
    expect(sql).toContain("public.scheduled_tryout_events");
    expect(sql).toMatch(/timezone\('utc',\s*now\(\)\)\s*>=\s*ste\.access_end_at/i);
  });
});

describe("get_attempt_evidence RPC live database contract", () => {
  let userClient: SupabaseClient;
  let userId: string;

  beforeAll(async () => {
    const email = `contract_evidence_${Date.now()}@example.com`;
    const password = "password123";

    const { data: userAuth, error: authErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (authErr) throw authErr;
    userId = userAuth.user.id;

    await admin.from("profiles").update({ role: "pro" }).eq("id", userId);

    const authClient = createClient(supabaseUrl, anonKey);
    const { data: signIn, error: signInErr } = await authClient.auth.signInWithPassword({
      email,
      password,
    });
    if (signInErr) throw signInErr;

    userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${signIn.session.access_token}` } },
    });
  });

  test("anon role is denied execution privilege", async () => {
    const anonClient = createClient(supabaseUrl, anonKey);
    const { data, error } = await anonClient.rpc("get_attempt_evidence", { limit_attempts: 10 });
    expect(error).not.toBeNull();
    expect(error?.code).toBe("42501"); // permission denied
  });

  test("authenticated user with 0 attempts returns empty array without throwing", async () => {
    const { data, error } = await userClient.rpc("get_attempt_evidence", { limit_attempts: 10 });
    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
    expect(data?.length).toBe(0);
  });

  test("live RPC return structure strictly satisfies EvidenceRowSchema contract", async () => {
    // Insert a minimal regular tryout attempt with metrics for this user
    const { data: topic } = await admin.from("topics").select("id, name").limit(1).single();
    const { data: question } = await admin.from("questions").select("id").limit(1).single();

    if (topic && question) {
      const { data: attempt, error: attErr } = await admin
        .from("attempts")
        .insert({
          user_id: userId,
          status: "submitted",
          submitted_at: new Date().toISOString(),
          score: 100,
          total_correct: 1,
          total_incorrect: 0,
          total_unanswered: 0,
        })
        .select("id, submitted_at")
        .single();

      if (!attErr && attempt) {
        const { data: item } = await admin
          .from("attempt_items")
          .insert({
            attempt_id: attempt.id,
            question_id: question.id,
            user_answer: "A",
            is_correct: true,
            is_doubtful: false,
            time_spent_seconds: 45,
            sort_order: 1,
          })
          .select("id")
          .single();

        if (item) {
          await admin.from("attempt_metrics").insert({
            attempt_item_id: item.id,
            was_ever_flagged_ragu: false,
            answer_change_count: 0,
            changed_correct_to_wrong_count: 0,
            changed_wrong_to_correct_count: 0,
          });
        }

        // Call RPC as user
        const { data, error } = await userClient.rpc("get_attempt_evidence", { limit_attempts: 10 });
        expect(error).toBeNull();
        expect(data).toBeDefined();
        expect(data.length).toBeGreaterThan(0);

        // Strictly validate contract against Zod schema
        for (const row of data) {
          const parsed = EvidenceRowSchema.safeParse(row);
          if (!parsed.success) {
            console.error("Zod Schema Validation Failure:", parsed.error.issues);
          }
          expect(parsed.success).toBe(true);
        }
      }
    }
  });
});
