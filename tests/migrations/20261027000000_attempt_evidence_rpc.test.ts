import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

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
